import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WINDCAVE-DROPIN-SUCCESS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // First, let's try to read the request body
    let requestBody;
    try {
      requestBody = await req.json();
      logStep("Request body parsed", requestBody);
    } catch (bodyError) {
      logStep("Error parsing request body", bodyError);
      throw new Error(`Failed to parse request body: ${bodyError.message}`);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId, eventId } = requestBody;
    
    logStep("Processing Windcave Drop In success", { sessionId, eventId });

    if (!sessionId || !eventId) {
      throw new Error("Missing required parameters: sessionId and eventId are required");
    }

    // Check recent orders for this event to understand what sessionIds we have
    const { data: recentOrders } = await supabaseClient
      .from("orders")
      .select("id, stripe_session_id, status, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(10);
    
    logStep("Recent orders for event", { eventId, recentOrders });

    // Try to find the order - be very flexible with sessionId matching
    let order = null;
    let matchMethod = "";

    // Method 1: Exact match
    const { data: order1 } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (order1) {
      order = order1;
      matchMethod = "exact_match";
      logStep("Order found with exact sessionId match", { orderId: order.id });
    } else {
      // Method 2: Extract from URL if it's a URL
      const sessionIdPart = sessionId.includes('/') ? sessionId.split('/').pop() : sessionId;
      const { data: order2 } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("stripe_session_id", sessionIdPart)
        .eq("event_id", eventId)
        .maybeSingle();
      
      if (order2) {
        order = order2;
        matchMethod = "url_extracted";
        logStep("Order found with sessionId part match", { orderId: order.id, sessionIdPart });
      } else {
        // Method 3: Find most recent pending order for this event (fallback)
        const { data: order3 } = await supabaseClient
          .from("orders")
          .select("*")
          .eq("event_id", eventId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (order3) {
          order = order3;
          matchMethod = "most_recent_pending";
          logStep("Using most recent pending order as fallback", { orderId: order.id });
        }
      }
    }

    if (!order) {
      logStep("Order not found with any method", { 
        originalSessionId: sessionId, 
        sessionIdPart: sessionId.includes('/') ? sessionId.split('/').pop() : sessionId,
        eventId,
        recentOrders
      });
      throw new Error("Order not found for this session");
    }

    logStep("Order found", { orderId: order.id, currentStatus: order.status, matchMethod });

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage, stack: error?.stack });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});