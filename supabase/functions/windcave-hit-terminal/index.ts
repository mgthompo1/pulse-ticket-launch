
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

    const { eventId, items, customerInfo } = await req.json();
    console.log("[WINDCAVE-HIT-TERMINAL] Processing request", { eventId, itemCount: items?.length });

    // Validate required parameters
    if (!eventId || !items || !customerInfo) {
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

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.price);
    }, 0);

    // Use organization's configured currency
    const currency = org.currency || 'NZD';

    console.log("[WINDCAVE-HIT-TERMINAL] Calculated total amount", { totalAmount, currency });

    // Determine HIT API endpoint based on environment
    const baseUrl = org.windcave_endpoint === "SEC" 
      ? "https://sec.windcave.com/pxhit/pxhit.aspx"
      : "https://uat.windcave.com/pxhit/pxhit.aspx";

    // Create HIT XML transaction request
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Txn>
  <PostUsername>${org.windcave_hit_username}</PostUsername>
  <PostPassword>${org.windcave_hit_key}</PostPassword>
  <Amount>${totalAmount.toFixed(2)}</Amount>
  <Currency>${currency}</Currency>
  <TxnType>Purchase</TxnType>
  <MerchantReference>${event.name}-${Date.now()}</MerchantReference>
  <TxnData1>${event.name}</TxnData1>
  <TxnData2>${customerInfo.name}</TxnData2>
  <TxnData3>${customerInfo.email}</TxnData3>
  <Station>${terminalStationId}</Station>
  <EnableTip>0</EnableTip>
  <CardholderPresent>1</CardholderPresent>
  <EnableDukpt>0</EnableDukpt>
</Txn>`;

    console.log("[WINDCAVE-HIT-TERMINAL] Sending HIT transaction request", { baseUrl, station: terminalStationId });

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
    console.log("[WINDCAVE-HIT-TERMINAL] Windcave HIT response", { status: response.status, response: responseText });

    if (!response.ok) {
      throw new Error(`Windcave HIT API error: ${response.status} - ${responseText}`);
    }

    // Parse XML response
    const validMatch = responseText.match(/<valid>(\d+)<\/valid>/);
    const txnRefMatch = responseText.match(/<TxnRef>(.*?)<\/TxnRef>/);
    const sessionIdMatch = responseText.match(/<SessionId>(.*?)<\/SessionId>/);

    if (!validMatch || validMatch[1] !== "1") {
      const errorMatch = responseText.match(/<ResponseText>(.*?)<\/ResponseText>/);
      const errorMessage = errorMatch ? errorMatch[1] : "Unknown error from Windcave HIT API";
      throw new Error(`Windcave HIT API validation failed: ${errorMessage}`);
    }

    const txnRef = txnRefMatch ? txnRefMatch[1] : null;
    const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

    console.log("[WINDCAVE-HIT-TERMINAL] Transaction initiated successfully", { txnRef, sessionId });

    // Create order record
    const orderData = {
      event_id: eventId,
      customer_name: customerInfo.name,
      customer_email: customerInfo.email,
      customer_phone: customerInfo.phone || null,
      total_amount: totalAmount,
      status: "pending",
      windcave_session_id: sessionId || txnRef
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
      ticket_type_id: item.id || item.ticketTypeId,
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

    // Start polling for transaction status
    const pollStatus = async (sessionId: string, attempts = 0): Promise<any> => {
      if (attempts >= 60) { // 5 minutes max polling
        throw new Error("Transaction timeout - please check terminal");
      }

      // Create status request XML
      const statusXml = `<?xml version="1.0" encoding="utf-8"?>
<Status>
  <PostUsername>${org.windcave_hit_username}</PostUsername>
  <PostPassword>${org.windcave_hit_key}</PostPassword>
  <SessionId>${sessionId}</SessionId>
</Status>`;

      const statusResponse = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "User-Agent": "Ticket2LIVE-HIT-Terminal/1.0"
        },
        body: statusXml
      });

      const statusText = await statusResponse.text();
      console.log("[WINDCAVE-HIT-TERMINAL] Status check", { attempt: attempts + 1, response: statusText });

      // Parse status response
      const completeMatch = statusText.match(/<Complete>(\d+)<\/Complete>/);
      const successMatch = statusText.match(/<Success>(\d+)<\/Success>/);
      const dl1Match = statusText.match(/<DL1>(.*?)<\/DL1>/);
      const dl2Match = statusText.match(/<DL2>(.*?)<\/DL2>/);

      const isComplete = completeMatch && completeMatch[1] === "1";
      const isSuccess = successMatch && successMatch[1] === "1";
      const displayLine1 = dl1Match ? dl1Match[1] : "";
      const displayLine2 = dl2Match ? dl2Match[1] : "";

      if (isComplete) {
        // Transaction completed
        const finalStatus = isSuccess ? "completed" : "failed";
        
        // Update order status
        await supabaseClient
          .from("orders")
          .update({ status: finalStatus })
          .eq("id", order.id);

        return {
          success: isSuccess,
          status: finalStatus,
          message: isSuccess ? "Payment completed successfully" : "Payment failed",
          sessionId: sessionId,
          orderId: order.id,
          amount: totalAmount,
          currency: currency,
          displayLine1,
          displayLine2
        };
      } else {
        // Transaction still in progress, continue polling
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        return pollStatus(sessionId, attempts + 1);
      }
    };

    // Start status polling
    if (sessionId) {
      const finalResult = await pollStatus(sessionId);
      return new Response(JSON.stringify(finalResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // No session ID, return immediate response
      return new Response(JSON.stringify({
        success: true,
        status: "initiated",
        message: "HIT terminal transaction initiated successfully",
        txnRef: txnRef,
        orderId: order.id,
        amount: totalAmount,
        currency: currency
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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
