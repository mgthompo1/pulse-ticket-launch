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
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Checking for scheduled posts to publish...')

    // Get posts that are scheduled for now or earlier
    const now = new Date().toISOString()
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select(`
        *,
        social_connections!inner(access_token, refresh_token, expires_at)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError)
      throw fetchError
    }

    console.log(`Found ${scheduledPosts?.length || 0} posts to publish`)

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No posts to publish', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let publishedCount = 0
    let failedCount = 0

    // Process each scheduled post
    for (const post of scheduledPosts) {
      try {
        console.log(`Publishing post ${post.id} to ${post.platform}`)
        
        if (post.platform === 'linkedin') {
          await publishToLinkedIn(post, supabase)
          publishedCount++
        } else {
          console.log(`Platform ${post.platform} not yet supported`)
          await updatePostStatus(post.id, 'failed', 'Platform not supported', supabase)
          failedCount++
        }
      } catch (error) {
        console.error(`Failed to publish post ${post.id}:`, error)
        await updatePostStatus(post.id, 'failed', error.message, supabase)
        failedCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Batch publish completed',
        published: publishedCount,
        failed: failedCount,
        total: scheduledPosts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in publish-scheduled-posts:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function publishToLinkedIn(post: any, supabase: any) {
  const connection = post.social_connections
  
  if (!connection || !connection.access_token) {
    throw new Error('No valid LinkedIn access token found')
  }

  // Check if token is expired and refresh if needed
  let accessToken = connection.access_token
  if (connection.expires_at && new Date(connection.expires_at) <= new Date()) {
    console.log('Access token expired, refreshing...')
    // TODO: Implement token refresh logic
    throw new Error('Access token expired and refresh not implemented')
  }

  // Prepare LinkedIn post payload
  const linkedInPayload = {
    author: `urn:li:person:${await getLinkedInUserId(accessToken)}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: post.content
        },
        shareMediaCategory: post.image_url ? 'IMAGE' : 'NONE',
        ...(post.image_url && {
          media: [{
            status: 'READY',
            description: {
              text: 'Event promotion image'
            },
            media: post.image_url,
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

  // Post to LinkedIn
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(linkedInPayload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('LinkedIn API error:', errorText)
    throw new Error(`LinkedIn API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  console.log('LinkedIn post published successfully:', result.id)

  // Update post status to published
  await updatePostStatus(post.id, 'posted', null, supabase, result.id)
}

async function getLinkedInUserId(accessToken: string): Promise<string> {
  const response = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0'
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get LinkedIn user ID')
  }

  const userData = await response.json()
  return userData.id
}

async function updatePostStatus(
  postId: string, 
  status: string, 
  errorMessage: string | null, 
  supabase: any,
  publishedPostId?: string
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  }

  if (errorMessage) {
    updateData.error_message = errorMessage
  }

  if (publishedPostId) {
    updateData.published_post_id = publishedPostId
  }

  const { error } = await supabase
    .from('scheduled_posts')
    .update(updateData)
    .eq('id', postId)

  if (error) {
    console.error('Error updating post status:', error)
  }
}