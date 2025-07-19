import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== FUNCTION STARTED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== PARSING REQUEST ===");
    const requestBody = await req.json();
    console.log("Request body received");
    
    const { eventId, items, tickets, customerInfo } = requestBody;
    console.log("Event ID:", eventId);
    
    // Handle both new items format and legacy tickets format
    const ticketItems = items || tickets;
    console.log("Ticket items count:", ticketItems?.length);

    console.log("=== CREATING SUPABASE CLIENT ===");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    console.log("Supabase client created");

    console.log("=== FETCHING EVENT DATA ===");
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        *,
        organizations!inner(
          id,
          name,
          stripe_account_id,
          stripe_secret_key,
          stripe_onboarding_complete
        )
      `)
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      console.error("Event fetch error:", eventError);
      throw new Error(`Failed to fetch event: ${eventError.message}`);
    }
    
    if (!event) {
      console.error("Event not found for ID:", eventId);
      throw new Error("Event not found");
    }
    
    console.log("Event found:", event.name);
    console.log("Organization:", event.organizations.name);

    console.log("=== VALIDATING STRIPE CONFIGURATION ===");
    if (!event.organizations.stripe_secret_key) {
      console.error("No Stripe secret key configured for organization");
      throw new Error("Organization Stripe secret key not configured");
    }
    console.log("Stripe secret key configured");

    // Get ticket types - filter only ticket items
    const ticketOnlyItems = ticketItems.filter((item: any) => 
      item.type === 'ticket' || item.ticketTypeId
    );
    
    if (ticketOnlyItems.length === 0) {
      throw new Error("No ticket items found in order");
    }
    
    console.log("=== FETCHING TICKET TYPES ===");
    const ticketIds = ticketOnlyItems.map((t: any) => t.ticketTypeId);
    const { data: ticketTypes, error: ticketError } = await supabaseClient
      .from("ticket_types")
      .select("*")
      .in("id", ticketIds);

    if (ticketError) {
      console.error("Ticket types fetch error:", ticketError);
      throw new Error(`Failed to fetch ticket types: ${ticketError.message}`);
    }
    
    if (!ticketTypes || ticketTypes.length === 0) {
      throw new Error("Ticket types not found");
    }
    
    console.log("Ticket types found:", ticketTypes.length);

    console.log("=== CALCULATING TOTALS ===");
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
    
    console.log("Subtotal:", subtotal, "Platform fee:", platformFee, "Total:", total);

    console.log("=== CREATING STRIPE CLIENT ===");
    const stripe = new Stripe(event.organizations.stripe_secret_key, {
      apiVersion: "2023-10-16",
    });
    console.log("Stripe client created");

    console.log("=== CREATING PAYMENT INTENT ===");
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
    console.log("Payment intent created:", paymentIntent.id);

    console.log("=== CREATING ORDER ===");
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        event_id: eventId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        total_amount: total,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }
    
    console.log("Order created:", order.id);

    console.log("=== CREATING ORDER ITEMS ===");
    const orderItemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: orderItemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItemsWithOrderId);
      
    if (orderItemsError) {
      console.error("Order items creation error:", orderItemsError);
      throw new Error(`Failed to create order items: ${orderItemsError.message}`);
    }
    
    console.log("Order items created");

    console.log("=== SUCCESS ===");
    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("=== ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error details:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});