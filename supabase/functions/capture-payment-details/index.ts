import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CAPTURE PAYMENT DETAILS STARTED ===');

    const { paymentIntentId, orderId } = await req.json();

    if (!paymentIntentId || !orderId) {
      throw new Error('Payment intent ID and order ID are required');
    }

    console.log('Payment Intent ID:', paymentIntentId);
    console.log('Order ID:', orderId);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    // First, get the order and organization info to check for test mode
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        events!inner (
          organization_id,
          organizations!inner (
            stripe_test_mode,
            stripe_account_id
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order lookup error:', orderError);
      throw new Error('Order not found');
    }

    console.log('Found order:', order.id);
    console.log('Organization ID:', order.events.organization_id);
    console.log('Test mode enabled:', order.events.organizations?.stripe_test_mode);

    // Check for test mode - same logic as create-payment-intent
    // Organization setting takes precedence over environment variable
    const orgTestModeSetting = order.events.organizations?.stripe_test_mode;
    const envTestMode = Deno.env.get("STRIPE_TEST_MODE") === "true";
    // If org has explicit setting, use it; otherwise fall back to env var
    const isTestMode = typeof orgTestModeSetting === 'boolean' ? orgTestModeSetting : envTestMode;

    console.log('=== TEST MODE CHECK ===');
    console.log('Org test mode setting:', orgTestModeSetting);
    console.log('Env test mode:', envTestMode);
    console.log('Is test mode:', isTestMode);

    // Initialize Stripe with the appropriate key
    const Stripe = await import("https://esm.sh/stripe@14.21.0");
    let stripe: any;
    let paymentIntent: any;
    let stripeKey: string | undefined;

    if (isTestMode) {
      // Test mode - use platform test key (same key used in create-payment-intent)
      stripeKey = Deno.env.get("STRIPE_SECRET_KEY_TEST");
      if (!stripeKey) {
        console.warn('⚠️ Test mode enabled but STRIPE_SECRET_KEY_TEST not set, falling back to STRIPE_SECRET_KEY');
        stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      }
      console.log('🧪 Using PLATFORM Stripe TEST key');
    } else {
      // Live mode - try platform key first (for Connect), then org key
      stripeKey = Deno.env.get("STRIPE_SECRET_KEY_LIVE") || Deno.env.get("STRIPE_SECRET_KEY");
      console.log('Using PLATFORM Stripe LIVE key for initial attempt');
    }

    if (stripeKey) {
      try {
        stripe = new Stripe.default(stripeKey, { apiVersion: "2023-10-16" });
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log('✅ Retrieved payment intent with', isTestMode ? 'test' : 'platform', 'key');
      } catch (error) {
        if (!isTestMode) {
          // Only try org key fallback in live mode (test mode should always use platform test key)
          console.log('❌ Platform key failed, trying organization key...');
          stripe = null;
          paymentIntent = null;
        } else {
          // In test mode, if platform test key fails, that's an error
          console.error('❌ Test mode payment intent retrieval failed:', error.message);
          throw new Error('Failed to retrieve test mode payment intent. Ensure STRIPE_SECRET_KEY_TEST is set correctly.');
        }
      }
    }

    // If platform key failed in live mode, get organization's key from credentials
    if (!paymentIntent && !isTestMode) {
      // Get organization's Stripe credentials from payment_credentials table
      const { data: credentials, error: credError } = await supabaseClient
        .rpc('get_payment_credentials_for_processing', {
          p_organization_id: order.events.organization_id
        });

      console.log('Credentials query result:', { credentials: credentials ? 'found' : 'not found', credError });

      if (credError || !credentials || credentials.length === 0) {
        throw new Error('Organization payment credentials not found');
      }

      const orgStripeKey = credentials[0].stripe_secret_key;
      if (!orgStripeKey) {
        throw new Error('Organization Stripe secret key not found');
      }

      stripe = new Stripe.default(orgStripeKey, { apiVersion: "2023-10-16" });
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log('✅ Retrieved payment intent with organization key');
    }

    console.log('Payment Intent Status:', paymentIntent.status);
    console.log('Payment Intent Amount:', paymentIntent.amount);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment intent status is ${paymentIntent.status}, not succeeded`);
    }

    // Get payment method details
    let paymentMethodDetails: {
      payment_method_type?: string;
      card_last_four?: string;
      card_brand?: string;
      payment_method_id?: string;
    } = {};
    if (paymentIntent.payment_method) {
      const pmId = typeof paymentIntent.payment_method === 'string' 
        ? paymentIntent.payment_method 
        : paymentIntent.payment_method.id;
      
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(pmId);
        console.log('Payment Method Type:', paymentMethod.type);
        
        if (paymentMethod.card) {
          paymentMethodDetails = {
            payment_method_type: 'card',
            card_last_four: paymentMethod.card.last4,
            card_brand: paymentMethod.card.brand,
            payment_method_id: pmId
          };
          console.log('✅ Card details captured:', paymentMethodDetails);
        } else if (paymentMethod.type) {
          paymentMethodDetails = {
            payment_method_type: paymentMethod.type,
            payment_method_id: pmId
          };
          console.log('✅ Non-card payment method captured:', paymentMethodDetails);
        }
      } catch (error) {
        console.error('❌ Failed to fetch payment method details:', error.message);
      }
    }

    // Calculate fee details from metadata
    const metadata = paymentIntent.metadata || {};
    const totalAmount = paymentIntent.amount / 100; // Convert cents to dollars
    const subtotal = parseFloat(metadata.subtotal || '0');
    const bookingFee = parseFloat(metadata.bookingFee || '0');
    const processingFee = totalAmount - subtotal - bookingFee; // Calculate processing fee

    console.log('=== FEE BREAKDOWN ===');
    console.log('Total Amount:', totalAmount);
    console.log('Subtotal:', subtotal);
    console.log('Booking Fee:', bookingFee);
    console.log('Processing Fee:', processingFee);

    // Update order with payment details and fees
    const updateData = {
      status: 'completed',
      payment_method_type: paymentMethodDetails.payment_method_type || null,
      card_last_four: paymentMethodDetails.card_last_four || null,
      card_brand: paymentMethodDetails.card_brand || null,
      payment_method_id: paymentMethodDetails.payment_method_id || null,
      total_amount: totalAmount,
      booking_fee: bookingFee,
      processing_fee: processingFee > 0 ? processingFee : null,
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString()
    };

    console.log('=== UPDATING ORDER ===');
    console.log('Update data:', updateData);

    const { error: updateError } = await supabaseClient
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Error updating order:', updateError);
      throw new Error('Failed to update order with payment details');
    }

    console.log('✅ Order updated successfully with payment details');

    // Increment promo code usage if a promo code was used
    try {
      const { data: orderWithPromo, error: promoCheckError } = await supabaseClient
        .from("orders")
        .select("promo_code_id, customer_email, total_amount, subtotal")
        .eq("id", orderId)
        .single();

      if (!promoCheckError && orderWithPromo?.promo_code_id) {
        console.log('Incrementing promo code usage for:', orderWithPromo.promo_code_id);

        // Calculate discount applied (difference between subtotal and total, accounting for fees)
        const discountApplied = Math.max(0, (orderWithPromo.subtotal || orderWithPromo.total_amount) - orderWithPromo.total_amount);

        // Increment the current_uses count
        const { error: incrementError } = await supabaseClient.rpc('increment_promo_code_usage', {
          p_promo_code_id: orderWithPromo.promo_code_id,
          p_order_id: orderId,
          p_customer_email: orderWithPromo.customer_email || '',
          p_discount_applied: discountApplied
        });

        if (incrementError) {
          console.error('Failed to increment promo code usage:', incrementError);
          // Try direct update as fallback - first get current value
          const { data: promoCode } = await supabaseClient
            .from('promo_codes')
            .select('current_uses')
            .eq('id', orderWithPromo.promo_code_id)
            .single();

          if (promoCode) {
            const { error: updateError } = await supabaseClient
              .from('promo_codes')
              .update({ current_uses: (promoCode.current_uses || 0) + 1 })
              .eq('id', orderWithPromo.promo_code_id);

            if (updateError) {
              console.error('Direct update also failed:', updateError);
            } else {
              console.log('Promo code usage incremented via direct update');
            }
          }
        } else {
          console.log('Promo code usage incremented successfully');
        }
      }
    } catch (promoError) {
      console.error('❌ Error incrementing promo code usage:', promoError);
      // Don't fail the whole process for promo code tracking issues
    }

    // Send ticket email (includes receipt and tickets)
    console.log('=== SENDING TICKET EMAIL ===');
    try {
      const { data: emailData, error: emailError } = await supabaseClient.functions.invoke('send-ticket-email-v2', {
        body: { orderId: orderId }
      });

      if (emailError) {
        console.error('❌ Ticket email sending failed:', emailError);
      } else {
        console.log('✅ Ticket email sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Ticket email function error:', emailError);
    }

    // Track group sale if this is a group purchase
    try {
      const { data: orderForGroupTracking, error: groupOrderError } = await supabaseClient
        .from("orders")
        .select("id, custom_answers, promo_code_id")
        .eq("id", orderId)
        .single();

      if (!groupOrderError && orderForGroupTracking) {
        const groupPurchaseInfo = (orderForGroupTracking.custom_answers as any)?.__group_purchase__;

        if (groupPurchaseInfo?.group_id && groupPurchaseInfo?.allocation_id) {
          console.log('Group purchase detected - tracking sale');

          // Get promo discount from Payment Intent metadata
          const promoDiscount = parseFloat(paymentIntent.metadata?.promoDiscount || '0');
          const originalSubtotal = parseFloat(paymentIntent.metadata?.subtotal || '0');

          // Calculate discount ratio (how much of the original price was actually paid)
          // If there was a promo discount, calculate what percentage was paid
          const discountRatio = originalSubtotal > 0 ? (originalSubtotal - promoDiscount) / originalSubtotal : 1;

          console.log(`Discount calculation: originalSubtotal=${originalSubtotal}, promoDiscount=${promoDiscount}, ratio=${discountRatio}`);

          // Get order items for this order
          const { data: orderItems } = await supabaseClient
            .from('order_items')
            .select('id, ticket_type_id, unit_price')
            .eq('order_id', orderId)
            .eq('item_type', 'ticket');

          if (orderItems && orderItems.length > 0) {
            const orderItemIds = orderItems.map((item: any) => item.id);

            // Now get tickets for these order items
            const { data: createdTickets } = await supabaseClient
              .from('tickets')
              .select('id, order_item_id')
              .in('order_item_id', orderItemIds);

            if (createdTickets && createdTickets.length > 0) {
              // Map tickets to their order items to get ticket_type_id and price
              // Apply the discount ratio to get the actual paid price
              const ticketsWithDetails = createdTickets.map((ticket: any) => {
                const orderItem = orderItems.find((item: any) => item.id === ticket.order_item_id);
                const actualPaidPrice = (orderItem?.unit_price || 0) * discountRatio;

                console.log(`Ticket pricing: unit_price=${orderItem?.unit_price}, discount_ratio=${discountRatio}, actual_paid=${actualPaidPrice}`);

                return {
                  ticketId: ticket.id,
                  ticketTypeId: orderItem?.ticket_type_id || null,
                  paidPrice: actualPaidPrice,
                };
              });

              // Call track-group-sale edge function
              const { data: trackingData, error: trackingError } = await supabaseClient.functions.invoke('track-group-sale', {
                body: {
                  orderId: orderId,
                  groupId: groupPurchaseInfo.group_id,
                  allocationId: groupPurchaseInfo.allocation_id,
                  tickets: ticketsWithDetails
                }
              });

              if (trackingError) {
                console.error('Error tracking group sale:', trackingError);
              } else {
                console.log('Group sale tracked successfully');
              }
            }
          }
        }
      }
    } catch (groupTrackingError) {
      console.error('❌ Group sale tracking error:', groupTrackingError);
      // Don't fail the whole process for group tracking issues
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment details captured and receipt sent',
      paymentDetails: paymentMethodDetails,
      fees: {
        subtotal,
        bookingFee,
        processingFee: processingFee > 0 ? processingFee : 0,
        total: totalAmount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Capture payment details error:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});