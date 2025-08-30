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
    const { action, ...data } = await req.json();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (action) {
      case "create_payment_intent":
        const { amount, eventId, items, customerInfo } = data;
        
        // Get organization currency from the database
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select(`
            id,
            organizations!inner(
              currency
            )
          `)
          .eq("id", eventId)
          .single();
          
        if (eventError || !eventData) {
          throw new Error("Event not found or organization currency not configured");
        }
        
        const currency = eventData.organizations.currency?.toLowerCase() || "usd";
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          payment_method_types: ["card_present"],
          capture_method: "automatic",
          metadata: {
            event_id: eventId,
            items: JSON.stringify(items),
            customer_name: customerInfo.name || "",
            customer_email: customerInfo.email || "",
          },
        });

        return new Response(
          JSON.stringify({ 
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "confirm_payment":
        const { paymentIntentId, posTransactionData } = data;
        
        // Retrieve payment intent to confirm it was successful
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (intent.status === "succeeded") {
          // Record POS transaction
          const { error } = await supabase
            .from("pos_transactions")
            .insert({
              ...posTransactionData,
              stripe_payment_intent_id: paymentIntentId,
              status: "completed",
            });

          if (error) throw error;

          return new Response(
            JSON.stringify({ success: true, transaction: intent }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, status: intent.status }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

      case "list_readers":
        const readers = await stripe.terminal.readers.list();
        return new Response(
          JSON.stringify({ readers: readers.data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "create_connection_token":
        const connectionToken = await stripe.terminal.connectionTokens.create();
        return new Response(
          JSON.stringify({ secret: connectionToken.secret }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Stripe Terminal Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});