
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[WINDCAVE-HIT-TERMINAL] Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { eventId, items, customerInfo, action = "purchase", txnRef: statusTxnRef } = await req.json();
    console.log("[WINDCAVE-HIT-TERMINAL] Processing request", { eventId, action, itemCount: items?.length, statusTxnRef });

    // Handle different actions
    if (action === "purchase") {
      // Validate required parameters for purchase
      if (!eventId || !items || !customerInfo) {
        throw new Error("Missing required parameters: eventId, items, and customerInfo are required");
      }

      // Get event and organization details
      const { data: event, error: eventError } = await supabaseClient
        .from("events")
        .select(`
          *,
          organizations!inner(
            currency
          )
        `)
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        throw new Error("Event not found");
      }

      // Get payment credentials
      const { data: credentials, error: credError } = await supabaseClient
        .from("payment_credentials")
        .select("windcave_hit_username, windcave_hit_key, windcave_endpoint, windcave_enabled, windcave_station_id")
        .eq("organization_id", event.organization_id)
        .single();

      if (credError || !credentials) {
        throw new Error("Payment credentials not found");
      }

      const org = event.organizations;
      if (!credentials.windcave_enabled || !credentials.windcave_hit_username || !credentials.windcave_hit_key) {
        throw new Error("Windcave HIT terminal not configured for this organization");
      }

      const terminalStationId = credentials.windcave_station_id;
      if (!terminalStationId) {
        throw new Error("Terminal station ID not configured for this organization");
      }

      // Calculate total amount
      const totalAmount = items.reduce((sum: number, item: any) => {
        return sum + (item.quantity * item.price);
      }, 0);

      // Use organization's configured currency
      const currency = org.currency || 'NZD';

      console.log("[WINDCAVE-HIT-TERMINAL] Calculated total amount", { totalAmount, currency });

      // Correct HIT API endpoint
      const baseUrl = credentials.windcave_endpoint === "SEC" 
        ? "https://sec.windcave.com/hit/pos.aspx"
        : "https://uat.windcave.com/hit/pos.aspx";

      // Generate unique transaction reference
      const txnRef = `${event.name.replace(/\s+/g, '')}-${Date.now()}`;

      // Create proper HIT XML request using Scr format
      const xmlRequest = `<Scr action="doScrHIT" user="${credentials.windcave_hit_username}" key="${credentials.windcave_hit_key}">
    <Amount>${totalAmount.toFixed(2)}</Amount>
    <Cur>${currency}</Cur>
    <TxnType>Purchase</TxnType>
    <Station>${terminalStationId}</Station>
    <TxnRef>${txnRef}</TxnRef>
    <DeviceId>Ticket2LIVE Terminal</DeviceId>
    <PosName>Ticket2LIVE POS</PosName>
    <PosVersion>1.0</PosVersion>
    <VendorId>Ticket2LIVE</VendorId>
    <MRef>${event.name}-${customerInfo.name}</MRef>
</Scr>`;

      console.log("[WINDCAVE-HIT-TERMINAL] Sending HIT transaction to terminal", { 
        baseUrl, 
        station: terminalStationId, 
        txnRef,
        amount: totalAmount.toFixed(2),
        currency 
      });

      // Make request to Windcave HIT API
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "User-Agent": "Ticket2LIVE-HIT-Terminal/1.0"
        },
        body: xmlRequest
      });

      const responseText = await response.text();
      console.log("[WINDCAVE-HIT-TERMINAL] Windcave HIT response", { 
        status: response.status, 
        response: responseText.substring(0, 500)
      });

      if (!response.ok) {
        throw new Error(`Windcave HIT API error: ${response.status} - ${responseText}`);
      }

      // Parse XML response for initial validation using string parsing
      if (!responseText.includes("<Scr>") || !responseText.includes("</Scr>")) {
        throw new Error(`Invalid XML response from Windcave: ${responseText.substring(0, 200)}`);
      }

      // Check for error response
      const errorMsgMatch = responseText.match(/<ErrorMsg>(.*?)<\/ErrorMsg>/);
      if (errorMsgMatch) {
        throw new Error(`Windcave HIT error: ${errorMsgMatch[1]}`);
      }

      console.log("[WINDCAVE-HIT-TERMINAL] Transaction sent to terminal successfully", { txnRef });

      // Create order record
      const orderData = {
        event_id: eventId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone || null,
        total_amount: totalAmount,
        status: "pending",
        custom_answers: customerInfo?.customAnswers || {},
        windcave_session_id: txnRef
      };

      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error("[WINDCAVE-HIT-TERMINAL] Error creating order", orderError);
        throw new Error("Failed to create order record");
      }

      console.log("[WINDCAVE-HIT-TERMINAL] Order created", { orderId: order.id });

      // Create order items
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        ticket_type_id: item.ticketTypeId || item.ticket_type_id, // Use the correct field name
        quantity: item.quantity,
        unit_price: item.price,
        item_type: item.type || 'ticket'
      }));

      const { error: orderItemsError } = await supabaseClient
        .from("order_items")
        .insert(orderItems);

      if (orderItemsError) {
        console.error("[WINDCAVE-HIT-TERMINAL] Error creating order items", orderItemsError);
        throw new Error("Failed to create order items");
      }

      console.log("[WINDCAVE-HIT-TERMINAL] Order items created", { count: orderItems.length });

      // Return immediately after initiating transaction
      return new Response(JSON.stringify({
        success: true,
        status: "initiated",
        message: "Transaction sent to terminal - use status action to check progress",
        txnRef: txnRef,
        orderId: order.id,
        amount: totalAmount,
        currency: currency
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === "status") {
      // Status checking for existing transaction
      if (!statusTxnRef) {
        throw new Error("Transaction reference (txnRef) required for status check");
      }

      // Get the order to find organization details
      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .select(`
          *,
          events!inner(
            organization_id
          )
        `)
        .eq("windcave_session_id", statusTxnRef)
        .single();

      if (orderError || !order) {
        throw new Error("Order not found for transaction reference");
      }

      // Get payment credentials for status check
      const { data: statusCredentials, error: statusCredError } = await supabaseClient
        .from("payment_credentials")
        .select("windcave_hit_username, windcave_hit_key, windcave_endpoint, windcave_station_id")
        .eq("organization_id", order.events.organization_id)
        .single();

      if (statusCredError || !statusCredentials) {
        throw new Error("Payment credentials not found for status check");
      }

      const terminalStationId = statusCredentials.windcave_station_id;

      // Correct HIT API endpoint
      const baseUrl = statusCredentials.windcave_endpoint === "SEC" 
        ? "https://sec.windcave.com/hit/pos.aspx"
        : "https://uat.windcave.com/hit/pos.aspx";

      // Create status request XML using correct format from documentation
      const statusXml = `<Scr action="doScrHIT" user="${statusCredentials.windcave_hit_username}" key="${statusCredentials.windcave_hit_key}">
    <Station>${terminalStationId}</Station>
    <TxnType>Status</TxnType>
    <TxnRef>${statusTxnRef}</TxnRef>
</Scr>`;

      console.log("[WINDCAVE-HIT-TERMINAL] Checking transaction status", { txnRef: statusTxnRef });

      const statusResponse = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "User-Agent": "Ticket2LIVE-HIT-Terminal/1.0"
        },
        body: statusXml
      });

      const statusText = await statusResponse.text();
      console.log("[WINDCAVE-HIT-TERMINAL] Status response", { 
        response: statusText.substring(0, 500)
      });

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status} - ${statusText}`);
      }

      // Parse status response using string parsing
      const complete = statusText.match(/<Complete>(.*?)<\/Complete>/)?.[1] || "";
      const success = statusText.match(/<Success>(.*?)<\/Success>/)?.[1] || "";
      const dl1 = statusText.match(/<DL1>(.*?)<\/DL1>/)?.[1] || "";
      const dl2 = statusText.match(/<DL2>(.*?)<\/DL2>/)?.[1] || "";
      const responseTextMatch = statusText.match(/<ResponseText>(.*?)<\/ResponseText>/)?.[1] || "";
      const reCo = statusText.match(/<ReCo>(.*?)<\/ReCo>/)?.[1] || "";

      const isComplete = complete === "1";
      const isSuccess = success === "1";

      // Update order status if transaction is complete
      if (isComplete) {
        const finalStatus = isSuccess ? "completed" : "failed";
        
        await supabaseClient
          .from("orders")
          .update({ status: finalStatus })
          .eq("id", order.id);

        console.log("[WINDCAVE-HIT-TERMINAL] Transaction completed", { 
          txnRef: statusTxnRef, 
          success: isSuccess, 
          responseText: responseTextMatch 
        });
      }

      return new Response(JSON.stringify({
        success: true,
        txnRef: statusTxnRef,
        orderId: order.id,
        complete: isComplete,
        transactionSuccess: isSuccess,
        status: isComplete ? (isSuccess ? "completed" : "failed") : "processing",
        message: isComplete ? 
          (isSuccess ? "Payment completed successfully" : `Payment failed: ${responseTextMatch}`) :
          "Transaction in progress",
        displayLine1: dl1,
        displayLine2: dl2,
        responseText: responseTextMatch,
        resultCode: reCo
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else {
      throw new Error("Invalid action. Use 'purchase' to initiate or 'status' to check transaction");
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[WINDCAVE-HIT-TERMINAL] ERROR:", errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

