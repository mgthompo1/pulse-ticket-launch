
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

    // Determine API endpoint based on environment
    const baseUrl = org.windcave_endpoint === "SEC" 
      ? "https://sec.windcave.com/pxaccess/pxpay.aspx"
      : "https://uat.windcave.com/pxaccess/pxpay.aspx";

    // Create HIT XML request
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<GenerateRequest>
  <PxPayUserId>${org.windcave_hit_username}</PxPayUserId>
  <PxPayKey>${org.windcave_hit_key}</PxPayKey>
  <AmountInput>${totalAmount.toFixed(2)}</AmountInput>
  <CurrencyInput>${currency}</CurrencyInput>
  <MerchantReference>${event.name}-${Date.now()}</MerchantReference>
  <EmailAddress>${customerInfo.email || ''}</EmailAddress>
  <TxnData1>${event.name}</TxnData1>
  <TxnData2>${customerInfo.name}</TxnData2>
  <TxnData3>${customerInfo.email}</TxnData3>
  <TxnType>Purchase</TxnType>
  <UrlSuccess>${Deno.env.get("SUPABASE_URL")}/functions/v1/windcave-dropin-success</UrlSuccess>
  <UrlFail>${Deno.env.get("SUPABASE_URL")}/functions/v1/windcave-payment-status</UrlFail>
  <BillingId>${terminalStationId}</BillingId>
  <EnableAddBillCard>0</EnableAddBillCard>
  <Opt>TO</Opt>
</GenerateRequest>`;

    console.log("[WINDCAVE-HIT-TERMINAL] Sending HIT request", { baseUrl });

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
    console.log("[WINDCAVE-HIT-TERMINAL] Windcave response", { status: response.status, response: responseText });

    if (!response.ok) {
      throw new Error(`Windcave API error: ${response.status} - ${responseText}`);
    }

    // Parse XML response
    const urlMatch = responseText.match(/<URI>(.*?)<\/URI>/);
    const validMatch = responseText.match(/<valid>(\d+)<\/valid>/);

    if (!urlMatch || !validMatch || validMatch[1] !== "1") {
      throw new Error("Invalid response from Windcave HIT API");
    }

    const redirectUrl = urlMatch[1];

    // Create order record
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

    return new Response(JSON.stringify({
      success: true,
      redirectUrl: redirectUrl,
      orderId: order.id,
      amount: totalAmount,
      currency: currency,
      message: "HIT terminal transaction initiated successfully"
    }), {
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
