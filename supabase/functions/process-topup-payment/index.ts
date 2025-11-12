import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessTopupRequest {
  token: string;
  amount: number; // in cents
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('💰 Process Top-Up Payment Function Started');

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Parse request body
    const body: ProcessTopupRequest = await req.json();
    console.log('📦 Request:', { token: body.token, amount: `$${(body.amount / 100).toFixed(2)}` });

    // Validate inputs
    if (!body.token || !body.amount) {
      throw new Error('Missing required fields: token, amount');
    }

    if (body.amount < 100) {
      throw new Error('Minimum top-up amount is $1.00');
    }

    if (body.amount > 50000) {
      throw new Error('Maximum top-up amount is $500.00');
    }

    // Step 1: Validate token and get card details
    const { data: loadData, error: loadError } = await supabaseClient
      .from('issuing_card_loads')
      .select(`
        id,
        card_id,
        organization_id,
        group_id,
        topup_token_expires_at,
        topup_token_used_at,
        parent_email,
        issuing_cards (
          id,
          card_last4,
          cardholder_name,
          cardholder_email,
          current_balance,
          card_status,
          stripe_card_id,
          organizations (
            id,
            name,
            stripe_account_id
          )
        )
      `)
      .eq('topup_token', body.token)
      .single();

    if (loadError || !loadData) {
      throw new Error('Invalid or expired top-up token');
    }

    const card = loadData.issuing_cards as any;
    const org = card.organizations;

    // Validate token hasn't expired
    const expiresAt = new Date(loadData.topup_token_expires_at);
    if (expiresAt < new Date()) {
      throw new Error('This top-up link has expired');
    }

    // Validate token hasn't been used
    if (loadData.topup_token_used_at) {
      throw new Error('This top-up link has already been used');
    }

    // Validate card is active
    if (card.card_status !== 'active') {
      throw new Error('This card is no longer active');
    }

    // Validate organization has Stripe Connect
    if (!org.stripe_account_id) {
      throw new Error('Organization payment processing not configured');
    }

    console.log('✅ Token validated for card:', card.card_last4);

    // Step 2: Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: body.amount,
        currency: 'usd',
        description: `Card Top-Up for ${card.cardholder_name} (•••• ${card.card_last4})`,
        metadata: {
          card_id: card.id,
          load_record_id: loadData.id,
          organization_id: org.id,
          topup_token: body.token,
          cardholder_name: card.cardholder_name,
        },
        // Application fee for platform (optional)
        application_fee_amount: Math.floor(body.amount * 0.029) + 30, // 2.9% + $0.30
      },
      {
        stripeAccount: org.stripe_account_id,
      }
    );

    console.log('✅ Payment Intent created:', paymentIntent.id);

    // Step 3: Update load record with payment intent
    const { error: updateError } = await supabaseClient
      .from('issuing_card_loads')
      .update({
        amount: body.amount,
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
      })
      .eq('id', loadData.id);

    if (updateError) {
      console.error('⚠️ Failed to update load record:', updateError);
      // Don't fail - payment intent is created
    }

    console.log('🎉 Payment intent ready for confirmation');

    // Return client secret for frontend
    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        amount: body.amount,
        cardLast4: card.card_last4,
        cardholderName: card.cardholder_name,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Error processing top-up:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process top-up payment',
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
