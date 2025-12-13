import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetTicketsRequest {
  orderId: string;
  email: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, email }: GetTicketsRequest = await req.json();

    if (!orderId || !email) {
      return new Response(
        JSON.stringify({ error: "Order ID and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS - we do our own validation
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Step 1: Verify the order exists and email matches (case-insensitive)
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        customer_email,
        customer_name,
        total_amount,
        status,
        events!inner(
          id,
          name,
          ticket_delivery_method,
          event_date,
          venue,
          description,
          logo_url,
          organizations(id, name, logo_url)
        )
      `)
      .eq("id", orderId)
      .ilike("customer_email", email)
      .single();

    if (orderError || !orderData) {
      console.log("Order verification failed:", { orderId, email, error: orderError });
      return new Response(
        JSON.stringify({ error: "Order not found or email does not match" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Check if this is a confirmation-only event
    if (orderData.events?.ticket_delivery_method === "confirmation_email") {
      return new Response(
        JSON.stringify({
          order: orderData,
          tickets: [],
          isConfirmationOnly: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Get order items for this specific order
    const { data: orderItems, error: orderItemsError } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", orderId);

    if (orderItemsError || !orderItems || orderItems.length === 0) {
      return new Response(
        JSON.stringify({
          order: orderData,
          tickets: [],
          error: "No order items found"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderItemIds = orderItems.map(item => item.id);

    // Step 4: Get tickets for these specific order items only
    const { data: ticketsData, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id,
        ticket_code,
        status,
        checked_in,
        attendee_name,
        attendee_email,
        order_item_id,
        order_items!inner (
          id,
          order_id,
          ticket_type_id,
          quantity,
          unit_price,
          ticket_types (
            id,
            name,
            price,
            description
          ),
          orders!inner (
            id,
            customer_name,
            customer_email,
            event_id,
            events (
              id,
              name,
              event_date,
              venue,
              description,
              logo_url,
              organizations (
                id,
                name,
                logo_url
              )
            )
          )
        )
      `)
      .in("order_item_id", orderItemIds);

    if (ticketsError) {
      console.error("Error loading tickets:", ticketsError);
      return new Response(
        JSON.stringify({ error: "Failed to load tickets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        order: orderData,
        tickets: ticketsData || [],
        isConfirmationOnly: false
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-public-tickets:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
