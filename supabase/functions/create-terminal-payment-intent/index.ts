import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default platform fee percentage (2.5%)
const DEFAULT_PLATFORM_FEE_PERCENT = 2.5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      amount,
      currency = "nzd",
      description,
      organization_id,
      event_id,
      metadata = {},
    } = await req.json();

    console.log("=== CREATE TERMINAL PAYMENT INTENT ===");
    console.log("Amount:", amount, "cents");
    console.log("Currency:", currency);
    console.log("Organization ID:", organization_id);
    console.log("Event ID:", event_id);

    if (!amount || amount <= 0) {
      throw new Error("Valid amount is required");
    }

    if (!organization_id) {
      throw new Error("organization_id is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get organization info including Stripe Connect details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select(`
        id,
        name,
        currency,
        stripe_account_id,
        stripe_test_mode,
        stripe_booking_fee_enabled,
        credit_card_processing_fee_percentage
      `)
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      console.error("Organization error:", orgError);
      throw new Error("Organization not found");
    }

    console.log("=== ORGANIZATION ===");
    console.log("Name:", org.name);
    console.log("Has Stripe Connect:", org.stripe_account_id ? "YES" : "NO");
    console.log("Test mode:", org.stripe_test_mode ? "YES" : "NO");
    console.log("Booking fees enabled:", org.stripe_booking_fee_enabled ? "YES" : "NO");

    // Determine which Stripe key and mode to use
    const isTestMode = org.stripe_test_mode === true;
    const hasStripeConnect = !!org.stripe_account_id;

    let stripeSecretKey: string;
    let useConnectPayment = false;
    let stripeAccountId: string | null = null;

    if (hasStripeConnect && !isTestMode) {
      // Use Stripe Connect with destination charges
      const platformKey = Deno.env.get("STRIPE_SECRET_KEY_LIVE") || Deno.env.get("STRIPE_SECRET_KEY");
      if (!platformKey) {
        throw new Error("Platform Stripe key not configured");
      }
      stripeSecretKey = platformKey;
      stripeAccountId = org.stripe_account_id;
      useConnectPayment = true;
      console.log("🔗 Using Stripe Connect (Destination Charges)");
      console.log("Connected account:", stripeAccountId);
    } else if (isTestMode) {
      // Test mode - use platform test key
      const testKey = Deno.env.get("STRIPE_SECRET_KEY_TEST");
      if (testKey) {
        stripeSecretKey = testKey;
        console.log("🧪 Using Platform Stripe TEST key");
      } else {
        // Fall back to regular key
        stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
        console.log("⚠️ Test mode but no TEST key, using regular key");
      }
    } else {
      // No Connect - use organization's direct API key
      const { data: paymentConfig, error: paymentError } = await supabase
        .from("organization_payment_configs")
        .select("stripe_secret_key")
        .eq("organization_id", organization_id)
        .single();

      if (paymentError || !paymentConfig?.stripe_secret_key) {
        // Try payment_terminal_settings table
        const { data: terminalSettings, error: terminalError } = await supabase
          .from("payment_terminal_settings")
          .select("stripe_secret_key")
          .eq("organization_id", organization_id)
          .single();

        if (terminalError || !terminalSettings?.stripe_secret_key) {
          throw new Error("No Stripe configuration found. Please connect Stripe or add API keys.");
        }
        stripeSecretKey = terminalSettings.stripe_secret_key;
      } else {
        stripeSecretKey = paymentConfig.stripe_secret_key;
      }
      console.log("🔑 Using organization's direct Stripe API key");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Build payment intent parameters
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amount, // Amount already in cents from iOS
      currency: currency.toLowerCase(),
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      description: description || "TicketFlo POS Sale",
      metadata: {
        ...metadata,
        organization_id,
        event_id: event_id || null,
        source: "tap_to_pay_iphone",
        processed_at: new Date().toISOString(),
      },
    };

    // Add Stripe Connect parameters if using Connect
    if (useConnectPayment && stripeAccountId) {
      // Calculate platform fee
      // Use organization's fee percentage if set, otherwise use default
      const feePercent = org.credit_card_processing_fee_percentage || DEFAULT_PLATFORM_FEE_PERCENT;
      const platformFeeAmount = Math.round(amount * (feePercent / 100));

      console.log("=== STRIPE CONNECT DESTINATION CHARGE ===");
      console.log("Total amount:", amount, "cents");
      console.log("Platform fee percent:", feePercent, "%");
      console.log("Platform fee amount:", platformFeeAmount, "cents");
      console.log("Organization receives:", amount - platformFeeAmount, "cents (minus Stripe fees)");

      // Use destination charges with on_behalf_of
      paymentIntentParams.on_behalf_of = stripeAccountId;
      paymentIntentParams.transfer_data = {
        destination: stripeAccountId,
      };

      // Only add application fee if it's greater than 0
      if (platformFeeAmount > 0) {
        paymentIntentParams.application_fee_amount = platformFeeAmount;
      }

      // Add fee info to metadata for tracking
      paymentIntentParams.metadata!.platform_fee_percent = feePercent.toString();
      paymentIntentParams.metadata!.platform_fee_amount = platformFeeAmount.toString();
      paymentIntentParams.metadata!.connected_account_id = stripeAccountId;
    }

    console.log("=== CREATING PAYMENT INTENT ===");
    console.log("Params:", JSON.stringify(paymentIntentParams, null, 2));

    // Create the payment intent
    // For Connect, we need to use the Stripe-Account header for Terminal operations
    let paymentIntent: Stripe.PaymentIntent;

    if (useConnectPayment && stripeAccountId) {
      // For Terminal with Connect, create on the connected account
      // This is required because Locations belong to the connected account
      paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, {
        stripeAccount: stripeAccountId,
      });
    } else {
      paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    }

    console.log("✅ Payment intent created:", paymentIntent.id);
    console.log("Status:", paymentIntent.status);

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        // Include Connect info for debugging
        mode: useConnectPayment ? "connect" : "direct",
        platform_fee: useConnectPayment
          ? Math.round(amount * ((org.credit_card_processing_fee_percentage || DEFAULT_PLATFORM_FEE_PERCENT) / 100))
          : 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Payment intent creation error:", error);
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    if (error.code) console.error("Error code:", error.code);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: error.code || "UNKNOWN",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
