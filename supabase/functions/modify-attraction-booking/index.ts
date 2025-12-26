import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ModifyRequest {
  bookingId: string;
  bookingReference?: string;
  customerEmail?: string;
  action: 'reschedule' | 'modify_party_size' | 'cancel';
  newSlotId?: string;
  newPartySize?: number;
  reason?: string;
}

serve(async (req) => {
  console.log("=== MODIFY ATTRACTION BOOKING ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: ModifyRequest = await req.json();
    const { bookingId, bookingReference, customerEmail, action, newSlotId, newPartySize, reason } = request;

    console.log("Modification request:", { bookingId, bookingReference, action });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Find the booking
    let bookingQuery = supabaseClient
      .from("attraction_bookings")
      .select(`
        *,
        booking_slots (
          id,
          start_time,
          end_time,
          max_capacity,
          current_bookings
        ),
        attractions (
          id,
          name,
          organization_id,
          base_price,
          currency,
          allow_modifications,
          modification_deadline_hours
        )
      `);

    if (bookingId) {
      bookingQuery = bookingQuery.eq("id", bookingId);
    } else if (bookingReference && customerEmail) {
      bookingQuery = bookingQuery
        .eq("booking_reference", bookingReference)
        .eq("customer_email", customerEmail);
    } else {
      throw new Error("Either bookingId or both bookingReference and customerEmail are required");
    }

    const { data: booking, error: bookingError } = await bookingQuery.single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message || 'No booking'}`);
    }

    console.log("Found booking:", booking.id, "status:", booking.booking_status);

    // Check if booking can be modified
    if (booking.booking_status === 'cancelled') {
      throw new Error("Cannot modify a cancelled booking");
    }

    if (booking.booking_status !== 'confirmed' && booking.booking_status !== 'pending') {
      throw new Error("Booking cannot be modified in its current state");
    }

    // Check modification deadline
    const attraction = booking.attractions;
    if (attraction.modification_deadline_hours) {
      const slotStart = new Date(booking.booking_slots.start_time);
      const deadline = new Date(slotStart.getTime() - (attraction.modification_deadline_hours * 60 * 60 * 1000));
      if (new Date() > deadline) {
        throw new Error(`Modifications must be made at least ${attraction.modification_deadline_hours} hours before the booking`);
      }
    }

    let result: any = { success: false };

    switch (action) {
      case 'reschedule': {
        if (!newSlotId) {
          throw new Error("newSlotId is required for rescheduling");
        }

        // Get new slot details
        const { data: newSlot, error: slotError } = await supabaseClient
          .from("booking_slots")
          .select("*")
          .eq("id", newSlotId)
          .eq("attraction_id", booking.attraction_id)
          .single();

        if (slotError || !newSlot) {
          throw new Error("New time slot not found");
        }

        // Check capacity
        const availableCapacity = newSlot.max_capacity - newSlot.current_bookings;
        if (availableCapacity < booking.party_size) {
          throw new Error(`Not enough capacity in the new slot. Available: ${availableCapacity}, Needed: ${booking.party_size}`);
        }

        // Start transaction-like updates
        // 1. Decrement old slot
        await supabaseClient
          .from("booking_slots")
          .update({
            current_bookings: Math.max(0, booking.booking_slots.current_bookings - booking.party_size)
          })
          .eq("id", booking.booking_slot_id);

        // 2. Increment new slot
        await supabaseClient
          .from("booking_slots")
          .update({
            current_bookings: newSlot.current_bookings + booking.party_size
          })
          .eq("id", newSlotId);

        // 3. Update booking
        const { error: updateError } = await supabaseClient
          .from("attraction_bookings")
          .update({
            booking_slot_id: newSlotId,
            updated_at: new Date().toISOString()
          })
          .eq("id", booking.id);

        if (updateError) {
          // Rollback slot changes
          await supabaseClient
            .from("booking_slots")
            .update({ current_bookings: booking.booking_slots.current_bookings })
            .eq("id", booking.booking_slot_id);
          await supabaseClient
            .from("booking_slots")
            .update({ current_bookings: newSlot.current_bookings })
            .eq("id", newSlotId);
          throw updateError;
        }

        // Send confirmation email
        try {
          await supabaseClient.functions.invoke('send-booking-email', {
            body: { bookingId: booking.id }
          });
        } catch (e) {
          console.error("Failed to send reschedule confirmation:", e);
        }

        result = {
          success: true,
          message: "Booking rescheduled successfully",
          newSlot: {
            id: newSlot.id,
            startTime: newSlot.start_time,
            endTime: newSlot.end_time
          }
        };
        break;
      }

      case 'modify_party_size': {
        if (!newPartySize || newPartySize < 1) {
          throw new Error("newPartySize must be at least 1");
        }

        const sizeDiff = newPartySize - booking.party_size;
        const slot = booking.booking_slots;

        // Check if increasing party size
        if (sizeDiff > 0) {
          const availableCapacity = slot.max_capacity - slot.current_bookings;
          if (availableCapacity < sizeDiff) {
            throw new Error(`Cannot increase party size. Only ${availableCapacity} additional spots available`);
          }
        }

        // Calculate new total
        const pricePerPerson = attraction.base_price;
        const newTotal = pricePerPerson * newPartySize;
        const priceDiff = newTotal - booking.total_amount;

        // Update slot count
        await supabaseClient
          .from("booking_slots")
          .update({
            current_bookings: slot.current_bookings + sizeDiff
          })
          .eq("id", slot.id);

        // Update booking
        const { error: updateError } = await supabaseClient
          .from("attraction_bookings")
          .update({
            party_size: newPartySize,
            total_amount: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq("id", booking.id);

        if (updateError) throw updateError;

        result = {
          success: true,
          message: "Party size updated successfully",
          oldPartySize: booking.party_size,
          newPartySize,
          oldTotal: booking.total_amount,
          newTotal,
          priceDifference: priceDiff,
          requiresAdditionalPayment: priceDiff > 0
        };
        break;
      }

      case 'cancel': {
        // Release slot capacity
        await supabaseClient
          .from("booking_slots")
          .update({
            current_bookings: Math.max(0, booking.booking_slots.current_bookings - booking.party_size)
          })
          .eq("id", booking.booking_slot_id);

        // Update booking status
        const { error: updateError } = await supabaseClient
          .from("attraction_bookings")
          .update({
            booking_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq("id", booking.id);

        if (updateError) throw updateError;

        // Note: For full cancellation with refund, use stripe-refund-attraction instead
        result = {
          success: true,
          message: "Booking cancelled successfully. For refunds, please contact support.",
          bookingId: booking.id,
          refundNote: booking.payment_status === 'completed'
            ? "Payment was received. Please process refund separately."
            : "No refund needed - payment was not completed."
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log the modification
    try {
      await supabaseClient
        .from("security_audit_log")
        .insert({
          event_type: "attraction_booking_modified",
          event_data: {
            bookingId: booking.id,
            bookingReference: booking.booking_reference,
            action,
            reason,
            result
          }
        });
    } catch (e) {
      console.error("Failed to log modification:", e);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Modification error:", error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
