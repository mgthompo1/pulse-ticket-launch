import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== WINDCAVE SUCCESS - STEP BY STEP TESTING ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Step 1: Reading request body...");
    const requestBody = await req.json();
    const { sessionId, eventId } = requestBody;
    console.log("SessionId:", sessionId, "EventId:", eventId);

    console.log("Step 2: Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Step 3: Finding order...");
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
      console.log("No exact match, using fallback...");
      const { data: fallbackOrder, error: fallbackError } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (fallbackError) {
        throw new Error(`Fallback failed: ${fallbackError.message}`);
      }
      
      if (!fallbackOrder) {
        throw new Error("No pending orders found");
      }
      
      console.log("Using fallback order:", fallbackOrder.id);
      order = fallbackOrder;

      // Update session ID
      console.log("Step 4: Updating session ID...");
      const { error: updateSessionError } = await supabaseClient
        .from("orders")
        .update({ windcave_session_id: sessionId })
        .eq("id", order.id);

      if (updateSessionError) {
        console.log("Error updating session ID:", updateSessionError.message);
        throw new Error(`Session ID update failed: ${updateSessionError.message}`);
      }
      console.log("Session ID updated successfully");
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

    console.log("Step 5: Testing order update...");
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({ 
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);

    if (updateError) {
      console.log("Error updating order status:", updateError.message);
      throw new Error(`Order update failed: ${updateError.message}`);
    }
    console.log("Order status updated to completed successfully");

    console.log("Step 6: Testing order items lookup...");
    const { data: orderItems, error: orderItemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (orderItemsError) {
      console.log("Error fetching order items:", orderItemsError.message);
      throw new Error(`Order items lookup failed: ${orderItemsError.message}`);
    }

    if (!orderItems || orderItems.length === 0) {
      console.log("No order items found");
      throw new Error("No order items found");
    }

    console.log("Order items found:", orderItems.length);

    // STOP HERE - Don't create tickets yet, just test up to this point
    console.log("SUCCESS: All steps up to ticket creation are working");

    return new Response(JSON.stringify({
      success: true,
      message: "All steps successful up to ticket creation",
      orderId: order.id,
      orderItemsCount: orderItems.length,
      note: "Stopped before ticket creation to test each step"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Function error:", error.message);
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