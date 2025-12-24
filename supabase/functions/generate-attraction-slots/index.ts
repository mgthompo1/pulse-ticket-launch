import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GenerateSlotsRequest {
  attractionId: string
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
}

serve(async (req) => {
  console.log("=== GENERATE ATTRACTION SLOTS FUNCTION STARTED ===")

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { attractionId, startDate, endDate }: GenerateSlotsRequest = await req.json()

    if (!attractionId || !startDate || !endDate) {
      throw new Error('attractionId, startDate, and endDate are required')
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD')
    }

    if (end < start) {
      throw new Error('endDate must be after startDate')
    }

    // Limit to 90 days max
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 90) {
      throw new Error('Cannot generate slots for more than 90 days at once')
    }

    console.log(`Generating slots for attraction ${attractionId} from ${startDate} to ${endDate}`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Call the database function
    const { data, error } = await supabase.rpc('generate_attraction_slots', {
      p_attraction_id: attractionId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) {
      console.error('Error generating slots:', error)
      throw new Error(`Failed to generate slots: ${error.message}`)
    }

    const slotsCreated = data || 0
    console.log(`Generated ${slotsCreated} slots`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${slotsCreated} slots`,
        slotsCreated: slotsCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in generate-attraction-slots:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
