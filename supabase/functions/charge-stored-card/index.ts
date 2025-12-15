import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LineItem {
  ticket_type_id: string;
  quantity: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Get and validate authentication header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing authentication" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const {
      event_id,
      contact_id,
      items,
      customer_email,
      customer_name,
    } = await req.json();

    console.log("Charging stored card for:", { event_id, contact_id, items });

    if (!event_id || !contact_id || !items || !customer_email) {
      throw new Error("Missing required parameters");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // SECURITY: Validate user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // SECURITY: Verify user has permission to create orders for this event
    const { data: hasEventAccess, error: eventPermError } = await supabase.rpc('check_event_access', {
      p_event_id: event_id,
      p_user_id: user.id
    });

    if (eventPermError) {
      console.error("Event permission check error:", eventPermError);
      throw new Error("Event permission check failed");
    }

    if (!hasEventAccess) {
      return new Response(
        JSON.stringify({ error: "Forbidden - You don't have permission to create orders for this event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    console.log("Authorization successful for user:", user.id);

    // Get contact with payment methods
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, email, payment_methods, organization_id")
      .eq("id", contact_id)
      .single();

    if (contactError || !contact) {
      throw new Error("Contact not found");
    }

    if (!contact.payment_methods?.stripe?.payment_method_id) {
      throw new Error("No payment method on file for this customer");
    }

    // Get event and organization info (including test mode and pricing type for fee tracking)
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        id,
        name,
        organization_id,
        pricing_type,
        organizations (
          id,
          name,
          stripe_account_id,
          stripe_test_mode
        )
      `)
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    // SECURITY: Verify contact belongs to same organization as event
    if (contact.organization_id !== event.organization_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Contact does not belong to this event's organization" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Get payment credentials
    const { data: credentials, error: credError } = await supabase
      .rpc('get_payment_credentials_for_processing', {
        p_organization_id: (event.organizations as any).id
      });

    if (credError || !credentials || credentials.length === 0) {
      throw new Error("Payment credentials not found");
    }

    const stripeSecretKey = credentials[0].stripe_secret_key;
    if (!stripeSecretKey) {
      throw new Error("Stripe not configured for this organization");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get ticket type details and calculate total
    const ticketTypeIds = items.map((item: LineItem) => item.ticket_type_id);
    const { data: ticketTypes, error: ticketTypesError } = await supabase
      .from("ticket_types")
      .select("id, name, price")
      .in("id", ticketTypeIds);

    if (ticketTypesError || !ticketTypes) {
      throw new Error("Failed to fetch ticket types");
    }

    let totalAmount = 0;
    const lineItems = items.map((item: LineItem) => {
      const ticketType = ticketTypes.find(tt => tt.id === item.ticket_type_id);
      if (!ticketType) throw new Error(`Ticket type ${item.ticket_type_id} not found`);

      const itemTotal = ticketType.price * item.quantity;
      totalAmount += itemTotal;

      return {
        ticket_type_id: ticketType.id,
        name: ticketType.name,
        price: ticketType.price,
        quantity: item.quantity,
        total: itemTotal,
      };
    });

    console.log("Total amount to charge:", totalAmount);

    // Create payment intent with stored payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "nzd",
      customer: contact.payment_methods.stripe.customer_id,
      payment_method: contact.payment_methods.stripe.payment_method_id,
      off_session: true,
      confirm: true,
      description: `${event.name} - Phone Sales Order`,
      metadata: {
        event_id: event_id,
        contact_id: contact_id,
        created_via: "phone_sales_direct_charge",
        customer_name: customer_name || "",
      },
    });

    console.log("Payment intent created:", paymentIntent.id, paymentIntent.status);

    if (paymentIntent.status !== "succeeded") {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        event_id: event_id,
        customer_email: customer_email,
        customer_name: customer_name,
        total_amount: totalAmount,
        status: "paid",
        stripe_payment_intent_id: paymentIntent.id,
        payment_method: "stripe",
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error("Failed to create order");
    }

    console.log("Order created:", order.id);

    // Link contact to order
    const { error: contactEventError } = await supabase
      .from("contact_events")
      .insert({
        contact_id: contact_id,
        event_id: event_id,
        order_id: order.id,
      });

    if (contactEventError) {
      console.error("Error linking contact to event:", contactEventError);
    }

    // Create tickets for each line item
    for (const item of items) {
      const ticketsToCreate = [];
      for (let i = 0; i < item.quantity; i++) {
        ticketsToCreate.push({
          event_id: event_id,
          ticket_type_id: item.ticket_type_id,
          order_id: order.id,
          status: "valid",
          qr_code: crypto.randomUUID(),
        });
      }

      const { error: ticketsError } = await supabase
        .from("tickets")
        .insert(ticketsToCreate);

      if (ticketsError) {
        console.error("Error creating tickets:", ticketsError);
        throw new Error("Failed to create tickets");
      }
    }

    // Track usage for billing
    // Skip tracking for test mode and free events
    const isTestMode = (event.organizations as any)?.stripe_test_mode === true;
    const isFreeEvent = event.pricing_type === 'free';

    console.log("📊 Usage tracking context - Test mode:", isTestMode, "Free event:", isFreeEvent, "Amount:", totalAmount);

    const { error: trackingError } = await supabase.functions.invoke('track-usage', {
      body: {
        order_id: order.id,
        organization_id: (event.organizations as any).id,
        transaction_amount: totalAmount,
        is_test_mode: isTestMode,
        is_free_event: isFreeEvent
      }
    });

    if (trackingError) {
      console.error("Error tracking usage:", trackingError);
    }

    console.log("Payment successful, order created");

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        payment_intent_id: paymentIntent.id,
        total_amount: totalAmount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error charging stored card:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to charge card" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
