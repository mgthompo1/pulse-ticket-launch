import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    // Call the publish-scheduled-posts function
    const publishResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-scheduled-posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await publishResponse.json()
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Post publisher triggered successfully',
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error triggering post publisher:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to trigger post publisher', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})