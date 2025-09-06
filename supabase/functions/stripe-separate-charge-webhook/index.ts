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

    // Only handle payment_intent.succeeded events
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      
      console.log("=== PROCESSING PAYMENT SUCCESS ===");
      console.log("Payment Intent ID:", paymentIntent.id);
      console.log("Metadata:", paymentIntent.metadata);

      // Check if this payment uses booking fees
      if (paymentIntent.metadata?.useBookingFees === 'true') {
        console.log("=== PROCESSING BOOKING FEES ===");
        
        const orderId = paymentIntent.metadata?.orderId;
        const ticketAmount = parseInt(paymentIntent.metadata?.ticketAmount || '0');
        const bookingFeeAmount = parseInt(paymentIntent.metadata?.bookingFeeAmount || '0');
        
        if (!orderId) {
          throw new Error("Order ID missing from payment metadata");
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

        const stripeAccountId = order.events?.organizations?.stripe_account_id;
        if (!stripeAccountId) {
          throw new Error("Stripe account ID not configured for organization");
        }

        console.log("=== CREATING SEPARATE CHARGES ===");
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

        // Update order status
        const { error: updateError } = await supabaseClient
          .from('orders')
          .update({
            status: 'completed',
            payment_status: 'paid'
          })
          .eq('id', orderId);

        if (updateError) {
          console.error("Error updating order status:", updateError);
        }

        console.log("=== BOOKING FEE PROCESSING COMPLETED ===");
      } else {
        console.log("=== STANDARD PAYMENT (NO BOOKING FEES) ===");
        // Handle standard payment processing if needed
      }
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