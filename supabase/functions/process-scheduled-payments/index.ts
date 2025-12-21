import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.12.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledPayment {
  id: string;
  order_id: string;
  payment_plan_id: string;
  customer_email: string;
  amount: number;
  due_date: string;
  status: string;
  stripe_payment_method_id: string | null;
  stripe_customer_id: string | null;
  attempt_count: number;
  orders: {
    id: string;
    organization_id: string;
    organizations: {
      stripe_account_id: string;
      stripe_test_mode: boolean;
      currency: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Stripe keys
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeTestSecretKey = Deno.env.get("STRIPE_TEST_SECRET_KEY");

    if (!stripeSecretKey && !stripeTestSecretKey) {
      throw new Error("Stripe secret keys not configured");
    }

    console.log("🔄 Processing scheduled payments...");

    // Find all pending payments that are due (due_date <= now)
    const { data: duePayments, error: fetchError } = await supabase
      .from("order_payment_schedules")
      .select(`
        id,
        order_id,
        payment_plan_id,
        customer_email,
        amount,
        due_date,
        status,
        stripe_payment_method_id,
        stripe_customer_id,
        attempt_count,
        orders (
          id,
          organization_id,
          organizations (
            stripe_account_id,
            stripe_test_mode,
            currency
          )
        )
      `)
      .eq("status", "pending")
      .lte("due_date", new Date().toISOString())
      .lt("attempt_count", 3) // Max 3 attempts
      .order("due_date", { ascending: true })
      .limit(50); // Process in batches

    if (fetchError) {
      console.error("Error fetching due payments:", fetchError);
      throw fetchError;
    }

    if (!duePayments || duePayments.length === 0) {
      console.log("✅ No payments due");
      return new Response(
        JSON.stringify({ success: true, message: "No payments due", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Found ${duePayments.length} payments to process`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const payment of duePayments as unknown as ScheduledPayment[]) {
      try {
        console.log(`💳 Processing payment ${payment.id} for order ${payment.order_id}`);

        // Validate required data
        if (!payment.stripe_payment_method_id || !payment.stripe_customer_id) {
          console.log(`⚠️ Skipping payment ${payment.id}: Missing payment method or customer`);
          results.skipped++;
          continue;
        }

        const order = payment.orders;
        if (!order?.organizations?.stripe_account_id) {
          console.log(`⚠️ Skipping payment ${payment.id}: Missing Stripe account`);
          results.skipped++;
          continue;
        }

        // Get the correct Stripe key based on test mode
        const isTestMode = order.organizations.stripe_test_mode;
        const stripeKey = isTestMode ? stripeTestSecretKey : stripeSecretKey;

        if (!stripeKey) {
          console.log(`⚠️ Skipping payment ${payment.id}: No ${isTestMode ? 'test' : 'live'} Stripe key configured`);
          results.skipped++;
          continue;
        }

        const stripe = new Stripe(stripeKey, {
          apiVersion: "2023-10-16",
        });

        // Update status to processing
        await supabase
          .from("order_payment_schedules")
          .update({
            status: "processing",
            last_attempt_at: new Date().toISOString(),
            attempt_count: payment.attempt_count + 1,
          })
          .eq("id", payment.id);

        // Create a PaymentIntent for this scheduled payment
        const amountInCents = Math.round(payment.amount * 100);
        const currency = order.organizations.currency?.toLowerCase() || "usd";

        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: amountInCents,
            currency: currency,
            customer: payment.stripe_customer_id,
            payment_method: payment.stripe_payment_method_id,
            off_session: true,
            confirm: true,
            metadata: {
              order_id: payment.order_id,
              schedule_id: payment.id,
              type: "scheduled_payment",
            },
          },
          {
            stripeAccount: order.organizations.stripe_account_id,
          }
        );

        if (paymentIntent.status === "succeeded") {
          // Payment successful - update status
          await supabase
            .from("order_payment_schedules")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: paymentIntent.id,
            })
            .eq("id", payment.id);

          console.log(`✅ Payment ${payment.id} succeeded`);
          results.succeeded++;

          // Send payment confirmation email (could be a separate function)
          // For now, just log it
          console.log(`📧 Should send payment confirmation to ${payment.customer_email}`);
        } else {
          // Payment requires additional action (e.g., 3D Secure)
          // Mark as failed and customer needs to complete manually
          await supabase
            .from("order_payment_schedules")
            .update({
              status: "failed",
              failure_reason: `Payment requires additional action: ${paymentIntent.status}`,
              stripe_payment_intent_id: paymentIntent.id,
              next_retry_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Retry in 24 hours
            })
            .eq("id", payment.id);

          console.log(`⚠️ Payment ${payment.id} requires action: ${paymentIntent.status}`);
          results.failed++;
        }

        results.processed++;
      } catch (error: any) {
        console.error(`❌ Error processing payment ${payment.id}:`, error);

        // Handle Stripe errors
        let failureReason = error.message || "Unknown error";

        if (error.type === "StripeCardError") {
          failureReason = `Card declined: ${error.decline_code || error.message}`;
        } else if (error.type === "StripeInvalidRequestError") {
          failureReason = `Invalid request: ${error.message}`;
        }

        // Update payment status
        await supabase
          .from("order_payment_schedules")
          .update({
            status: "failed",
            failure_reason: failureReason,
            next_retry_at: payment.attempt_count < 2
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Retry in 24 hours
              : null, // No more retries
          })
          .eq("id", payment.id);

        results.failed++;
        results.errors.push(`Payment ${payment.id}: ${failureReason}`);
      }
    }

    console.log(`🏁 Processing complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-scheduled-payments:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
