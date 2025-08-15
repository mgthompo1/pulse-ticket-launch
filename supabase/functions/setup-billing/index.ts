import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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
    // Initialize Supabase client with service role for bypassing RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('Setting up billing for user:', user.id);

    // Get user's organization
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (orgError || !org) {
      throw new Error('Organization not found');
    }

    console.log('Found organization:', org.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check if billing customer already exists
    const { data: existingBilling } = await supabaseClient
      .from('billing_customers')
      .select('*')
      .eq('organization_id', org.id)
      .single();

    let stripeCustomerId = existingBilling?.stripe_customer_id;

    // Create Stripe customer if not exists
    if (!stripeCustomerId) {
      console.log('Creating new Stripe customer...');
      const customer = await stripe.customers.create({
        email: org.email,
        name: org.name,
        metadata: {
          organization_id: org.id,
          user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;
      console.log('Created Stripe customer:', stripeCustomerId);

      // Save billing customer record
      const { error: billingError } = await supabaseClient
        .from('billing_customers')
        .insert({
          organization_id: org.id,
          stripe_customer_id: stripeCustomerId,
          billing_email: org.email,
          billing_status: 'setup_required',
        });

      if (billingError) {
        console.error('Error saving billing customer:', billingError);
        throw new Error('Failed to save billing information');
      }
    }

    // Create Stripe setup intent for payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        organization_id: org.id,
      },
    });

    console.log('Created setup intent:', setupIntent.id);

    return new Response(JSON.stringify({
      client_secret: setupIntent.client_secret,
      stripe_customer_id: stripeCustomerId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Setup billing error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});