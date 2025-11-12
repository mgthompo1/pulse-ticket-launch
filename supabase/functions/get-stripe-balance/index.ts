import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId } = await req.json();

    if (!organizationId) {
      throw new Error("organizationId is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get organization's Stripe account ID
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("stripe_account_id, currency")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      throw new Error("Organization not found");
    }

    if (!org.stripe_account_id) {
      return new Response(
        JSON.stringify({
          balance: {
            available: 0,
            pending: 0,
            total: 0,
          },
          fees: {
            stripe_fees: 0,
            platform_fees: 0,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Initialize Stripe with platform secret key
    const stripeSecretKey = Deno.env.get("STRIPE_PLATFORM_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_PLATFORM_SECRET_KEY or STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Fetch balance from connected account
    const balance = await stripe.balance.retrieve({
      stripeAccount: org.stripe_account_id,
    });

    // Calculate total available and pending
    let totalAvailable = 0;
    let totalPending = 0;

    // Sum up all currencies (convert to cents)
    for (const availableBalance of balance.available) {
      totalAvailable += availableBalance.amount;
    }

    for (const pendingBalance of balance.pending) {
      totalPending += pendingBalance.amount;
    }

    // Fetch all balance transactions to calculate fees
    // This gives us a complete picture of Stripe fees and application fees
    const balanceTransactions = await stripe.balanceTransactions.list(
      {
        limit: 100,
      },
      {
        stripeAccount: org.stripe_account_id,
      }
    );

    let totalStripeFees = 0;
    let totalPlatformFees = 0;

    for (const txn of balanceTransactions.data) {
      // Sum up Stripe processing fees
      if (txn.fee_details) {
        for (const feeDetail of txn.fee_details) {
          if (feeDetail.type === "stripe_fee") {
            totalStripeFees += feeDetail.amount;
          }
        }
      }
    }

    // Fetch charges from the connected account and sum application fees
    // This is more reliable than querying application fees from the platform
    const charges = await stripe.charges.list(
      {
        limit: 100,
      },
      {
        stripeAccount: org.stripe_account_id,
      }
    );

    console.log(`Found ${charges.data.length} charges on connected account`);

    for (const charge of charges.data) {
      if (charge.application_fee_amount && charge.application_fee_amount > 0) {
        totalPlatformFees += charge.application_fee_amount;
        console.log(`✅ Charge ${charge.id} has application fee: ${charge.application_fee_amount} ${charge.currency}`);
      }
    }

    console.log(`Total platform fees collected: ${totalPlatformFees / 100}`);

    return new Response(
      JSON.stringify({
        balance: {
          available: totalAvailable / 100, // Convert cents to dollars
          pending: totalPending / 100,
          total: (totalAvailable + totalPending) / 100,
          currency: org.currency || "USD",
        },
        fees: {
          stripe_fees: totalStripeFees / 100,
          platform_fees: totalPlatformFees / 100,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Get Stripe balance error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
