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
    const { setup_intent_id } = await req.json();

    if (!setup_intent_id) {
      throw new Error('Setup intent ID is required');
    }

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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

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

    // Update billing customer with payment method
    // Use explicit error handling and simpler query structure
    const { data: billingData, error: updateError } = await supabaseClient
      .from('billing_customers')
      .update({
        payment_method_id: paymentMethodId,
        billing_status: 'active',
        updated_at: new Date().toISOString(),
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