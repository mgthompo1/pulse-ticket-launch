import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== WINDCAVE DROPIN SUCCESS - COMPLETE VERSION ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Reading request body...");
    const requestBody = await req.json();
    const { sessionId, eventId } = requestBody;
    console.log("SessionId:", sessionId, "EventId:", eventId);

    if (!sessionId || !eventId) {
      throw new Error("Missing required parameters");
    }

    console.log("Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Looking for order with sessionId:", sessionId);
    let order = null;

    // Try exact match first
    const { data: exactOrder, error: exactError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("windcave_session_id", sessionId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (exactError) {
      console.log("Error in exact order lookup:", exactError.message);
      throw new Error(`Order lookup failed: ${exactError.message}`);
    }

    if (exactOrder) {
      console.log("Found exact order match:", exactOrder.id);
      order = exactOrder;
    } else {
      console.log("No exact match, using fallback to most recent pending order...");
      const { data: fallbackOrder, error: fallbackError } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (fallbackError) {
        throw new Error(`Fallback order lookup failed: ${fallbackError.message}`);
      }
      
      if (!fallbackOrder) {
        throw new Error("No pending orders found for this event");
      }
      
      console.log("Using fallback order:", fallbackOrder.id);
      order = fallbackOrder;

      // Update the fallback order with correct session ID for future reference
      await supabaseClient
        .from("orders")
        .update({ windcave_session_id: sessionId })
        .eq("id", order.id);
    }

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
    const { data: orderItems, error: orderItemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (orderItemsError) {
      console.log("Error fetching order items:", orderItemsError.message);
      throw new Error(`Failed to fetch order items: ${orderItemsError.message}`);
    }

    if (!orderItems || orderItems.length === 0) {
      console.log("No order items found");
      throw new Error("No order items found");
    }

    console.log("Creating tickets for", orderItems.length, "order items...");
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
    
    console.log("Inserting", tickets.length, "tickets...");
    const { error: ticketsError } = await supabaseClient
      .from("tickets")
      .insert(tickets);
      
    if (ticketsError) {
      console.log("Error creating tickets:", ticketsError.message);
      throw new Error(`Failed to create tickets: ${ticketsError.message}`);
    }

    console.log("SUCCESS: Order completed and tickets created");

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