
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

    // Correct HIT API endpoint
    const baseUrl = org.windcave_endpoint === "SEC" 
      ? "https://sec.windcave.com/hit/pos.aspx"
      : "https://uat.windcave.com/hit/pos.aspx";

    // Generate unique transaction reference
    const txnRef = `${event.name.replace(/\s+/g, '')}-${Date.now()}`;

    // Create proper HIT XML request using Scr format
    const xmlRequest = `<Scr action="doScrHIT" user="${org.windcave_hit_username}" key="${org.windcave_hit_key}">
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
      response: responseText.substring(0, 500) // Log first 500 chars to avoid huge logs
    });

    if (!response.ok) {
      throw new Error(`Windcave HIT API error: ${response.status} - ${responseText}`);
    }

    // Parse XML response for initial validation
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseText, "text/xml");
    const errorElement = xmlDoc.querySelector("parsererror");
    
    if (errorElement) {
      throw new Error(`Invalid XML response from Windcave: ${errorElement.textContent}`);
    }

    // Check for error response
    const errorMsg = xmlDoc.querySelector("ErrorMsg");
    if (errorMsg) {
      throw new Error(`Windcave HIT error: ${errorMsg.textContent}`);
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
    const pollStatus = async (txnRef: string, attempts = 0): Promise<any> => {
      if (attempts >= 60) { // 5 minutes max polling
        throw new Error("Transaction timeout - please check terminal");
      }

      // Create status request XML using Scr format
      const statusXml = `<Scr action="getStatus" user="${org.windcave_hit_username}" key="${org.windcave_hit_key}">
    <TxnRef>${txnRef}</TxnRef>
</Scr>`;

      const statusResponse = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "User-Agent": "Ticket2LIVE-HIT-Terminal/1.0"
        },
        body: statusXml
      });

      const statusText = await statusResponse.text();
      console.log("[WINDCAVE-HIT-TERMINAL] Status check", { 
        attempt: attempts + 1, 
        response: statusText.substring(0, 300) 
      });

      // Parse status response
      const statusParser = new DOMParser();
      const statusDoc = statusParser.parseFromString(statusText, "text/xml");
      
      const complete = statusDoc.querySelector("Complete")?.textContent;
      const success = statusDoc.querySelector("Success")?.textContent;
      const dl1 = statusDoc.querySelector("DL1")?.textContent || "";
      const dl2 = statusDoc.querySelector("DL2")?.textContent || "";
      const responseText = statusDoc.querySelector("ResponseText")?.textContent || "";

      const isComplete = complete === "1";
      const isSuccess = success === "1";

      if (isComplete) {
        // Transaction completed
        const finalStatus = isSuccess ? "completed" : "failed";
        
        // Update order status
        await supabaseClient
          .from("orders")
          .update({ status: finalStatus })
          .eq("id", order.id);

        console.log("[WINDCAVE-HIT-TERMINAL] Transaction completed", { 
          txnRef, 
          success: isSuccess, 
          responseText 
        });

        return {
          success: isSuccess,
          status: finalStatus,
          message: isSuccess ? "Payment completed successfully" : `Payment failed: ${responseText}`,
          txnRef: txnRef,
          orderId: order.id,
          amount: totalAmount,
          currency: currency,
          displayLine1: dl1,
          displayLine2: dl2,
          responseText: responseText
        };
      } else {
        // Transaction still in progress, continue polling
        console.log("[WINDCAVE-HIT-TERMINAL] Transaction in progress", { 
          txnRef, 
          dl1, 
          dl2, 
          attempt: attempts + 1 
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        return pollStatus(txnRef, attempts + 1);
      }
    };

    // Start status polling for the transaction
    const finalResult = await pollStatus(txnRef);
    
    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

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

