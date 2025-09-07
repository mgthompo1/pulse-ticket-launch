import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { orderId } = await req.json();
    
    console.log(`🔍 Debugging order: ${orderId}`);

    // Get basic order info
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError) {
      return new Response(JSON.stringify({
        error: "Order not found",
        details: orderError
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log("✅ Order found:", order.id);

    // Check event
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("*")
      .eq("id", order.event_id)
      .single();

    // Check organization
    let organization = null;
    let orgError = null;
    if (event) {
      const { data: org, error: orgErr } = await supabaseClient
        .from("organizations")
        .select("*")
        .eq("id", event.organization_id)
        .single();
      organization = org;
      orgError = orgErr;
    }

    // Check order items
    const { data: orderItems, error: itemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    // Booking fee analysis
    const subtotal = parseFloat(order.subtotal_amount || order.total_amount || 0);
    const expectedBookingFee = (subtotal * 0.01) + 0.50;
    const actualBookingFee = parseFloat(order.booking_fee_amount || 0);

    const result = {
      order: {
        found: true,
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        booking_fee_amount: order.booking_fee_amount,
        booking_fee_enabled: order.booking_fee_enabled,
        subtotal_amount: order.subtotal_amount,
        stripe_session_id: order.stripe_session_id,
        payment_method_type: order.payment_method_type,
        card_brand: order.card_brand,
        card_last_four: order.card_last_four,
        created_at: order.created_at
      },
      event: {
        found: !eventError,
        error: eventError?.message,
        id: event?.id,
        name: event?.name,
        organization_id: event?.organization_id
      },
      organization: {
        found: !orgError,
        error: orgError?.message,
        id: organization?.id,
        name: organization?.name,
        stripe_booking_fee_enabled: organization?.stripe_booking_fee_enabled
      },
      orderItems: {
        found: !itemsError,
        error: itemsError?.message,
        count: orderItems?.length || 0,
        items: orderItems
      },
      bookingFeeAnalysis: {
        expectedFee: expectedBookingFee,
        actualFee: actualBookingFee,
        wasProcessed: order.booking_fee_enabled && actualBookingFee > 0,
        shouldHaveBeenProcessed: organization?.stripe_booking_fee_enabled,
        moneyStatus: order.booking_fee_enabled && actualBookingFee > 0 ? "✅ YOU GOT THE BOOKING FEE MONEY" : "❌ NO BOOKING FEE MONEY RECEIVED"
      }
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Function error:", error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
