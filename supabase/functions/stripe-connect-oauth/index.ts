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
    console.log('=== STRIPE CONNECT OAUTH STARTED ===');

    const url = new URL(req.url);
    const urlAction = url.searchParams.get('action');

    // Read request body once
    const body = await req.text();
    console.log('📦 Request body:', body);
    let bodyData = {};
    if (body) {
      try {
        bodyData = JSON.parse(body);
        console.log('📦 Parsed body data:', bodyData);
      } catch (e) {
        console.error('❌ Failed to parse body:', e);
        bodyData = {};
      }
    }

    // Determine action from URL or body
    const action = urlAction || (bodyData as any).action || 'create_connect_url';
    console.log('🎬 Action determined:', action);

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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header present:', !!authHeader);
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ User auth error:', userError);
      throw new Error('User not authenticated');
    }
    console.log('✅ User authenticated:', user.id);

    if (action === 'create_connect_url') {
      // Create OAuth URL for connecting Stripe account
      const stripeClientId = Deno.env.get('STRIPE_CONNECT_CLIENT_ID');
      if (!stripeClientId) {
        throw new Error('Stripe Connect Client ID not configured');
      }

      // Get organization for this user
      const { data: org, error: orgError } = await supabaseClient
        .from('organizations')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (orgError || !org) {
        throw new Error('Organization not found');
      }

      // Use dedicated callback endpoint
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const redirectUri = `${supabaseUrl}/functions/v1/stripe-connect-callback`;
      const state = `${org.id}|${user.id}`; // Include org and user ID in state

      const connectUrl = `https://connect.stripe.com/oauth/authorize?` +
        `response_type=code&` +
        `client_id=${stripeClientId}&` +
        `scope=read_write&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${encodeURIComponent(state)}`;

      console.log('✅ Connect URL created for organization:', org.id);

      return new Response(JSON.stringify({
        connect_url: connectUrl
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (action === 'complete_connection') {
      console.log('🔄 Starting complete_connection flow');
      // Handle the OAuth callback - exchange code for access token
      const { code, state } = bodyData as any;
      console.log('📝 OAuth params - code:', code?.substring(0, 20) + '...', 'state:', state);

      if (!code) {
        console.error('❌ No authorization code provided');
        throw new Error('Authorization code is required');
      }

      // Parse state to get organization ID
      const [orgId, userId] = state?.split('|') || [];
      if (!orgId || userId !== user.id) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_secret: Deno.env.get('STRIPE_SECRET_KEY') || '',
          code: code,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Stripe OAuth error:', errorText);
        throw new Error('Failed to exchange authorization code');
      }

      const tokenData = await tokenResponse.json();
      console.log('✅ OAuth token exchange successful');
      console.log('Connected account ID:', tokenData.stripe_user_id);

      // Store the connected account information
      const { error: updateError } = await supabaseClient
        .from('organizations')
        .update({
          stripe_account_id: tokenData.stripe_user_id,
          stripe_access_token: tokenData.access_token,
          stripe_refresh_token: tokenData.refresh_token,
          stripe_scope: tokenData.scope,
          updated_at: new Date().toISOString()
        })
        .eq('id', orgId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating organization:', updateError);
        throw new Error('Failed to save connection data');
      }

      console.log('✅ Organization updated with Connect account');

      // Update Stripe account metadata with organization_id
      // This allows webhooks to find the correct organization
      try {
        const Stripe = (await import('https://esm.sh/stripe@14.21.0')).default;
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
          apiVersion: '2024-11-20.acacia',
          httpClient: Stripe.createFetchHttpClient(),
        });

        await stripe.accounts.update(tokenData.stripe_user_id, {
          metadata: {
            organization_id: orgId
          }
        });

        console.log('✅ Updated Stripe account metadata with organization_id');
      } catch (metadataError) {
        console.error('Warning: Failed to update Stripe account metadata:', metadataError);
        // Don't fail the whole operation if metadata update fails
      }

      return new Response(JSON.stringify({
        success: true,
        stripe_account_id: tokenData.stripe_user_id,
        message: 'Stripe account connected successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (action === 'disconnect') {
      // Disconnect the Stripe account
      const { data: org, error: orgError } = await supabaseClient
        .from('organizations')
        .select('stripe_account_id, stripe_access_token')
        .eq('user_id', user.id)
        .single();

      if (orgError || !org) {
        throw new Error('Organization not found');
      }

      if (org.stripe_account_id) {
        // Revoke the access token
        try {
          await fetch('https://connect.stripe.com/oauth/deauthorize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              client_secret: Deno.env.get('STRIPE_SECRET_KEY') || '',
              stripe_user_id: org.stripe_account_id
            })
          });
        } catch (error) {
          console.warn('Warning: Failed to revoke Stripe access token:', error);
          // Continue with disconnection even if revocation fails
        }
      }

      // Clear the connection data from database
      const { error: updateError } = await supabaseClient
        .from('organizations')
        .update({
          stripe_account_id: null,
          stripe_access_token: null,
          stripe_refresh_token: null,
          stripe_scope: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error('Failed to disconnect account');
      }

      console.log('✅ Stripe account disconnected');

      return new Response(JSON.stringify({
        success: true,
        message: 'Stripe account disconnected successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Stripe Connect OAuth error:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});