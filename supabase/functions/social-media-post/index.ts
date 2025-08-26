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

    const { user_id, platform, content, scheduled_time, event_id, image_url } = await req.json()
    
    console.log('Request payload:', { user_id, platform, content, scheduled_time, event_id, image_url })

    if (!user_id || !platform || !content) {
      console.error('Missing required parameters:', { user_id, platform, content })
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Looking for social connection:', { user_id, platform })

    // Get the user's social connection for the specified platform
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('platform', platform)
      .eq('is_connected', true)
      .single()

    console.log('Connection result:', { connection, connectionError })

    if (connectionError || !connection) {
      console.error('No connection found:', connectionError)
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
      postResult = await postToLinkedIn(connection.access_token, content, event_id, image_url)
      externalPostId = postResult.id
    } else if (platform === 'facebook') {
      postResult = await postToFacebook(connection.access_token, content, event_id, image_url)
      externalPostId = postResult.id
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For immediate posts, we can optionally create a record or just log success
    console.log(`Successfully posted to ${platform}:`, externalPostId)
    
    // If this was an immediate post, we can store it in scheduled_posts with status 'posted'
    if (!scheduled_time) {
      const { error: insertError } = await supabase
        .from('scheduled_posts')
        .insert({
          user_id: user_id,
          connection_id: connection.id,
          platform: platform,
          content: content,
          scheduled_time: new Date().toISOString(),
          status: 'posted',
          published_post_id: externalPostId,
          event_id: event_id,
          image_url: image_url
        })
      
      if (insertError) {
        console.error('Error creating post record:', insertError)
      }
    } else {
      // Update existing scheduled post
      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update({
          status: 'posted',
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
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function postToLinkedIn(accessToken: string, content: string, eventId?: string, imageUrl?: string) {
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
          shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
          ...(imageUrl && {
            media: [{
              status: 'READY',
              description: {
                text: 'Event promotion image'
              },
              media: imageUrl,
              title: {
                text: 'Event Image'
              }
            }]
          })
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

async function postToFacebook(accessToken: string, content: string, eventId?: string, imageUrl?: string) {
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
