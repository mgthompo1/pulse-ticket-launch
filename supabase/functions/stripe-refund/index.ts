import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== STRIPE REFUND HANDLER ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, refundAmount, reason } = await req.json();
    console.log("Processing refund for order:", orderId, "amount:", refundAmount, "reason:", reason);

    if (!orderId) {
      throw new Error("Missing orderId parameter");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Get order details including event and organization info
    console.log("Fetching order details...");
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        events!inner (
          organization_id,
          name
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message || 'No order data'}`);
    }

    if (!order.stripe_session_id) {
      throw new Error("This order was not processed through Stripe");
    }

    if (order.status === 'refunded') {
      throw new Error("This order has already been refunded");
    }

    console.log("Order found:", order.id, "for event:", order.events.name);

    // Check if this organization uses Stripe Connect
    const { data: orgData, error: orgError } = await supabaseClient
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", order.events.organization_id)
      .single();

    const usesStripeConnect = !!(orgData?.stripe_account_id);
    console.log("Organization uses Stripe Connect:", usesStripeConnect);

    let stripeSecretKey: string;

    if (usesStripeConnect) {
      // For Stripe Connect payments, we need to use the PLATFORM's secret key
      // because destination charges are created on the platform account
      const platformKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!platformKey) {
        throw new Error("Platform Stripe secret key not configured");
      }
      stripeSecretKey = platformKey;
      console.log("Using PLATFORM Stripe key for Connect refund");
    } else {
      // For direct API payments, use the organization's credentials
      console.log("Getting organization Stripe credentials...");
      const { data: credentials, error: credError } = await supabaseClient
        .from("payment_credentials")
        .select("stripe_secret_key")
        .eq("organization_id", order.events.organization_id)
        .single();

      if (credError || !credentials?.stripe_secret_key) {
        throw new Error("Stripe credentials not found for this organization");
      }
      stripeSecretKey = credentials.stripe_secret_key;
      console.log("Using ORGANIZATION Stripe key for direct refund");
    }

    // Initialize Stripe with the appropriate credentials
    console.log("Initializing Stripe...");
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Extract payment intent ID from stripe_session_id
    let paymentIntentId = order.stripe_session_id;
    if (paymentIntentId.includes('_secret_')) {
      paymentIntentId = paymentIntentId.split('_secret_')[0];
    }

    console.log("Processing refund for payment intent:", paymentIntentId);

    // Calculate refund amount (default to full amount if not specified)
    const refundAmountInCents = refundAmount 
      ? Math.round(refundAmount * 100) 
      : Math.round(order.total_amount * 100);

    // Create the refund
    console.log("Creating Stripe refund...");

    // Build refund params
    const refundParams: any = {
      payment_intent: paymentIntentId,
      amount: refundAmountInCents,
      reason: reason || 'requested_by_customer',
      metadata: {
        orderId: orderId,
        eventName: order.events.name,
        originalAmount: order.total_amount.toString(),
      }
    };

    // For Stripe Connect payments, keep the platform fee (TFLO revenue)
    // Try to reverse the transfer so the connected account pays for the refund
    // If they have insufficient balance, process refund anyway and track the debt
    if (usesStripeConnect) {
      refundParams.refund_application_fee = false; // Keep TFLO's platform fee
      refundParams.reverse_transfer = true; // Try to deduct from connected account's balance
      console.log("Connect refund: keeping platform fee, attempting transfer reversal");
    }

    let refund;
    try {
      refund = await stripe.refunds.create(refundParams);
    } catch (refundError: any) {
      // If insufficient balance, retry without reversing transfer
      // The platform covers it and can recover from future payouts
      const errorMsg = refundError.message?.toLowerCase() || '';
      const isInsufficientBalance = errorMsg.includes('insufficient funds') ||
                                     errorMsg.includes('sufficient funds') ||
                                     errorMsg.includes('reverse this amount');

      if (isInsufficientBalance && usesStripeConnect) {
        console.log("Connected account has insufficient balance, processing refund without immediate transfer reversal");
        refundParams.reverse_transfer = false;
        refund = await stripe.refunds.create(refundParams);

        // Log this for tracking - platform needs to recover this amount later
        console.log("WARNING: Refund processed without transfer reversal. Platform covered the refund.");
        console.log("Connected account owes:", refundAmountInCents / 100, order.currency || 'USD');

        // Track the debt in audit log
        try {
          await supabaseClient
            .from("security_audit_log")
            .insert({
              event_type: "platform_covered_refund",
              event_data: {
                orderId: orderId,
                refundId: refund.id,
                amountOwed: refundAmountInCents / 100,
                connectedAccountId: orgData?.stripe_account_id,
                organizationId: order.events.organization_id,
                reason: "insufficient_connected_account_balance"
              }
            });
        } catch (logErr) {
          console.error("Failed to log platform-covered refund:", logErr);
        }
      } else {
        throw refundError;
      }
    }

    console.log("Stripe refund created:", refund.id, "status:", refund.status);

    // Update order status to refunded
    console.log("Updating order status...");
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({ 
        status: "refunded",
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order status:", updateError);
      // Don't throw error since refund was successful in Stripe
    }

    // Create a refund audit log entry
    try {
      await supabaseClient
        .from("security_audit_log")
        .insert({
          event_type: "payment_refunded",
          event_data: {
            orderId: orderId,
            refundId: refund.id,
            refundAmount: refundAmount || order.total_amount,
            originalAmount: order.total_amount,
            reason: reason || 'requested_by_customer',
            stripePaymentIntentId: paymentIntentId
          }
        });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Don't fail the refund for audit issues
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Refund processed successfully",
      refundId: refund.id,
      refundAmount: refundAmountInCents / 100,
      status: refund.status,
      orderId: orderId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Refund error:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});