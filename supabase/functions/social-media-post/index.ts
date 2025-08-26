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
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { user_id, platform, content, scheduled_time, event_id } = await req.json()

    if (!user_id || !platform || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the user's social connection for the specified platform
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('platform', platform)
      .eq('is_connected', true)
      .single()

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: `No active ${platform} connection found` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token is expired
    if (connection.expires_at && new Date(connection.expires_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: `${platform} access token has expired. Please reconnect your account.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let postResult: any
    let externalPostId: string

    // Post to the appropriate platform
    if (platform === 'linkedin') {
      postResult = await postToLinkedIn(connection.access_token, content, event_id)
      externalPostId = postResult.id
    } else if (platform === 'facebook') {
      postResult = await postToFacebook(connection.access_token, content, event_id)
      externalPostId = postResult.id
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the scheduled post status to published
    const { error: updateError } = await supabase
      .from('scheduled_posts')
      .update({
        status: 'published',
        published_post_id: externalPostId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('platform', platform)
      .eq('content', content)
      .eq('scheduled_time', scheduled_time)

    if (updateError) {
      console.error('Error updating post status:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        platform,
        post_id: externalPostId,
        message: `Successfully posted to ${platform}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Social media post error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function postToLinkedIn(accessToken: string, content: string, eventId?: string) {
  // LinkedIn API endpoint for creating posts
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202405',
    },
    body: JSON.stringify({
      author: `urn:li:person:${await getLinkedInPersonId(accessToken)}`,
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
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LinkedIn API error: ${errorText}`)
  }

  return await response.json()
}

async function postToFacebook(accessToken: string, content: string, eventId?: string) {
  // Facebook API endpoint for creating posts
  const response = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: content,
      access_token: accessToken
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Facebook API error: ${errorText}`)
  }

  return await response.json()
}

async function getLinkedInPersonId(accessToken: string): Promise<string> {
  const response = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get LinkedIn person ID')
  }

  const data = await response.json()
  return data.id
}
