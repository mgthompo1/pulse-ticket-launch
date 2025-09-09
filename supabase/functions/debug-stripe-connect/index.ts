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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    console.log('Checking Stripe Connect data for user:', user.id);

    // Query organization data
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select(`
        id,
        name,
        stripe_account_id,
        stripe_access_token,
        stripe_refresh_token,
        stripe_scope,
        updated_at
      `)
      .eq('user_id', user.id)
      .single();

    if (orgError) {
      console.error('Organization query error:', orgError);
      throw new Error('Organization not found');
    }

    console.log('Organization data:', {
      id: org.id,
      name: org.name,
      has_stripe_account_id: !!org.stripe_account_id,
      stripe_account_id: org.stripe_account_id,
      has_access_token: !!org.stripe_access_token,
      has_refresh_token: !!org.stripe_refresh_token,
      stripe_scope: org.stripe_scope,
      updated_at: org.updated_at
    });

    return new Response(JSON.stringify({
      organization: {
        id: org.id,
        name: org.name,
        stripe_account_id: org.stripe_account_id,
        has_access_token: !!org.stripe_access_token,
        has_refresh_token: !!org.stripe_refresh_token,
        stripe_scope: org.stripe_scope,
        updated_at: org.updated_at,
        is_connected: !!org.stripe_account_id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Debug error:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});