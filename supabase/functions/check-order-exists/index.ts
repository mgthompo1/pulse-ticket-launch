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
    
    console.log(`🔍 Checking order: ${orderId}`);

    // First, check if order exists at all
    const { data: basicOrder, error: basicError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (basicError) {
      console.error("❌ Basic order lookup failed:", basicError);
      return new Response(JSON.stringify({
        exists: false,
        error: basicError.message,
        details: "Order not found in database"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log("✅ Order found:", basicOrder.id);
    console.log("Order details:", {
      status: basicOrder.status,
      payment_status: basicOrder.payment_status,
      total_amount: basicOrder.total_amount,
      booking_fee_amount: basicOrder.booking_fee_amount,
      booking_fee_enabled: basicOrder.booking_fee_enabled,
      stripe_session_id: basicOrder.stripe_session_id,
      event_id: basicOrder.event_id
    });

    // Now check if event exists
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        id,
        name,
        organization_id,
        organizations!inner(
          id,
          name,
          stripe_booking_fee_enabled
        )
      `)
      .eq("id", basicOrder.event_id)
      .single();

    if (eventError) {
      console.error("❌ Event lookup failed:", eventError);
      return new Response(JSON.stringify({
        exists: true,
        orderFound: true,
        eventFound: false,
        eventError: eventError.message,
        order: basicOrder
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check order items
    const { data: orderItems, error: itemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    console.log("Order items found:", orderItems?.length || 0);

    // Calculate booking fee analysis
    const subtotal = parseFloat(basicOrder.subtotal_amount || basicOrder.total_amount || 0);
    const expectedBookingFee = (subtotal * 0.01) + 0.50; // 1% + $0.50
    const actualBookingFee = parseFloat(basicOrder.booking_fee_amount || 0);

    return new Response(JSON.stringify({
      exists: true,
      orderFound: true,
      eventFound: true,
      order: basicOrder,
      event: event,
      orderItemsCount: orderItems?.length || 0,
      bookingFeeAnalysis: {
        expectedFee: expectedBookingFee,
        actualFee: actualBookingFee,
        wasProcessed: basicOrder.booking_fee_enabled && actualBookingFee > 0,
        orgBookingFeeEnabled: event.organizations.stripe_booking_fee_enabled
      }
    }), {
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
