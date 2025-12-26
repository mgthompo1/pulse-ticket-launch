import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ErrorLogRequest {
  error: {
    message: string
    stack?: string
    severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical'
  }
  context?: {
    function_name?: string
    user_id?: string
    event_id?: string
    organization_id?: string
    [key: string]: any
  }
  timestamp?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: ErrorLogRequest = await req.json()
    const { error, context, timestamp } = body

    if (!error || !error.message) {
      throw new Error('Missing required field: error.message')
    }

    // Log to Supabase error_logs table
    const { data, error: insertError } = await supabase
      .from('error_logs')
      .insert({
        error_message: error.message,
        error_stack: error.stack || null,
        context: context || {},
        severity: error.severity || 'error',
        function_name: context?.function_name || null,
        user_id: context?.user_id || null,
        timestamp: timestamp || new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Failed to insert error log:', insertError)
      throw insertError
    }

    console.log('✅ Error logged successfully:', data?.id)

    // Report critical errors to Kodo
    if (error.severity === 'critical' || error.severity === 'error') {
      console.warn('🚨 CRITICAL ERROR LOGGED:', error.message)

      const kodoApiKey = Deno.env.get('KODO_API_KEY')
      const kodoUrl = Deno.env.get('KODO_URL') || 'https://kodostatus.com'

      if (kodoApiKey) {
        try {
          await fetch(`${kodoUrl}/api/v1/incidents`, {
            method: 'POST',
            headers: {
              'X-API-Key': kodoApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: `${context?.function_name || 'Edge Function'}: ${error.message.substring(0, 50)}`,
              severity: error.severity === 'critical' ? 'critical' : 'major',
              status: 'investigating',
              message: `Function: ${context?.function_name || 'Unknown'}\n\nError: ${error.message}\n\nStack: ${error.stack?.substring(0, 500) || 'No stack trace'}`,
              services: ['API'],
            }),
          })
          console.log('📊 Error reported to Kodo')
        } catch (kodoError) {
          console.error('Failed to report to Kodo:', kodoError)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        logId: data?.id,
        message: 'Error logged successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (err) {
    console.error('❌ Error in log-error function:', err)
    return new Response(
      JSON.stringify({
        error: err.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
