import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== SOCIAL MEDIA POST FUNCTION STARTED ===')
  console.log('Method:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method)
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Reading request body...')
    const { user_id, platform, content, scheduled_time, event_id, image_url } = await req.json()
    
    console.log('Request parameters:', { 
      user_id, 
      platform, 
      content: content?.substring(0, 50) + '...', 
      scheduled_time, 
      event_id, 
      image_url: image_url ? 'provided' : 'not provided' 
    })

    if (!user_id || !platform || !content) {
      console.error('Missing required parameters:', { user_id, platform, content: !!content })
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('Supabase client initialized')

    console.log('Looking for social connection for user:', user_id, 'platform:', platform)

    // Get the user's social connection for the specified platform
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('platform', platform)
      .eq('is_connected', true)
      .single()

    console.log('Connection query result:', { 
      found: !!connection, 
      connectionError: connectionError?.message,
      connectionId: connection?.id 
    })

    if (connectionError || !connection) {
      console.error('No connection found:', connectionError)
      return new Response(
        JSON.stringify({ error: `No active ${platform} connection found. Please reconnect your ${platform} account.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token is expired
    if (connection.expires_at && new Date(connection.expires_at) <= new Date()) {
      console.error('Token expired for connection:', connection.id)
      return new Response(
        JSON.stringify({ error: `${platform} access token has expired. Please reconnect your account.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Valid connection found, proceeding to post to:', platform)

    let postResult: any
    let externalPostId: string

    // Post to the appropriate platform
    if (platform === 'linkedin') {
      console.log('Starting LinkedIn post...')
      postResult = await postToLinkedIn(connection.access_token, content, event_id, image_url)
      externalPostId = postResult.id
      console.log('LinkedIn post completed with ID:', externalPostId)
    } else if (platform === 'facebook') {
      console.log('Starting Facebook post...')
      postResult = await postToFacebook(connection.access_token, content, event_id, image_url)
      externalPostId = postResult.id
      console.log('Facebook post completed with ID:', externalPostId)
    } else {
      console.error('Unsupported platform:', platform)
      return new Response(
        JSON.stringify({ error: 'Unsupported platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Post successful, recording in database...')

    // Record the post in the database
    if (!scheduled_time) {
      // This was an immediate post
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
      } else {
        console.log('Post record created successfully')
      }
    } else {
      // This was a scheduled post being executed
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
      } else {
        console.log('Post status updated successfully')
      }
    }

    console.log('=== SUCCESS: Post completed successfully ===')
    return new Response(
      JSON.stringify({
        success: true,
        platform,
        post_id: externalPostId,
        message: `Successfully posted to ${platform}`,
        linkedin_url: platform === 'linkedin' ? `https://www.linkedin.com/feed/update/${externalPostId}` : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== ERROR in social media post function ===')
    console.error('Error:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function postToLinkedIn(accessToken: string, content: string, eventId?: string, imageUrl?: string) {
  console.log('=== LINKEDIN POST FUNCTION ===')
  console.log('Content length:', content.length)
  console.log('Has image:', !!imageUrl)
  
  try {
    // Get LinkedIn person ID first
    console.log('Getting LinkedIn person ID...')
    const personId = await getLinkedInPersonId(accessToken)
    console.log('LinkedIn person ID received:', personId)

    // Prepare the post payload
    const postPayload = {
      author: `urn:li:person:${personId}`,
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
    }

    console.log('LinkedIn post payload prepared')
    console.log('Post payload preview:', JSON.stringify({
      ...postPayload,
      specificContent: {
        ...postPayload.specificContent,
        'com.linkedin.ugc.ShareContent': {
          ...postPayload.specificContent['com.linkedin.ugc.ShareContent'],
          shareCommentary: { text: content.substring(0, 50) + '...' }
        }
      }
    }, null, 2))

    console.log('Making request to LinkedIn API...')
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202405',
      },
      body: JSON.stringify(postPayload)
    })

    console.log('LinkedIn API response status:', response.status)
    console.log('LinkedIn API response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('LinkedIn API response body:', responseText)

    if (!response.ok) {
      console.error('LinkedIn API error response:', responseText)
      throw new Error(`LinkedIn API error: ${response.status} - ${responseText}`)
    }

    const result = JSON.parse(responseText)
    console.log('LinkedIn post successful, ID:', result.id)
    return result

  } catch (error) {
    console.error('Error in LinkedIn posting:', error)
    throw error
  }
}

async function postToFacebook(accessToken: string, content: string, eventId?: string, imageUrl?: string) {
  console.log('=== FACEBOOK POST FUNCTION ===')
  
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

  console.log('Facebook API response status:', response.status)
  const responseText = await response.text()
  console.log('Facebook API response:', responseText)

  if (!response.ok) {
    throw new Error(`Facebook API error: ${response.status} - ${responseText}`)
  }

  return JSON.parse(responseText)
}

async function getLinkedInPersonId(accessToken: string): Promise<string> {
  console.log('Getting LinkedIn person ID...')
  
  const response = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    }
  })

  console.log('LinkedIn /me API response status:', response.status)
  const responseText = await response.text()
  console.log('LinkedIn /me API response body:', responseText)

  if (!response.ok) {
    throw new Error(`Failed to get LinkedIn person ID: ${response.status} - ${responseText}`)
  }

  const data = JSON.parse(responseText)
  console.log('LinkedIn person ID extracted:', data.id)
  return data.id
}