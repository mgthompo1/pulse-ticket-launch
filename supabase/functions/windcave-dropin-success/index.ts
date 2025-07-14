import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== WINDCAVE DROPIN SUCCESS FUNCTION STARTED ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Reading request body...");
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody));

    const { sessionId, eventId } = requestBody;
    console.log("SessionId received:", sessionId);
    console.log("EventId received:", eventId);

    if (!sessionId || !eventId) {
      throw new Error("Missing required parameters: sessionId and eventId are required");
    }

    console.log("Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // First, let's see what orders exist for this event
    console.log("Checking all recent orders for event:", eventId);
    const { data: allOrders, error: allOrdersError } = await supabaseClient
      .from("orders")
      .select("id, windcave_session_id, status, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (allOrdersError) {
      console.log("Error fetching all orders:", allOrdersError.message);
    } else {
      console.log("All recent orders for event:", JSON.stringify(allOrders, null, 2));
    }

    console.log("Looking for order with windcave_session_id:", sessionId);
    
    // Find the order using windcave_session_id with maybeSingle to avoid errors
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("windcave_session_id", sessionId)
      .eq("event_id", eventId)
      .maybeSingle();

    console.log("Order query result - Error:", orderError?.message, "Order found:", !!order);

    if (orderError) {
      console.log("Database error searching for order:", orderError.message);
      throw new Error(`Database error: ${orderError.message}`);
    }

    if (!order) {
      console.log("No order found with sessionId:", sessionId);
      console.log("Will try to find most recent pending order as fallback...");
      
      // Fallback: get most recent pending order
      const { data: fallbackOrder, error: fallbackError } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (fallbackError) {
        console.log("Error finding fallback order:", fallbackError.message);
        throw new Error(`No order found and fallback failed: ${fallbackError.message}`);
      }
      
      if (!fallbackOrder) {
        console.log("No pending orders found for event");
        throw new Error("No pending orders found for this event");
      }
      
      console.log("Using fallback order:", fallbackOrder.id);
      // Use the fallback order
      const order = fallbackOrder;
      
      // Update the fallback order with the correct session ID
      console.log("Updating fallback order with correct session ID");
      await supabaseClient
        .from("orders")
        .update({ windcave_session_id: sessionId })
        .eq("id", order.id);
    }

    // Re-fetch the order to ensure we have the latest data
    const { data: finalOrder, error: finalOrderError } = await supabaseClient
      .from("orders")
      .select("*")
      .or(`windcave_session_id.eq.${sessionId},id.eq.${order?.id || 'none'}`)
      .eq("event_id", eventId)
      .maybeSingle();

    if (!finalOrder) {
      throw new Error("Could not find or create order");
    }

    console.log("Final order found:", finalOrder.id, "Status:", finalOrder.status);

    // Check if already completed
    if (finalOrder.status === 'completed') {
      console.log("Order already completed");
      return new Response(JSON.stringify({
        success: true,
        message: "Order already completed",
        orderId: finalOrder.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log("Updating order status to completed...");
    
    // Update order status
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({ 
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", finalOrder.id);

    if (updateError) {
      console.log("Error updating order:", updateError.message);
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    console.log("Order updated successfully. Fetching order items...");
    
    // Get order items
    const { data: orderItems, error: orderItemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", finalOrder.id);

    if (orderItemsError || !orderItems || orderItems.length === 0) {
      console.log("Error fetching order items:", orderItemsError?.message || "No items found");
      throw new Error("No order items found");
    }

    console.log("Creating tickets for", orderItems.length, "order items...");
    
    // Create tickets
    const tickets = [];
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        tickets.push({
          order_item_id: item.id,
          ticket_code: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'valid'
        });
      }
    }
    
    const { error: ticketsError } = await supabaseClient
      .from("tickets")
      .insert(tickets);
      
    if (ticketsError) {
      console.log("Error creating tickets:", ticketsError.message);
      throw new Error(`Failed to create tickets: ${ticketsError.message}`);
    }

    console.log("Tickets created successfully:", tickets.length);

    return new Response(JSON.stringify({
      success: true,
      message: "Payment completed successfully",
      orderId: finalOrder.id,
      ticketCount: tickets.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Function error:", error.message);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});