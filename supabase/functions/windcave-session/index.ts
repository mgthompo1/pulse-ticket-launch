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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { eventId, items, customerInfo } = await req.json();

    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Missing required parameters: eventId, items");
    }

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
          payment_provider
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    const org = event.organizations;
    if (!org.windcave_enabled || org.payment_provider !== "windcave") {
      throw new Error("Windcave not configured for this organization");
    }

    if (!org.windcave_username || !org.windcave_api_key) {
      throw new Error("Windcave credentials not configured");
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);

    // Windcave API endpoint
    const windcaveEndpoint = org.windcave_endpoint === "SEC" 
      ? "https://sec.windcave.com/api/v1/sessions"
      : "https://uat.windcave.com/api/v1/sessions";

    // Create Windcave session
    const sessionData = {
      type: "purchase",
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "NZD", // Default to NZD, could be configurable
      merchantReference: `event-${eventId}-${Date.now()}`,
      callbackUrls: {
        approved: `${req.headers.get("origin")}/payment-success`,
        declined: `${req.headers.get("origin")}/payment-failed`,
        cancelled: `${req.headers.get("origin")}/payment-cancelled`
      },
      methods: ["card"], // Enable card payments
      expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };

    console.log("Creating Windcave session:", sessionData);

    const windcaveResponse = await fetch(windcaveEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${org.windcave_username}:${org.windcave_api_key}`)}`
      },
      body: JSON.stringify(sessionData)
    });

    const windcaveResult = await windcaveResponse.json();

    if (!windcaveResponse.ok) {
      console.error("Windcave API error:", windcaveResult);
      throw new Error(`Windcave API error: ${windcaveResult.message || "Unknown error"}`);
    }

    console.log("Windcave session created:", windcaveResult);

    // Store the order in the database
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        event_id: eventId,
        customer_name: customerInfo?.name || "Anonymous",
        customer_email: customerInfo?.email || "noemail@example.com",
        customer_phone: customerInfo?.phone || null,
        total_amount: totalAmount,
        status: "pending",
        stripe_session_id: windcaveResult.id // Reusing this field for Windcave session ID
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order record");
    }

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      ticket_type_id: item.id,
      quantity: parseInt(item.quantity),
      unit_price: parseFloat(item.price)
    }));

    const { error: orderItemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      console.error("Error creating order items:", orderItemsError);
      throw new Error("Failed to create order items");
    }

    return new Response(JSON.stringify({
      sessionId: windcaveResult.id,
      redirectUrl: windcaveResult.state === "created" ? windcaveResult.links?.userInterface : null,
      orderId: order.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Windcave session error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});