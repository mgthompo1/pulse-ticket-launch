import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  try {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
    console.log(`[WINDCAVE-DROPIN-SUCCESS] ${step}${detailsStr}`);
  } catch (logError) {
    console.log(`[WINDCAVE-DROPIN-SUCCESS] ${step} - (details could not be serialized)`);
  }
};

serve(async (req) => {
  console.log("=== WINDCAVE DROPIN SUCCESS FUNCTION STARTED ===");

  if (req.method === "OPTIONS") {
    console.log("OPTIONS request - returning CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started - reading request body");

    // First, let's try to read the request body
    let requestBody;
    try {
      const bodyText = await req.text();
      logStep("Raw request body", bodyText);
      requestBody = JSON.parse(bodyText);
      logStep("Request body parsed successfully", requestBody);
    } catch (bodyError) {
      logStep("Error parsing request body", { error: bodyError.message });
      throw new Error(`Failed to parse request body: ${bodyError.message}`);
    }

    try {
      logStep("Creating Supabase client");
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      logStep("Supabase client created successfully");

      const { sessionId, eventId } = requestBody;
      
      logStep("Processing Windcave Drop In success", { sessionId, eventId });

      if (!sessionId || !eventId) {
        throw new Error("Missing required parameters: sessionId and eventId are required");
      }

      // Check recent orders for this event
      logStep("Checking recent orders for event");
      const { data: recentOrders, error: recentOrdersError } = await supabaseClient
        .from("orders")
        .select("id, windcave_session_id, status, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (recentOrdersError) {
        logStep("Error fetching recent orders", recentOrdersError);
        throw new Error(`Failed to fetch recent orders: ${recentOrdersError.message}`);
      }
      
      logStep("Recent orders for event", { eventId, recentOrders });

      // Try to find the order using windcave_session_id field
      logStep("Looking for order with exact windcave_session_id match");
      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("windcave_session_id", sessionId)
        .eq("event_id", eventId)
        .maybeSingle();

      if (orderError) {
        logStep("Error searching for order", orderError);
        throw new Error(`Failed to search for order: ${orderError.message}`);
      }

      if (!order) {
        logStep("No order found with sessionId", { sessionId, eventId });
        throw new Error("Order not found for this session");
      }

      logStep("Order found", { orderId: order.id, currentStatus: order.status });

      // Only process if order isn't already completed
      if (order.status === 'completed') {
        logStep("Order already completed", { orderId: order.id });
        return new Response(JSON.stringify({
          success: true,
          message: "Order already completed",
          orderId: order.id
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Update order status to completed
      logStep("Updating order to completed", { orderId: order.id });
      
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({ 
          status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("id", order.id);

      if (updateError) {
        logStep("Error updating order status", updateError);
        throw new Error(`Failed to update order status: ${updateError.message}`);
      }

      logStep("Order status updated to completed", { orderId: order.id });
      
      // Generate tickets for completed orders
      logStep("Fetching order items");
      const { data: orderItems, error: orderItemsError } = await supabaseClient
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (orderItemsError) {
        logStep("Error fetching order items", orderItemsError);
        throw new Error(`Failed to fetch order items: ${orderItemsError.message}`);
      }

      if (!orderItems || orderItems.length === 0) {
        logStep("No order items found for order", { orderId: order.id });
        throw new Error("No order items found");
      }

      logStep("Creating tickets", { orderItemsCount: orderItems.length });
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
        logStep("Error creating tickets", ticketsError);
        throw new Error(`Failed to create tickets: ${ticketsError.message}`);
      }

      logStep("Tickets created successfully", { ticketCount: tickets.length });

      const response = {
        success: true,
        message: "Payment completed successfully",
        orderId: order.id,
        ticketCount: tickets.length
      };

      logStep("Returning success response", response);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (supabaseError) {
      logStep("Supabase operation error", { error: supabaseError.message });
      throw supabaseError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR - Function failed", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});