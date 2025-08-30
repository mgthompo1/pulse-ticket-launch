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
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { action, code, redirect_uri, state, code_challenge, code_verifier } = body || {}

    const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID')
    const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET')

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      console.error('LinkedIn OAuth credentials not configured')
      return new Response(
        JSON.stringify({ error: 'LinkedIn OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'getAuthUrl') {
      const origin = req.headers.get('origin') || ''
      const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1')
      const fallbackRedirect = isLocal
        ? 'http://localhost:8080/auth/linkedin/callback'
        : 'https://ticketflo.org/dashboard/auth/linkedin/callback'
      const finalRedirect = typeof redirect_uri === 'string' && redirect_uri.startsWith('http')
        ? redirect_uri
        : fallbackRedirect

      const scopes = ['r_basicprofile','w_member_social'].join(' ')

      // Pack redirect into state to guarantee match on exchange
      const packedStateObj = { s: state || '', r: finalRedirect }
      const packedState = btoa(JSON.stringify(packedStateObj))

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: LINKEDIN_CLIENT_ID,
        redirect_uri: finalRedirect,
        scope: scopes,
        state: packedState
      })
      if (code_challenge) {
        params.set('code_challenge', code_challenge)
        params.set('code_challenge_method', 'S256')
      }

      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`

      return new Response(
        JSON.stringify({ authUrl, redirect_uri: finalRedirect, state: packedState }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!code /* allow redirect_uri to be derived from state */) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters', details: { code_present: !!code } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Derive redirect_uri to use: prefer packed state.r if present/valid
    let redirectToUse = redirect_uri as string | undefined
    if (typeof state === 'string' && state.length > 0) {
      try {
        const decoded = JSON.parse(atob(state))
        if (decoded && typeof decoded.r === 'string' && decoded.r.startsWith('http')) {
          redirectToUse = decoded.r
        }
      } catch (_) {
        // ignore state decoding errors
      }
    }

    if (!redirectToUse) {
      return new Response(
        JSON.stringify({ error: 'Missing redirect_uri and state.r' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectToUse,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    })
    if (code_verifier) {
      form.set('code_verifier', code_verifier)
    }

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => '')
      console.error('LinkedIn token exchange failed:', { status: tokenResponse.status, errorText, redirect_uri: redirectToUse, has_code_verifier: !!code_verifier })
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code for access token', details: { status: tokenResponse.status, errorText } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenResponse.json()

    let profileData = null
    try {
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      })
      if (profileResponse.ok) {
        profileData = await profileResponse.json()
      } else {
        const pErr = await profileResponse.text().catch(() => '')
        console.warn('LinkedIn profile fetch non-200:', { status: profileResponse.status, pErr })
      }
    } catch (profileError) {
      console.error('Failed to fetch LinkedIn profile:', profileError)
    }

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        expires_at: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null,
        scope: tokenData.scope,
        profile: profileData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('LinkedIn token exchange error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
