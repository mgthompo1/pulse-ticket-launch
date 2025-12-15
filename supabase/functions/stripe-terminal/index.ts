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
        
        const currency = (eventData.organizations as any)?.currency?.toLowerCase() || "usd";
        
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
          const { data: posTransaction, error } = await supabase
            .from("pos_transactions")
            .insert({
              ...posTransactionData,
              stripe_payment_intent_id: paymentIntentId,
              status: "completed",
            })
            .select()
            .single();

          if (error) throw error;

          // Track usage for billing (platform fees)
          // Skip tracking for test mode and free events
          try {
            if (posTransaction?.event_id && posTransaction?.total_amount) {
              console.log("Tracking usage for POS transaction billing...");

              // Get organization_id, pricing_type, and test mode from event
              const { data: eventData, error: eventError } = await supabase
                .from("events")
                .select(`
                  organization_id,
                  pricing_type,
                  organizations (
                    stripe_test_mode
                  )
                `)
                .eq("id", posTransaction.event_id)
                .single();

              if (!eventError && eventData?.organization_id) {
                const isTestMode = (eventData as any)?.organizations?.stripe_test_mode === true;
                const isFreeEvent = eventData.pricing_type === 'free';

                console.log("📊 Usage tracking context - Test mode:", isTestMode, "Free event:", isFreeEvent, "Amount:", posTransaction.total_amount);

                const { error: trackingError } = await supabase.functions.invoke('track-usage', {
                  body: {
                    order_id: posTransaction.id, // Use POS transaction ID as order_id
                    organization_id: eventData.organization_id,
                    transaction_amount: posTransaction.total_amount,
                    is_test_mode: isTestMode,
                    is_free_event: isFreeEvent
                  }
                });

                if (trackingError) {
                  console.error("❌ Error tracking usage for billing:", trackingError);
                } else {
                  console.log("✅ Usage tracked successfully for billing");
                }
              }
            }
          } catch (usageTrackingError) {
            console.error("❌ Usage tracking error:", usageTrackingError);
            // Don't fail the whole process for usage tracking issues
          }

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