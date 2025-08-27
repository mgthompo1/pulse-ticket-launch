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

    // Get Stripe credentials for this organization
    console.log("Getting Stripe credentials...");
    const { data: credentials, error: credError } = await supabaseClient
      .from("payment_credentials")
      .select("stripe_secret_key")
      .eq("organization_id", order.events.organization_id)
      .single();

    if (credError || !credentials?.stripe_secret_key) {
      throw new Error("Stripe credentials not found for this organization");
    }

    // Initialize Stripe with organization's credentials
    console.log("Initializing Stripe...");
    const stripe = new Stripe(credentials.stripe_secret_key, {
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
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmountInCents,
      reason: reason || 'requested_by_customer',
      metadata: {
        orderId: orderId,
        eventName: order.events.name,
        originalAmount: order.total_amount.toString(),
      }
    });

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