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
    console.log('=== COMPLETE BILLING SETUP FUNCTION STARTED ===');
    
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));
    
    const { setup_intent_id } = requestBody;

    if (!setup_intent_id) {
      console.error('Setup intent ID is missing from request');
      throw new Error('Setup intent ID is required');
    }

    console.log('Processing setup intent:', setup_intent_id);

    // Initialize Supabase client with service role and proper auth bypass
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'X-Client-Info': 'complete-billing-setup-function'
          }
        }
      }
    );

    // Get user from auth header with better error handling
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Authenticating user with token...');
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      console.error('Authentication error:', userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    if (!user) {
      console.error('No user found after authentication');
      throw new Error('User not authenticated');
    }

    console.log('User authenticated successfully:', user.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Retrieve the setup intent
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);

    if (setupIntent.status !== 'succeeded') {
      throw new Error('Setup intent not completed successfully');
    }

    const paymentMethodId = setupIntent.payment_method as string;
    const customerId = setupIntent.customer as string;

    console.log('Completing billing setup for customer:', customerId);

    // Get organization ID from metadata
    const organizationId = setupIntent.metadata?.organization_id;
    if (!organizationId) {
      throw new Error('Organization ID not found in setup intent metadata');
    }

    // Update billing customer with payment method and set fortnightly cycle (14 days)
    const now = new Date();
    const nextBillingDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now
    
    const { data: billingData, error: updateError } = await supabaseClient
      .from('billing_customers')
      .update({
        payment_method_id: paymentMethodId,
        billing_status: 'active',
        billing_interval_days: 14, // Set fortnightly billing
        next_billing_at: nextBillingDate.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('stripe_customer_id', customerId)
      .select('id')
      .single();

    if (updateError) {
      console.error('Error updating billing customer:', updateError);
      throw new Error('Failed to update billing information');
    }

    console.log('Updated billing customer:', billingData?.id);

    // Update organization billing status
    const { error: orgUpdateError } = await supabaseClient
      .from('organizations')
      .update({
        billing_setup_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (orgUpdateError) {
      console.error('Error updating organization:', orgUpdateError);
      throw new Error('Failed to update organization billing status');
    }

    console.log('Billing setup completed successfully for organization:', organizationId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Billing setup completed successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Complete billing setup error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});