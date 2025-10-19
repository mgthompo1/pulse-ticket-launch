import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header provided')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Set the auth token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    // Get user's organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgData) {
      throw new Error('No organization found for user')
    }

    // Get organization's payment configuration
    const { data: paymentConfig, error: paymentError } = await supabase
      .from('organization_payment_configs')
      .select('stripe_secret_key, stripe_publishable_key')
      .eq('organization_id', orgData.id)
      .single()

    if (paymentError || !paymentConfig || !paymentConfig.stripe_secret_key) {
      throw new Error('No Stripe configuration found for organization. Please configure payment settings first.')
    }

    // Create connection token for Stripe Terminal using user's Stripe key
    const response = await fetch('https://api.stripe.com/v1/terminal/connection_tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paymentConfig.stripe_secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Stripe API error: ${response.status} - ${errorText}`)
    }

    const connectionToken = await response.json()

    return new Response(
      JSON.stringify({
        secret: connectionToken.secret,
        created: connectionToken.created,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Error creating connection token:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create connection token',
        details: error.stack
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500,
      },
    )
  }
})