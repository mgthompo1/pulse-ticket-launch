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
    console.log('=== MANAGE BILLING FUNCTION STARTED ===');

    const { action, setup_intent_id, pm_id } = await req.json();
    console.log('Action requested:', action);

    // Initialize Supabase client with service role
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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('User authenticated:', user.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get organization for user
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (orgError || !org) {
      throw new Error('Organization not found');
    }

    console.log('Organization found:', org.id);

    // Get billing customer with better error handling
    const { data: billingCustomer, error: billingError } = await supabaseClient
      .from('billing_customers')
      .select('*')
      .eq('organization_id', org.id)
      .single();

    if (billingError) {
      console.error('Billing customer query error:', billingError);
      
      // If no rows found, provide a helpful error message
      if (billingError.code === 'PGRST116') {
        return new Response(JSON.stringify({
          error: 'Billing not set up yet. Please complete billing setup first.',
          code: 'BILLING_NOT_SETUP',
          redirect: '/dashboard?tab=billing&setup=true'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      // For other database errors, return a generic message
      throw new Error(`Database error: ${billingError.message}`);
    }

    if (!billingCustomer) {
      return new Response(JSON.stringify({
        error: 'Billing customer not found. Please complete billing setup first.',
        code: 'BILLING_NOT_SETUP',
        redirect: '/dashboard?tab=billing&setup=true'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Billing customer found:', billingCustomer.stripe_customer_id);

    switch (action) {
      case 'list_payment_methods':
        // Retrieve default payment method from Stripe and list all card methods
        const customer = await stripe.customers.retrieve(billingCustomer.stripe_customer_id);
        const defaultPmId = (customer as any)?.invoice_settings?.default_payment_method || billingCustomer.payment_method_id || null;
        const list = await stripe.paymentMethods.list({ customer: billingCustomer.stripe_customer_id, type: 'card' });
        return new Response(JSON.stringify({
          default_payment_method: defaultPmId,
          payment_methods: list.data.map(pm => ({
            id: pm.id,
            brand: (pm.card && pm.card.brand) || undefined,
            last4: (pm.card && pm.card.last4) || undefined,
            exp_month: (pm.card && pm.card.exp_month) || undefined,
            exp_year: (pm.card && pm.card.exp_year) || undefined,
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      case 'set_default_payment_method':
        if (!pm_id) {
          throw new Error('pm_id is required');
        }
        await stripe.customers.update(billingCustomer.stripe_customer_id, {
          invoice_settings: { default_payment_method: pm_id },
        });
        await supabaseClient
          .from('billing_customers')
          .update({ payment_method_id: pm_id, updated_at: new Date().toISOString() })
          .eq('id', billingCustomer.id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      case 'detach_payment_method':
        // Disallow removing the only/default payment method to ensure continuous billing.
        return new Response(JSON.stringify({
          error: 'Removing payment methods is disabled. Add a new card and set it as default to change.'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });

      case 'create_portal_session':
        // Create Stripe Customer Portal session for managing payment methods
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: billingCustomer.stripe_customer_id,
          return_url: `${req.headers.get('origin')}/dashboard?tab=billing`,
        });

        console.log('Portal session created:', portalSession.id);

        return new Response(JSON.stringify({
          url: portalSession.url
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      case 'update_payment_method':
        if (!setup_intent_id) {
          throw new Error('Setup intent ID required for payment method update');
        }

        // Retrieve the setup intent
        const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);

        if (setupIntent.status !== 'succeeded') {
          throw new Error('Setup intent not completed successfully');
        }

        const paymentMethodId = setupIntent.payment_method as string;

        // Update billing customer with new payment method
        const { error: updateError } = await supabaseClient
          .from('billing_customers')
          .update({
            payment_method_id: paymentMethodId,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', billingCustomer.stripe_customer_id);

        if (updateError) {
          throw new Error('Failed to update payment method');
        }

        console.log('Payment method updated successfully');

        return new Response(JSON.stringify({
          success: true,
          message: 'Payment method updated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      case 'get_upcoming_charges':
        // Get current month usage for calculating upcoming charges
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        
        const { data: usage, error: usageError } = await supabaseClient
          .from('usage_records')
          .select('*')
          .eq('organization_id', org.id)
          .gte('created_at', startOfMonth.toISOString())
          .eq('billed', false);

        if (usageError) {
          throw new Error('Failed to retrieve usage data');
        }

        const totalFees = usage?.reduce((acc, record) => 
          acc + parseFloat(record.total_platform_fee || 0), 0) || 0;

        const nextBillingDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

        console.log('Upcoming charges calculated:', { totalFees, nextBillingDate });

        return new Response(JSON.stringify({
          upcoming_amount: totalFees,
          next_billing_date: nextBillingDate.toISOString(),
          billing_period_start: startOfMonth.toISOString(),
          billing_period_end: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString(),
          transaction_count: usage?.length || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      case 'cancel_billing':
        // Update billing status to cancelled
        const { error: cancelError } = await supabaseClient
          .from('billing_customers')
          .update({
            billing_status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', billingCustomer.stripe_customer_id);

        if (cancelError) {
          throw new Error('Failed to cancel billing');
        }

        console.log('Billing cancelled successfully');

        return new Response(JSON.stringify({
          success: true,
          message: 'Billing cancelled successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Manage billing error:', error);
    
    // Provide more detailed error information
    const errorResponse = {
      error: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      action: 'manage-billing'
    };
    
    // Add stack trace in development
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      errorResponse.stack = error.stack;
    }
    
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});