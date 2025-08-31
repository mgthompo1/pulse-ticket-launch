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
    // Create Supabase client with service role key for bypassing RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { 
      attraction_id,
      booking_slot_id,
      organization_id,
      customer_name,
      customer_email,
      customer_phone,
      party_size,
      special_requests,
      total_amount
    } = await req.json()

    // Validate required fields
    if (!attraction_id || !booking_slot_id || !organization_id || !customer_name || !customer_email || !party_size || total_amount === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the attraction exists and is active
    const { data: attraction, error: attractionError } = await supabaseAdmin
      .from('attractions')
      .select('id, status, organization_id')
      .eq('id', attraction_id)
      .eq('status', 'active')
      .single()

    if (attractionError || !attraction) {
      return new Response(
        JSON.stringify({ error: 'Attraction not found or inactive' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the booking slot exists and is available
    const { data: slot, error: slotError } = await supabaseAdmin
      .from('booking_slots')
      .select('id, status, max_capacity, current_bookings, attraction_id')
      .eq('id', booking_slot_id)
      .eq('status', 'available')
      .single()

    if (slotError || !slot) {
      return new Response(
        JSON.stringify({ error: 'Booking slot not found or unavailable' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if slot has capacity
    if (slot.current_bookings + party_size > slot.max_capacity) {
      return new Response(
        JSON.stringify({ error: 'Not enough capacity in this time slot' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate booking reference
    const shortRef = `BK${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(-3).toUpperCase()}`;

    // Create the booking using service role (bypasses RLS)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('attraction_bookings')
      .insert({
        attraction_id,
        booking_slot_id,
        organization_id,
        customer_name,
        customer_email,
        customer_phone: customer_phone || null,
        party_size,
        special_requests: special_requests || null,
        total_amount,
        payment_status: 'pending',
        booking_status: 'pending',
        booking_reference: shortRef
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return new Response(
        JSON.stringify({ error: 'Failed to create booking', details: bookingError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ booking }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
