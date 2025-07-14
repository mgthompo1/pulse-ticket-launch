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
    console.log("SessionId:", sessionId, "EventId:", eventId);

    if (!sessionId || !eventId) {
      throw new Error("Missing required parameters: sessionId and eventId are required");
    }

    console.log("Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Looking for order with windcave_session_id:", sessionId);
    
    // Find the order using windcave_session_id
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("windcave_session_id", sessionId)
      .eq("event_id", eventId)
      .single();

    if (orderError || !order) {
      console.log("Order not found:", orderError?.message || "No order found");
      throw new Error("Order not found for this session");
    }

    console.log("Order found:", order.id, "Status:", order.status);

    // Check if already completed
    if (order.status === 'completed') {
      console.log("Order already completed");
      return new Response(JSON.stringify({
        success: true,
        message: "Order already completed",
        orderId: order.id
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
      .eq("id", order.id);

    if (updateError) {
      console.log("Error updating order:", updateError.message);
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    console.log("Order updated successfully. Fetching order items...");
    
    // Get order items
    const { data: orderItems, error: orderItemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

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
      orderId: order.id,
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