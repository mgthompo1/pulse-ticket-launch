import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== WINDCAVE SUCCESS - SIMPLE TEST ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Reading request body...");
    const requestBody = await req.json();
    console.log("Full request body:", JSON.stringify(requestBody, null, 2));
    
    const { sessionId, eventId } = requestBody;
    console.log("SessionId:", sessionId, "EventId:", eventId);

    if (!sessionId || !eventId) {
      throw new Error(`Missing required parameters: sessionId=${sessionId}, eventId=${eventId}`);
    }

    console.log("Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Finding most recent pending order for event...");
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      console.log("Error finding order:", orderError.message);
      throw new Error(`Order lookup failed: ${orderError.message}`);
    }

    if (!order) {
      console.log("No pending order found for event:", eventId);
      throw new Error("No pending orders found for this event");
    }

    console.log("Found order:", order.id, "with status:", order.status);

    // Just try to update the status to completed - let's see what constraint is blocking this
    console.log("Attempting to update order status to completed...");
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({ status: "completed" })
      .eq("id", order.id);

    if (updateError) {
      console.log("CONSTRAINT ERROR:", updateError.message);
      console.log("Full error:", JSON.stringify(updateError, null, 2));
      
      // Let's try with 'paid' instead
      console.log("Trying with status 'paid'...");
      const { error: paidError } = await supabaseClient
        .from("orders")
        .update({ status: "paid" })
        .eq("id", order.id);
        
      if (paidError) {
        console.log("PAID ERROR:", paidError.message);
        throw new Error(`Status update failed: ${updateError.message} and ${paidError.message}`);
      }
      
      console.log("Successfully updated to 'paid' status");
    } else {
      console.log("Successfully updated to 'completed' status");
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Order status updated successfully",
      orderId: order.id,
      originalStatus: "pending",
      newStatus: updateError ? "paid" : "completed"
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