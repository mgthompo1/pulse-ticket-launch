import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }


  try {
    console.log('=== STRIPE CONNECT CALLBACK STARTED ===');

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('📝 Callback params:', { code: code?.substring(0, 20) + '...', state, error });

    // Handle OAuth errors
    if (error) {
      console.error('❌ OAuth error:', error, errorDescription);
      return Response.redirect(
        `https://www.ticketflo.org/dashboard?tab=payments&error=${encodeURIComponent(error)}`,
        302
      );
    }

    if (!code || !state) {
      console.error('❌ Missing code or state');
      return Response.redirect(
        `https://www.ticketflo.org/dashboard?tab=payments&error=missing_params`,
        302
      );
    }

    // Parse state to get organization and user IDs
    const [orgId, userId] = state.split('|');
    console.log('🔑 Parsed state - orgId:', orgId, 'userId:', userId);

    if (!orgId || !userId) {
      console.error('❌ Invalid state parameter');
      return Response.redirect(
        `https://www.ticketflo.org/dashboard?tab=payments&error=invalid_state`,
        302
      );
    }

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

    console.log('🔄 Exchanging authorization code for tokens...');

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
      console.error('❌ Stripe OAuth token exchange failed:', errorText);
      return Response.redirect(
        `https://www.ticketflo.org/dashboard?tab=payments&error=token_exchange_failed`,
        302
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ OAuth token exchange successful');
    console.log('📋 Connected account ID:', tokenData.stripe_user_id);

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
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Failed to update organization:', updateError);
      return Response.redirect(
        `https://www.ticketflo.org/dashboard?tab=payments&error=db_update_failed`,
        302
      );
    }

    console.log('✅ Organization updated with Connect account');

    // Update Stripe account metadata with organization_id
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
      console.error('⚠️ Failed to update Stripe account metadata:', metadataError);
      // Don't fail the whole operation if metadata update fails
    }

    // Redirect back to dashboard with success flag
    const redirectUrl = `https://www.ticketflo.org/dashboard?tab=payments&connected=true`;
    console.log('✅ Redirecting to:', redirectUrl);

    return Response.redirect(redirectUrl, 302);

  } catch (error) {
    console.error('❌ Callback error:', error);
    return Response.redirect(
      `https://www.ticketflo.org/dashboard?tab=payments&error=unexpected_error`,
      302
    );
  }
});
