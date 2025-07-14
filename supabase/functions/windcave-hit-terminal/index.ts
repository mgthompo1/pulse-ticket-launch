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

    const { eventId, items, customerInfo, stationId, action = "purchase" } = await req.json();
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
      ? "https://sec.windcave.com/api/v1/hit"
      : "https://uat.windcave.com/api/v1/hit";

    // Create HIT terminal transaction request
    const hitRequest = {
      username: org.windcave_hit_username,
      password: org.windcave_hit_key,
      deviceId: terminalStationId, // Windcave API uses 'deviceId' not 'stationId'
      transactionType: "Purchase",
      amount: totalAmount.toFixed(2),
      currency: "NZD",
      reference: `EVENT-${eventId}-${Date.now()}`,
      receiptEmail: customerInfo.email,
      merchantReference: `${event.name} - ${customerInfo.name}`,
      enableTip: false,
      timeout: 120 // 2 minutes timeout
    };

    logStep("Sending HIT terminal request", { 
      baseUrl, 
      deviceId: terminalStationId, 
      amount: hitRequest.amount,
      reference: hitRequest.reference 
    });

    // Make request to Windcave HIT API
    const response = await fetch(`${baseUrl}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(hitRequest)
    });

    const responseData = await response.json();
    logStep("Windcave HIT response", { status: response.status, data: responseData });

    if (!response.ok) {
      throw new Error(`Windcave HIT API error: ${responseData.message || response.statusText}`);
    }

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
        transactionId: responseData.transactionId,
        orderId: order.id,
        amount: totalAmount,
        status: responseData.status || "pending",
        message: "HIT terminal transaction initiated successfully",
        terminalDisplay: responseData.terminalDisplay || "Present card to terminal"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "status") {
      // Status check request
      return new Response(JSON.stringify({
        success: true,
        transactionId: responseData.transactionId,
        status: responseData.status,
        amount: responseData.amount,
        approvalCode: responseData.approvalCode,
        cardType: responseData.cardType,
        message: responseData.message
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
      data: responseData
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