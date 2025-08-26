import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== FUNCTION STARTED ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== PROCESSING REQUEST ===')
    
    if (req.method !== 'POST') {
      console.log('Method not allowed')
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Reading request body...')
    const body = await req.json()
    console.log('Request body:', JSON.stringify(body, null, 2))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test function working!',
        received: body 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== ERROR OCCURRED ===')
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