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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { eventId, items, customerInfo } = await req.json();

    console.log("=== FREE REGISTRATION REQUEST ===");
    console.log("Event ID:", eventId);
    console.log("Items:", JSON.stringify(items, null, 2));
    console.log("Customer Info:", JSON.stringify(customerInfo, null, 2));

    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Missing required parameters: eventId, items");
    }

    if (!customerInfo?.name || !customerInfo?.email) {
      throw new Error("Missing required customer information: name, email");
    }

    // Verify the event exists and is a free event
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("id, name, pricing_type, organization_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    if (event.pricing_type !== 'free') {
      throw new Error("This event requires payment. Please use the regular checkout.");
    }

    // Create the order with status 'confirmed' (no payment needed)
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        event_id: eventId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone || null,
        total_amount: 0,
        status: "confirmed", // Free registrations are immediately confirmed
        custom_answers: customerInfo.customAnswers || {},
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create registration");
    }

    console.log("Order created:", order.id);

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      ticket_type_id: item.ticket_type_id || item.id,
      item_type: 'ticket',
      quantity: parseInt(item.quantity),
      unit_price: 0, // Free
    }));

    const { error: orderItemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      console.error("Error creating order items:", orderItemsError);
      throw new Error("Failed to create registration items");
    }

    // Create tickets for the registration
    const ticketsToCreate = [];
    for (const item of items) {
      for (let i = 0; i < parseInt(item.quantity); i++) {
        ticketsToCreate.push({
          order_id: order.id,
          ticket_type_id: item.ticket_type_id || item.id,
          status: "active",
          attendee_name: customerInfo.name,
          attendee_email: customerInfo.email,
        });
      }
    }

    const { data: tickets, error: ticketsError } = await supabaseClient
      .from("tickets")
      .insert(ticketsToCreate)
      .select();

    if (ticketsError) {
      console.error("Error creating tickets:", ticketsError);
      throw new Error("Failed to create tickets");
    }

    console.log("Created", tickets.length, "tickets");

    // Update ticket type sold quantities
    for (const item of items) {
      const ticketTypeId = item.ticket_type_id || item.id;
      const quantity = parseInt(item.quantity);

      await supabaseClient.rpc('increment_ticket_sold', {
        p_ticket_type_id: ticketTypeId,
        p_quantity: quantity
      });
    }

    // Send confirmation email
    try {
      await supabaseClient.functions.invoke('send-tickets', {
        body: {
          orderId: order.id,
          eventId: eventId,
          customerEmail: customerInfo.email,
          customerName: customerInfo.name,
        }
      });
      console.log("Confirmation email sent");
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the registration if email fails
    }

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      message: "Registration confirmed! Check your email for confirmation.",
      ticketCount: tickets.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Free registration error:", error);
    return new Response(JSON.stringify({
      error: error.message,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
