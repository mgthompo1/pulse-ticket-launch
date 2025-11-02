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
    const {
      event_id,
      contact_id,
      items,
      customer_email,
      customer_name,
    } = await req.json();

    console.log("Creating checkout link for:", { event_id, contact_id, items });

    if (!event_id || !items || !customer_email) {
      throw new Error("Missing required parameters");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get event and organization info
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        id,
        name,
        organization_id,
        organizations (
          id,
          name,
          stripe_account_id
        )
      `)
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
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

    // Get ticket type details
    const ticketTypeIds = items.map((item: LineItem) => item.ticket_type_id);
    const { data: ticketTypes, error: ticketTypesError } = await supabase
      .from("ticket_types")
      .select("id, name, price")
      .in("id", ticketTypeIds);

    if (ticketTypesError || !ticketTypes) {
      throw new Error("Failed to fetch ticket types");
    }

    // Build line items for Stripe Checkout
    const lineItems = items.map((item: LineItem) => {
      const ticketType = ticketTypes.find(tt => tt.id === item.ticket_type_id);
      if (!ticketType) throw new Error(`Ticket type ${item.ticket_type_id} not found`);

      return {
        price_data: {
          currency: "nzd",
          product_data: {
            name: ticketType.name,
            description: `${event.name} - ${ticketType.name}`,
          },
          unit_amount: Math.round(ticketType.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customer_email,
      line_items: lineItems,
      success_url: `${req.headers.get("origin") || "https://ticketflo.org"}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin") || "https://ticketflo.org"}/widget/${event_id}`,
      metadata: {
        event_id: event_id,
        contact_id: contact_id || "",
        created_via: "phone_sales",
        customer_name: customer_name || "",
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating checkout link:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create checkout link" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
