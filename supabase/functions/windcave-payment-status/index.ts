import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WINDCAVE-PAYMENT-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { eventId, txnRef, orderId } = await req.json();
    logStep("Checking payment status", { eventId, txnRef, orderId });

    if (!eventId || !txnRef) {
      throw new Error("Missing required parameters: eventId and txnRef are required");
    }

    // Find the order by session ID (stored in stripe_session_id field)
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("stripe_session_id", txnRef)
      .eq("event_id", eventId)
      .single();

    if (orderError || !order) {
      logStep("Order not found", { txnRef, eventId, orderError });
      throw new Error("Order not found for this session");
    }

    logStep("Order found", { orderId: order.id, currentStatus: order.status });

    // Get event and organization details
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        *,
        organizations!inner(
          windcave_username,
          windcave_api_key,
          windcave_endpoint,
          windcave_enabled,
          currency
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found or not accessible");
    }

    const org = event.organizations;
    if (!org.windcave_enabled || !org.windcave_username || !org.windcave_api_key) {
      throw new Error("Windcave not configured for this organization");
    }

    // Determine API endpoint based on environment
    const baseUrl = org.windcave_endpoint === "SEC" 
      ? "https://sec.windcave.com/api/v1/sessions"
      : "https://uat.windcave.com/api/v1/sessions";

    const sessionUrl = `${baseUrl}/${txnRef}`;
    
    logStep("Checking session status with Windcave", { sessionUrl });

    // Check session status with Windcave API
    const response = await fetch(sessionUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Basic ${btoa(`${org.windcave_username}:${org.windcave_api_key}`)}`
      }
    });

    const responseData = await response.json();
    logStep("Windcave session response", { status: response.status, data: responseData });

    if (!response.ok) {
      throw new Error(`Windcave API error: Status ${response.status} - ${JSON.stringify(responseData)}`);
    }

    // Check the session state
    const sessionState = responseData.state;
    const isCompleted = sessionState === 'completed';
    const isDeclined = sessionState === 'declined' || sessionState === 'failed';
    const isPending = sessionState === 'processing' || sessionState === 'pending';

    let paymentStatus = 'pending';
    if (isCompleted) {
      paymentStatus = 'completed';
    } else if (isDeclined) {
      paymentStatus = 'failed';
    }

    logStep("Payment status determined", { 
      sessionState, 
      paymentStatus, 
      isCompleted, 
      isDeclined, 
      isPending 
    });

    // If payment is successful and order isn't already completed, update order status
    if (isCompleted && order.status !== 'completed') {
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
      } else {
        logStep("Order status updated to completed", { orderId: order.id });
        
        // Generate tickets for completed orders
        try {
          const { data: orderItems } = await supabaseClient
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

           if (orderItems && orderItems.length > 0) {
            const tickets = [];
            // Only generate tickets for ticket items, not merchandise
            const ticketItems = orderItems.filter(item => item.item_type === 'ticket');
            for (const item of ticketItems) {
              for (let i = 0; i < item.quantity; i++) {
                tickets.push({
                  order_item_id: item.id,
                  ticket_code: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  status: 'valid'
                });
              }
            }
            
            if (tickets.length > 0) {
              const { error: ticketsError } = await supabaseClient
                .from("tickets")
                .insert(tickets);
                
              if (ticketsError) {
                logStep("Error creating tickets", ticketsError);
              } else {
                logStep("Tickets created successfully", { ticketCount: tickets.length });
              }
            }
          }
        } catch (ticketError) {
          logStep("Error in ticket generation", ticketError);
        }
      }
    } else if (isDeclined && order.status !== 'failed') {
      // Update failed orders
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({ 
          status: "failed",
          updated_at: new Date().toISOString()
        })
        .eq("id", order.id);

      if (updateError) {
        logStep("Error updating order to failed", updateError);
      } else {
        logStep("Order status updated to failed", { orderId: order.id });
      }
    }

    // Count tickets for successful response
    let ticketCount = 0;
    if (isCompleted) {
      const { data: orderItems } = await supabaseClient
        .from("order_items")
        .select("quantity")
        .eq("order_id", order.id);
      
      if (orderItems) {
        ticketCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      }
    }

    return new Response(JSON.stringify({
      success: isCompleted,
      status: paymentStatus,
      message: isCompleted ? "Payment completed successfully" : 
               isDeclined ? "Payment was declined" : 
               "Payment is still being processed",
      sessionState: sessionState,
      orderId: order.id,
      txnRef,
      ticketCount: ticketCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
      status: 'error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});