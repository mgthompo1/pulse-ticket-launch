import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.json()
    const { user_id, platform, content } = body
    
    if (!user_id || !platform || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: user_id, platform, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get social connection
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('platform', platform)
      .eq('is_connected', true)
      .single()

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ 
          error: `No ${platform} connection found. Please reconnect your account.`,
          debug: connectionError 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (platform !== 'linkedin') {
      return new Response(
        JSON.stringify({ error: 'Only LinkedIn is supported currently' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get LinkedIn user ID
    const meResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'X-Restli-Protocol-Version': '2.0.0',
      }
    })

    if (!meResponse.ok) {
      const errorText = await meResponse.text()
      return new Response(
        JSON.stringify({ 
          error: 'LinkedIn authentication failed. Please reconnect your account.',
          details: errorText 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const meData = await meResponse.json()
    const personId = meData.id

    // Create LinkedIn post
    const postPayload = {
      author: `urn:li:person:${personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    }

    const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postPayload)
    })

    if (!postResponse.ok) {
      const errorText = await postResponse.text()
      return new Response(
        JSON.stringify({ 
          error: 'LinkedIn posting failed',
          details: errorText,
          status: postResponse.status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const postResult = await postResponse.json()

    // Save to database
    await supabase
      .from('scheduled_posts')
      .insert({
        user_id: user_id,
        connection_id: connection.id,
        platform: platform,
        content: content,
        scheduled_time: new Date().toISOString(),
        status: 'posted',
        published_post_id: postResult.id
      })

    return new Response(
      JSON.stringify({
        success: true,
        platform,
        post_id: postResult.id,
        message: 'Successfully posted to LinkedIn!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})