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
    // Create Supabase client with service role for all operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    let organizationId: string | null = null

    // Try to get organization_id from request body first (for iOS app)
    try {
      const body = await req.json()
      if (body.organization_id) {
        organizationId = body.organization_id
        console.log('📱 Using organization_id from request body:', organizationId)
      }
    } catch {
      // No JSON body, try auth header
    }

    // If no org_id in body, try to get from authenticated user
    if (!organizationId) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (!authError && user) {
          // Get user's organization
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('user_id', user.id)
            .single()

          if (!orgError && orgData) {
            organizationId = orgData.id
            console.log('🔐 Using organization from auth:', organizationId)
          }
        }
      }
    }

    if (!organizationId) {
      throw new Error('No organization_id provided and unable to determine from auth')
    }

    // Get organization's Stripe Connect account info
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id, stripe_test_mode')
      .eq('id', organizationId)
      .single()

    if (orgError) {
      console.error('Error fetching organization:', orgError)
      throw new Error('Organization not found')
    }

    console.log('📊 Organization:', org.id)
    console.log('🔗 Has Stripe Connect:', org.stripe_account_id ? 'YES' : 'NO')
    console.log('🧪 Test mode:', org.stripe_test_mode ? 'YES' : 'NO')

    let stripeSecretKey: string
    let connectionTokenParams: Record<string, any> = {}

    // Determine which Stripe key to use
    if (org.stripe_account_id) {
      // Organization has Stripe Connect - use platform key and create token for connected account
      const platformKey = org.stripe_test_mode
        ? Deno.env.get('STRIPE_SECRET_KEY_TEST')
        : (Deno.env.get('STRIPE_SECRET_KEY_LIVE') || Deno.env.get('STRIPE_SECRET_KEY'))

      if (!platformKey) {
        throw new Error('Platform Stripe key not configured')
      }

      stripeSecretKey = platformKey

      // For Terminal with Connect, we need to specify the connected account
      // The location must belong to the connected account
      console.log('🔗 Creating connection token for connected account:', org.stripe_account_id)

      // Note: For Terminal with Connect, the connection token is created on the connected account
      // We'll use the Stripe-Account header to make the request on behalf of the connected account
    } else {
      // No Connect - use organization's direct API key
      const { data: paymentConfig, error: paymentError } = await supabase
        .from('organization_payment_configs')
        .select('stripe_secret_key')
        .eq('organization_id', organizationId)
        .single()

      if (paymentError || !paymentConfig?.stripe_secret_key) {
        throw new Error('No Stripe configuration found. Please connect Stripe or add API keys.')
      }

      stripeSecretKey = paymentConfig.stripe_secret_key
      console.log('🔑 Using organization\'s direct Stripe API key')
    }

    // Create connection token
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    // If using Connect, add the Stripe-Account header to act on behalf of connected account
    if (org.stripe_account_id) {
      headers['Stripe-Account'] = org.stripe_account_id
    }

    const response = await fetch('https://api.stripe.com/v1/terminal/connection_tokens', {
      method: 'POST',
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Stripe API error:', response.status, errorText)
      throw new Error(`Stripe API error: ${response.status} - ${errorText}`)
    }

    const connectionToken = await response.json()
    console.log('✅ Connection token created successfully')

    return new Response(
      JSON.stringify({
        secret: connectionToken.secret,
        created: connectionToken.created,
        // Include info about the mode for debugging
        mode: org.stripe_account_id ? 'connect' : 'direct',
        test_mode: org.stripe_test_mode || false,
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
