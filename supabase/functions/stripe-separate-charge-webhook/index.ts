import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== STRIPE SEPARATE CHARGE WEBHOOK STARTED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const Stripe = await import("https://esm.sh/stripe@14.21.0");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get webhook signature and body
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    if (!signature) {
      throw new Error("Missing Stripe signature");
    }

    // Get the webhook endpoint secret
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("Webhook secret not configured");
    }

    // Initialize Stripe with platform secret key for webhook verification
    const stripe = new Stripe.default(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log("=== WEBHOOK EVENT RECEIVED ===");
    console.log("Event type:", event.type);
    console.log("Event ID:", event.id);

    // Handle payment_intent.succeeded events for separate charges
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      
      console.log("=== PROCESSING PAYMENT INTENT SUCCEEDED ===");
      console.log("Payment Intent ID:", paymentIntent.id);
      console.log("Metadata:", paymentIntent.metadata);

      // Check if this payment intent uses booking fees
      const shouldProcessBookingFees = paymentIntent.metadata?.useBookingFees === 'true';
      const orderId = paymentIntent.metadata?.orderId;
      
      console.log("=== PAYMENT INTENT METADATA DEBUG ===");
      console.log("Payment Intent ID:", paymentIntent.id);
      console.log("Metadata keys:", Object.keys(paymentIntent.metadata || {}));
      console.log("Full metadata:", paymentIntent.metadata);
      console.log("useBookingFees flag:", paymentIntent.metadata?.useBookingFees);
      console.log("Order ID:", orderId);
      
      if (orderId) {
        if (shouldProcessBookingFees) {
          console.log("=== PROCESSING BOOKING FEES FROM PAYMENT INTENT ===");
        } else {
          console.log("=== PROCESSING STANDARD PAYMENT FROM PAYMENT INTENT ===");
        }
        
        let ticketAmount = parseInt(paymentIntent.metadata?.ticketAmount || '0');
        let bookingFeeAmount = parseInt(paymentIntent.metadata?.bookingFeeAmount || '0');
        
        if (!orderId) {
          throw new Error("Order ID missing from payment intent metadata");
        }

        // Get order details to find the organization
        const { data: order, error: orderError } = await supabaseClient
          .from('orders')
          .select(`
            *,
            events (
              organization_id,
              organizations (
                stripe_account_id
              )
            )
          `)
          .eq('id', orderId)
          .single();

        if (orderError || !order) {
          throw new Error("Order not found");
        }

        const stripeAccountId = (order.events?.organizations as any)?.stripe_account_id;
        
        if (!stripeAccountId) {
          throw new Error("Stripe account ID not configured for organization");
        }

        // Only create separate charges for booking fee scenarios
        if (shouldProcessBookingFees) {
          console.log("=== CREATING SEPARATE CHARGES FROM PAYMENT INTENT ===");
          console.log("Ticket amount:", ticketAmount, "cents");
          console.log("Booking fee amount:", bookingFeeAmount, "cents");
          console.log("Connected account:", stripeAccountId);
          
          // Create separate charge for ticket amount to connected account
          if (ticketAmount > 0) {
            const ticketCharge = await stripe.charges.create({
              amount: ticketAmount,
              currency: paymentIntent.currency,
              source: paymentIntent.payment_method,
              description: `Ticket payment for order ${orderId}`,
              metadata: {
                orderId: orderId,
                chargeType: 'tickets'
              }
            }, {
              stripeAccount: stripeAccountId
            });

            console.log("Ticket charge created:", ticketCharge.id);
          }

          // Booking fee stays with the platform (no separate charge needed)
          console.log("Booking fee retained by platform:", bookingFeeAmount, "cents");
        } else {
          console.log("=== STANDARD PAYMENT - NO SEPARATE CHARGES NEEDED ===");
        }

        // Get payment method details
        let paymentMethodUpdate = {};
        if (paymentIntent.payment_method) {
          const pmId = typeof paymentIntent.payment_method === 'string' 
            ? paymentIntent.payment_method 
            : paymentIntent.payment_method.id;
          
          try {
            const paymentMethod = await stripe.paymentMethods.retrieve(pmId);
            
            if (paymentMethod.card) {
              paymentMethodUpdate = {
                payment_method_type: 'card',
                card_last_four: paymentMethod.card.last4,
                card_brand: paymentMethod.card.brand,
                payment_method_id: pmId
              };
              console.log("Payment method details retrieved:", paymentMethodUpdate);
            } else if (paymentMethod.type) {
              paymentMethodUpdate = {
                payment_method_type: paymentMethod.type,
                payment_method_id: pmId
              };
              console.log("Non-card payment method retrieved:", paymentMethodUpdate);
            }
          } catch (error) {
            console.error("Failed to fetch payment method details:", error.message);
          }
        }

        // Update order status - different fields for booking fees vs standard payments
        let updateData = {
          status: 'completed',
          payment_status: 'paid',
          stripe_payment_intent_id: paymentIntent.id,
          ...paymentMethodUpdate
        };

        if (shouldProcessBookingFees) {
          updateData = {
            ...updateData,
            ...({ booking_fee_amount: bookingFeeAmount / 100 } as any), // Convert from cents to dollars
            booking_fee_enabled: true,
            subtotal_amount: ticketAmount / 100, // Convert from cents to dollars
          };
        }

        const { error: updateError } = await supabaseClient
          .from('orders')
          .update(updateData)
          .eq('id', orderId);

        if (updateError) {
          console.error("Error updating order status:", updateError);
        }

        console.log(shouldProcessBookingFees 
          ? "=== BOOKING FEE PROCESSING COMPLETED FROM PAYMENT INTENT ===" 
          : "=== STANDARD PAYMENT PROCESSING COMPLETED FROM PAYMENT INTENT ==="
        );
      }
      
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      console.log(`=== UNHANDLED EVENT TYPE: ${event.type} ===`);
      console.log("Event will be acknowledged but not processed");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== WEBHOOK ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});