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

    // Initialize Stripe - try platform key first, then fall back to getting org key
    const Stripe = await import("https://esm.sh/stripe@14.21.0");
    let stripe: any;
    let paymentIntent: any;

    // First try with platform key (for Connect payments)
    const platformStripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (platformStripeKey) {
      try {
        stripe = new Stripe.default(platformStripeKey, { apiVersion: "2023-10-16" });
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log('✅ Retrieved payment intent with platform key');
      } catch (error) {
        console.log('❌ Platform key failed, trying organization key...');
        stripe = null;
        paymentIntent = null;
      }
    }

    // If platform key failed, get organization's key from order
    if (!paymentIntent) {
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .select(`
          *,
          events!inner (
            organization_id
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      console.log('Found order:', order.id, 'for event:', order.events.organization_id);

      // Get organization's Stripe credentials from payment_credentials table
      const { data: credentials, error: credError } = await supabaseClient
        .rpc('get_payment_credentials_for_processing', { 
          p_organization_id: order.events.organization_id 
        });

      console.log('Credentials query result:', { credentials, credError });

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
    let paymentMethodDetails = {};
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