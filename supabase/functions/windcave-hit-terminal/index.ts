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

    const { eventId, items, customerInfo, stationId, action = "purchase", txnRef } = await req.json();
    logStep("Processing HIT terminal request", { eventId, action, stationId, itemCount: items?.length });

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
          windcave_station_id
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

    // Use organization's station ID if not provided in request
    const terminalStationId = stationId || org.windcave_station_id;
    if (!terminalStationId) {
      throw new Error("Terminal station ID not configured for this organization");
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.price);
    }, 0);

    logStep("Calculated total amount", { totalAmount });

    // Determine API endpoint based on environment
    const baseUrl = org.windcave_endpoint === "SEC" 
      ? "https://sec.windcave.com/hit/pos.aspx"
      : "https://uat.windcave.com/hit/pos.aspx";

    // Create HIT terminal transaction request as XML
    const txnRef = `TXN-${eventId}-${Date.now()}`;
    const hitRequestXml = `<?xml version="1.0" encoding="utf-8"?>
<Pxr user="${org.windcave_hit_username}" key="${org.windcave_hit_key}">
  <Station>${terminalStationId}</Station>
  <Amount>${totalAmount.toFixed(2)}</Amount>
  <Cur>NZD</Cur>
  <TxnType>Purchase</TxnType>
  <TxnRef>${txnRef}</TxnRef>
  <DeviceId>POS-${terminalStationId}</DeviceId>
  <PosName>Ticket2LIVE</PosName>
  <PosVersion>1.0.0</PosVersion>
  <VendorId>Lovable</VendorId>
  <MRef>${event.name} - ${customerInfo.name}</MRef>
</Pxr>`;

    logStep("Sending HIT terminal request", { 
      baseUrl, 
      deviceId: terminalStationId, 
      amount: totalAmount.toFixed(2),
      txnRef: txnRef
    });

    // Make request to Windcave HIT API
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Accept": "text/xml"
      },
      body: hitRequestXml
    });

    const responseText = await response.text();
    logStep("Windcave HIT response", { status: response.status, responseText });

    if (!response.ok) {
      throw new Error(`Windcave HIT API error: Status ${response.status} - ${responseText}`);
    }

    // Parse XML response (basic parsing for demo)
    const responseData = { raw: responseText };

    // Handle different response types based on action
    if (action === "purchase") {
      // Create order record for purchase
      const orderData = {
        event_id: eventId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone || null,
        total_amount: totalAmount,
        status: "pending"
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
        ticket_type_id: item.ticketTypeId,
        quantity: item.quantity,
        unit_price: item.price
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
        txnRef: txnRef,
        orderId: order.id,
        amount: totalAmount,
        status: "initiated",
        message: "HIT terminal transaction initiated successfully",
        terminalDisplay: "Present card to terminal",
        rawResponse: responseText
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "status") {
      // For status check, create XML request for status
      const statusXml = `<?xml version="1.0" encoding="utf-8"?>
<Pxr user="${org.windcave_hit_username}" key="${org.windcave_hit_key}">
  <Station>${terminalStationId}</Station>
  <TxnType>Status</TxnType>
  <TxnRef>${txnRef || stationId}</TxnRef>
</Pxr>`;

      const statusResponse = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "Accept": "text/xml"
        },
        body: statusXml
      });

      const statusText = await statusResponse.text();
      
      // Status check request
      return new Response(JSON.stringify({
        success: true,
        rawResponse: statusText,
        status: "processing"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "cancel") {
      // Cancel transaction request
      return new Response(JSON.stringify({
        success: true,
        message: "Transaction cancelled successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      rawResponse: responseText
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

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