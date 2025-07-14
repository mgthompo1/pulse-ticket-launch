import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== WINDCAVE DROPIN SUCCESS - GRADUAL VERSION ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Step 1: Reading request body...");
    const requestBody = await req.json();
    const { sessionId, eventId } = requestBody;
    console.log("SessionId:", sessionId, "EventId:", eventId);

    if (!sessionId || !eventId) {
      throw new Error("Missing required parameters");
    }

    console.log("Step 2: Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    console.log("Supabase client created successfully");

    console.log("Step 3: Simple database test - checking if we can query orders table...");
    const { data: testQuery, error: testError } = await supabaseClient
      .from("orders")
      .select("id")
      .limit(1);
    
    if (testError) {
      console.log("Database test failed:", testError.message);
      throw new Error(`Database test failed: ${testError.message}`);
    }
    console.log("Database test passed, found", testQuery?.length || 0, "orders");

    console.log("Step 4: Looking for specific order...");
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("id, windcave_session_id, status")
      .eq("windcave_session_id", sessionId)
      .eq("event_id", eventId)
      .maybeSingle();

    console.log("Order query result - Error:", orderError?.message, "Found order:", !!order);

    if (orderError) {
      throw new Error(`Order lookup failed: ${orderError.message}`);
    }

    if (!order) {
      console.log("No exact match, trying fallback to most recent pending order...");
      const { data: fallbackOrder, error: fallbackError } = await supabaseClient
        .from("orders")
        .select("id, windcave_session_id, status")
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
      
      // For now, just return success to test if we can get this far
      return new Response(JSON.stringify({
        success: true,
        message: "Found fallback order, database operations work",
        orderId: fallbackOrder.id,
        originalSessionId: sessionId,
        foundSessionId: fallbackOrder.windcave_session_id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log("Found exact order match:", order.id);
    return new Response(JSON.stringify({
      success: true,
      message: "Found exact order match, database operations work",
      orderId: order.id,
      status: order.status
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