import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== STRIPE ATTRACTION REFUND HANDLER ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, refundAmount, reason } = await req.json();
    console.log("Processing refund for attraction booking:", bookingId, "amount:", refundAmount, "reason:", reason);

    if (!bookingId) {
      throw new Error("Missing bookingId parameter");
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

    // Get booking details including attraction and organization info
    console.log("Fetching booking details...");
    const { data: booking, error: bookingError } = await supabaseClient
      .from("attraction_bookings")
      .select(`
        *,
        attractions!inner (
          organization_id,
          name
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message || 'No booking data'}`);
    }

    if (!booking.stripe_payment_intent_id) {
      throw new Error("This booking was not processed through Stripe");
    }

    if (booking.refund_status === 'full') {
      throw new Error("This booking has already been fully refunded");
    }

    console.log("Booking found:", booking.id, "for attraction:", booking.attractions.name);

    // Check if this organization uses Stripe Connect
    const { data: orgData, error: orgError } = await supabaseClient
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", booking.attractions.organization_id)
      .single();

    const usesStripeConnect = !!(orgData?.stripe_account_id);
    console.log("Organization uses Stripe Connect:", usesStripeConnect);

    let stripeSecretKey: string;

    if (usesStripeConnect) {
      // For Stripe Connect payments, use PLATFORM's secret key
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
        .eq("organization_id", booking.attractions.organization_id)
        .single();

      if (credError || !credentials?.stripe_secret_key) {
        throw new Error("Stripe credentials not found for this organization");
      }
      stripeSecretKey = credentials.stripe_secret_key;
      console.log("Using ORGANIZATION Stripe key for direct refund");
    }

    // Initialize Stripe
    console.log("Initializing Stripe...");
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Extract payment intent ID
    let paymentIntentId = booking.stripe_payment_intent_id;
    if (paymentIntentId.includes('_secret_')) {
      paymentIntentId = paymentIntentId.split('_secret_')[0];
    }

    console.log("Processing refund for payment intent:", paymentIntentId);

    // Calculate refund amount
    const maxRefundable = booking.total_amount - (booking.refund_amount || 0);
    const requestedRefund = refundAmount || booking.total_amount;
    const actualRefundAmount = Math.min(requestedRefund, maxRefundable);
    const refundAmountInCents = Math.round(actualRefundAmount * 100);

    if (refundAmountInCents <= 0) {
      throw new Error("No refundable amount remaining");
    }

    // Determine if this is a full or partial refund
    const isFullRefund = actualRefundAmount >= booking.total_amount - (booking.refund_amount || 0);

    // Create the refund
    console.log("Creating Stripe refund...");

    const refundParams: any = {
      payment_intent: paymentIntentId,
      amount: refundAmountInCents,
      reason: reason || 'requested_by_customer',
      metadata: {
        bookingId: bookingId,
        attractionName: booking.attractions.name,
        originalAmount: booking.total_amount.toString(),
        bookingReference: booking.booking_reference,
      }
    };

    // For Stripe Connect payments
    if (usesStripeConnect) {
      refundParams.refund_application_fee = false;
      refundParams.reverse_transfer = true;
      console.log("Connect refund: keeping platform fee, attempting transfer reversal");
    }

    let refund;
    try {
      refund = await stripe.refunds.create(refundParams);
    } catch (refundError: any) {
      const errorMsg = refundError.message?.toLowerCase() || '';
      const isInsufficientBalance = errorMsg.includes('insufficient funds') ||
                                     errorMsg.includes('sufficient funds') ||
                                     errorMsg.includes('reverse this amount');

      if (isInsufficientBalance && usesStripeConnect) {
        console.log("Connected account has insufficient balance, processing without transfer reversal");
        refundParams.reverse_transfer = false;
        refund = await stripe.refunds.create(refundParams);

        // Log the debt
        try {
          await supabaseClient
            .from("security_audit_log")
            .insert({
              event_type: "platform_covered_attraction_refund",
              event_data: {
                bookingId: bookingId,
                refundId: refund.id,
                amountOwed: actualRefundAmount,
                connectedAccountId: orgData?.stripe_account_id,
                organizationId: booking.attractions.organization_id,
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

    // Update booking with refund info
    console.log("Updating booking status...");
    const newRefundTotal = (booking.refund_amount || 0) + actualRefundAmount;
    const { error: updateError } = await supabaseClient
      .from("attraction_bookings")
      .update({
        refund_status: isFullRefund ? 'full' : 'partial',
        refund_amount: newRefundTotal,
        refund_reason: reason || 'requested_by_customer',
        refunded_at: new Date().toISOString(),
        booking_status: isFullRefund ? 'cancelled' : booking.booking_status,
        payment_status: isFullRefund ? 'refunded' : 'partial_refund',
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking status:", updateError);
    }

    // If full refund, release the slot capacity
    if (isFullRefund && booking.booking_slot_id) {
      const { error: slotError } = await supabaseClient
        .from("booking_slots")
        .update({
          current_bookings: supabaseClient.rpc('greatest', { a: 0, b: 'current_bookings - ' + booking.party_size })
        })
        .eq("id", booking.booking_slot_id);

      // Try RPC first, fallback to manual update
      const { error: rpcError } = await supabaseClient.rpc('decrement_slot_bookings', {
        p_slot_id: booking.booking_slot_id,
        p_amount: booking.party_size
      });

      if (rpcError) {
        // If RPC doesn't exist, do it manually
        const { data } = await supabaseClient
          .from("booking_slots")
          .select("current_bookings")
          .eq("id", booking.booking_slot_id)
          .single();

        if (data) {
          await supabaseClient
            .from("booking_slots")
            .update({ current_bookings: Math.max(0, data.current_bookings - booking.party_size) })
            .eq("id", booking.booking_slot_id);
        }
      }
    }

    // Create audit log entry
    try {
      await supabaseClient
        .from("security_audit_log")
        .insert({
          event_type: "attraction_booking_refunded",
          event_data: {
            bookingId: bookingId,
            refundId: refund.id,
            refundAmount: actualRefundAmount,
            originalAmount: booking.total_amount,
            reason: reason || 'requested_by_customer',
            isFullRefund,
            stripePaymentIntentId: paymentIntentId,
            bookingReference: booking.booking_reference
          }
        });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: isFullRefund ? "Full refund processed successfully" : "Partial refund processed successfully",
      refundId: refund.id,
      refundAmount: actualRefundAmount,
      status: refund.status,
      bookingId: bookingId,
      isFullRefund
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
