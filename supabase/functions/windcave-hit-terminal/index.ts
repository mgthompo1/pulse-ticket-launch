
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WINDCAVE-HIT-TERMINAL] ${step}${detailsStr}`);
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

    const { eventId, items, customerInfo, action = "purchase", sessionId } = await req.json();
    logStep("Processing HIT terminal request", { eventId, action, itemCount: items?.length, sessionId });

    // Validate required parameters for purchase
    if (action === "purchase" && (!eventId || !items || !customerInfo)) {
      throw new Error("Missing required parameters: eventId, items, and customerInfo are required");
    }

    // Get event and organization details
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        *,
        organizations!inner(
          windcave_hit_username,
          windcave_hit_key,
          windcave_endpoint,
          windcave_enabled,
          windcave_station_id,
          currency
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found or not accessible");
    }

    const org = event.organizations;
    if (!org.windcave_enabled || !org.windcave_hit_username || !org.windcave_hit_key) {
      throw new Error("Windcave HIT terminal not configured for this organization");
    }

    const terminalStationId = org.windcave_station_id;
    if (!terminalStationId) {
      throw new Error("Terminal station ID not configured for this organization");
    }

    // Use organization's configured currency
    const currency = org.currency || 'NZD';

    // Determine API endpoint based on environment
    const baseUrl = org.windcave_endpoint === "SEC" 
      ? "https://sec.windcave.com/api/v1/sessions"
      : "https://uat.windcave.com/api/v1/sessions";

    // Create Basic Auth header
    const authHeader = `Basic ${btoa(`${org.windcave_hit_username}:${org.windcave_hit_key}`)}`;

    if (action === "purchase") {
      // Calculate total amount
      const totalAmount = items.reduce((sum: number, item: any) => {
        return sum + (item.quantity * item.price);
      }, 0);

      logStep("Calculated total amount", { totalAmount, currency });

      // Create session with terminal node for direct terminal processing
      const sessionData = {
        type: "purchase",
        amount: totalAmount.toFixed(2),
        currency: currency,
        callbackUrls: {
          approved: `${Deno.env.get("SUPABASE_URL")}/functions/v1/windcave-hit-terminal`,
          declined: `${Deno.env.get("SUPABASE_URL")}/functions/v1/windcave-hit-terminal`,
          cancelled: `${Deno.env.get("SUPABASE_URL")}/functions/v1/windcave-hit-terminal`
        },
        terminal: {
          station: terminalStationId,
          slotId: 1,
          enableTip: 0,
          skipSurcharge: 0,
          payAtTable: 0,
          oneSwipe: 0,
          cardholderPresent: 1,
          authType: "Purchase",
          completeType: "Final",
          billingId: `${event.name}-${Date.now()}`,
          txnData1: event.name,
          txnData2: customerInfo.name,
          txnData3: customerInfo.email,
          receiptEmail: customerInfo.email || ""
        }
      };

      logStep("Creating session with terminal node", { 
        baseUrl, 
        station: terminalStationId, 
        amount: totalAmount.toFixed(2),
        currency: currency
      });

      // Make request to Windcave REST API
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          "Accept": "application/json"
        },
        body: JSON.stringify(sessionData)
      });

      const responseData = await response.json();
      logStep("Windcave session creation response", { status: response.status, data: responseData });

      if (!response.ok) {
        throw new Error(`Windcave API error: Status ${response.status} - ${JSON.stringify(responseData)}`);
      }

      // Create order record for purchase
      const orderData = {
        event_id: eventId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone || null,
        total_amount: totalAmount,
        status: "pending",
        windcave_session_id: responseData.id
      };

      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        logStep("Error creating order", orderError);
        throw new Error("Failed to create order record");
      }

      logStep("Order created", { orderId: order.id });

      // Create order items
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        ticket_type_id: item.id || item.ticketTypeId,
        quantity: item.quantity,
        unit_price: item.price,
        item_type: item.type || 'ticket'
      }));

      const { error: orderItemsError } = await supabaseClient
        .from("order_items")
        .insert(orderItems);

      if (orderItemsError) {
        logStep("Error creating order items", orderItemsError);
        throw new Error("Failed to create order items");
      }

      logStep("Order items created", { count: orderItems.length });

      return new Response(JSON.stringify({
        success: true,
        sessionId: responseData.id,
        orderId: order.id,
        amount: totalAmount,
        currency: currency,
        status: "initiated",
        message: "HIT terminal transaction initiated successfully",
        terminalDisplay: "Present card to terminal",
        terminal: responseData.terminal,
        links: responseData.links
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === "status") {
      // Get session status
      if (!sessionId) {
        throw new Error("Session ID required for status check");
      }

      const statusUrl = `${baseUrl}/${sessionId}`;
      logStep("Checking session status", { statusUrl });

      const statusResponse = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Authorization": authHeader,
          "Accept": "application/json"
        }
      });

      const statusData = await statusResponse.json();
      logStep("Session status response", { status: statusResponse.status, data: statusData });

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status} - ${JSON.stringify(statusData)}`);
      }

      // Check if payment is completed
      let paymentStatus = "processing";
      let displayMessage = "Processing...";
      
      if (statusData.state === "completed") {
        paymentStatus = "approved";
        displayMessage = "Payment completed successfully";
        
        // Update order status
        const { error: updateError } = await supabaseClient
          .from("orders")
          .update({ status: "completed" })
          .eq("windcave_session_id", sessionId);

        if (updateError) {
          logStep("Error updating order status", updateError);
        }
      } else if (statusData.state === "failed" || statusData.state === "declined") {
        paymentStatus = "declined";
        displayMessage = "Payment declined";
        
        // Update order status
        const { error: updateError } = await supabaseClient
          .from("orders")
          .update({ status: "failed" })
          .eq("windcave_session_id", sessionId);

        if (updateError) {
          logStep("Error updating order status", updateError);
        }
      } else if (statusData.terminal?.pinpad) {
        // Terminal has pinpad display information
        displayMessage = `${statusData.terminal.pinpad.displayLine1} ${statusData.terminal.pinpad.displayLine2}`.trim();
      }

      return new Response(JSON.stringify({
        success: true,
        sessionId: sessionId,
        status: paymentStatus,
        state: statusData.state,
        message: displayMessage,
        terminal: statusData.terminal,
        pinpad: statusData.terminal?.pinpad,
        buttons: statusData.terminal?.pinpad?.buttons || [],
        approvalCode: statusData.approvalCode,
        rawResponse: statusData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === "cancel") {
      // Cancel terminal transaction
      if (!sessionId) {
        throw new Error("Session ID required for cancellation");
      }

      const cancelUrl = `${baseUrl}/${sessionId}/terminal_action`;
      logStep("Cancelling terminal transaction", { cancelUrl });

      const cancelResponse = await fetch(cancelUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          "Accept": "application/json"
        },
        body: JSON.stringify({
          action: "cancel"
        })
      });

      const cancelData = await cancelResponse.json();
      logStep("Cancel response", { status: cancelResponse.status, data: cancelData });

      // Update order status
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({ status: "cancelled" })
        .eq("windcave_session_id", sessionId);

      if (updateError) {
        logStep("Error updating order status", updateError);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Transaction cancelled successfully",
        sessionId: sessionId
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action specified");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
