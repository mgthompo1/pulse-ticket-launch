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

      // Check if this payment uses booking fees (either from metadata or by checking the order)
      const shouldProcessBookingFees = paymentIntent.metadata?.useBookingFees === 'true';
      const orderId = paymentIntent.metadata?.orderId;
      
      console.log("=== PAYMENT INTENT METADATA DEBUG ===");
      console.log("Payment Intent ID:", paymentIntent.id);
      console.log("Metadata keys:", Object.keys(paymentIntent.metadata || {}));
      console.log("Full metadata:", paymentIntent.metadata);
      console.log("useBookingFees flag:", paymentIntent.metadata?.useBookingFees);
      console.log("Order ID:", orderId);
      
      // If no explicit booking fee flag, check if we can determine from order
      let checkOrderForBookingFees = false;
      if (!shouldProcessBookingFees && orderId) {
        console.log("=== CHECKING ORDER FOR BOOKING FEE SETTINGS ===");
        checkOrderForBookingFees = true;
      }
      
      if (shouldProcessBookingFees || checkOrderForBookingFees) {
        console.log("=== PROCESSING BOOKING FEES ===");
        
        let ticketAmount = parseInt(paymentIntent.metadata?.ticketAmount || '0');
        let bookingFeeAmount = parseInt(paymentIntent.metadata?.bookingFeeAmount || '0');
        
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
        const orgBookingFeesEnabled = order.events?.organizations?.stripe_booking_fee_enabled;
        
        // If we're checking order for booking fees, determine if we should process them
        if (checkOrderForBookingFees && !shouldProcessBookingFees) {
          if (!orgBookingFeesEnabled) {
            console.log("=== ORGANIZATION BOOKING FEES DISABLED - SKIPPING ===");
            return new Response(JSON.stringify({ received: true, message: "No booking fees for this organization" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
          
          // Calculate booking fees if not provided in metadata
          if (ticketAmount === 0 && bookingFeeAmount === 0) {
            const totalAmount = paymentIntent.amount; // in cents
            const orderTotal = parseFloat(order.total_amount) * 100; // convert to cents
            
            // Calculate booking fee (1% + $0.50)
            const calculatedBookingFee = Math.round((orderTotal * 0.01) + 50); // 1% + 50 cents
            const calculatedTicketAmount = totalAmount - calculatedBookingFee;
            
            ticketAmount = calculatedTicketAmount;
            bookingFeeAmount = calculatedBookingFee;
            
            console.log("=== CALCULATED BOOKING FEES ===");
            console.log("Total payment amount:", totalAmount, "cents");
            console.log("Calculated ticket amount:", ticketAmount, "cents");
            console.log("Calculated booking fee:", bookingFeeAmount, "cents");
          }
        }
        
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

        // Get payment method details from the payment intent
        let paymentMethodUpdate = {};
        if (paymentIntent.payment_method) {
          const pmId = typeof paymentIntent.payment_method === 'string' 
            ? paymentIntent.payment_method 
            : paymentIntent.payment_method.id;
          
          try {
            // Fetch payment method details
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

        // Update order status, booking fee information, and payment method details
        const { error: updateError } = await supabaseClient
          .from('orders')
          .update({
            status: 'completed',
            payment_status: 'paid',
            booking_fee_amount: bookingFeeAmount / 100, // Convert from cents to dollars
            booking_fee_enabled: true,
            subtotal_amount: ticketAmount / 100, // Convert from cents to dollars
            ...paymentMethodUpdate // Include payment method details
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