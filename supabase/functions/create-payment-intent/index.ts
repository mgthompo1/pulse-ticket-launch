import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

    const { eventId, items, tickets, customerInfo } = await req.json();
    
    // Handle both new items format and legacy tickets format
    const ticketItems = items || tickets;

    // Get event and organization details
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        *,
        organizations!inner(
          id,
          name,
          stripe_account_id,
          stripe_onboarding_complete
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    if (!event.organizations.stripe_account_id || !event.organizations.stripe_onboarding_complete) {
      throw new Error("Organization Stripe account not set up");
    }

    // Get ticket types - filter only ticket items
    const ticketOnlyItems = ticketItems.filter((item: any) => 
      item.type === 'ticket' || item.ticketTypeId
    );
    
    if (ticketOnlyItems.length === 0) {
      throw new Error("No ticket items found in order");
    }
    
    const ticketIds = ticketOnlyItems.map((t: any) => t.ticketTypeId);
    const { data: ticketTypes, error: ticketError } = await supabaseClient
      .from("ticket_types")
      .select("*")
      .in("id", ticketIds);

    if (ticketError || !ticketTypes) {
      throw new Error("Ticket types not found");
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = ticketOnlyItems.map((ticket: any) => {
      const ticketType = ticketTypes.find(t => t.id === ticket.ticketTypeId);
      if (!ticketType) throw new Error(`Ticket type ${ticket.ticketTypeId} not found`);
      
      const itemTotal = ticketType.price * ticket.quantity;
      subtotal += itemTotal;
      
      return {
        ticket_type_id: ticket.ticketTypeId,
        quantity: ticket.quantity,
        unit_price: ticketType.price,
      };
    });

    // Calculate platform fee (1% + $0.50 per ticket)
    const totalTickets = ticketOnlyItems.reduce((sum: number, ticket: any) => sum + ticket.quantity, 0);
    const platformFeePercent = Math.round(subtotal * 0.01); // 1%
    const platformFeeFixed = totalTickets * 50; // $0.50 per ticket in cents
    const platformFee = platformFeePercent + platformFeeFixed;
    const total = subtotal + platformFee;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create payment intent with Stripe Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      application_fee_amount: platformFee,
      transfer_data: {
        destination: event.organizations.stripe_account_id,
      },
      metadata: {
        event_id: eventId,
        organization_id: event.organizations.id,
        customer_email: customerInfo.email,
        customer_name: customerInfo.name,
      },
    });

    // Create order record
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        event_id: eventId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        total_amount: total,
        platform_fee: platformFee,
        stripe_payment_intent_id: paymentIntent.id,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error("Failed to create order");
    }

    // Create order items
    const orderItemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }));

    await supabaseClient
      .from("order_items")
      .insert(orderItemsWithOrderId);

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});