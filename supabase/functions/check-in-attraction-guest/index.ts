import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckInRequest {
  bookingReference: string;
  staffId?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingReference, staffId, notes } = await req.json() as CheckInRequest;

    if (!bookingReference) {
      return new Response(
        JSON.stringify({ error: "Booking reference is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find the booking by reference
    const { data: booking, error: bookingError } = await supabase
      .from("attraction_bookings")
      .select(`
        *,
        attractions:attraction_id (
          id,
          name,
          resource_label
        ),
        booking_slots:attraction_booking_slots (
          slot:attraction_time_slots (
            id,
            start_time,
            end_time
          )
        )
      `)
      .eq("booking_reference", bookingReference.toUpperCase())
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check booking status
    if (booking.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: "This booking has been cancelled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.status === "pending") {
      return new Response(
        JSON.stringify({ error: "This booking is still pending payment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already checked in
    if (booking.checked_in_at) {
      return new Response(
        JSON.stringify({
          error: "Guest already checked in",
          checkedInAt: booking.checked_in_at,
          booking: {
            id: booking.id,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            party_size: booking.party_size,
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Perform check-in by updating the booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from("attraction_bookings")
      .update({
        checked_in_at: new Date().toISOString(),
        checked_in_by: staffId || null,
        notes: notes ? (booking.notes ? `${booking.notes}\n\nCheck-in notes: ${notes}` : `Check-in notes: ${notes}`) : booking.notes,
      })
      .eq("id", booking.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Get waiver status if waivers are required
    const { data: waivers } = await supabase
      .from("waiver_signatures")
      .select("id, signed_at")
      .eq("booking_id", booking.id);

    const { data: requiredWaivers } = await supabase
      .from("waiver_templates")
      .select("id")
      .eq("attraction_id", booking.attraction_id)
      .eq("is_active", true)
      .in("waiver_timing", ["at_checkin", "both"]);

    const waiverStatus = {
      signed: waivers?.length || 0,
      required: requiredWaivers?.length || 0,
      complete: (requiredWaivers?.length || 0) === 0 || (waivers?.length || 0) >= (requiredWaivers?.length || 0),
    };

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: updatedBooking.id,
          booking_reference: updatedBooking.booking_reference,
          customer_name: updatedBooking.customer_name,
          customer_email: updatedBooking.customer_email,
          customer_phone: updatedBooking.customer_phone,
          party_size: updatedBooking.party_size,
          total_amount: updatedBooking.total_amount,
          checked_in_at: updatedBooking.checked_in_at,
          attraction: booking.attractions,
          slot: booking.booking_slots?.[0]?.slot,
        },
        waiverStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Attraction Check-in Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
