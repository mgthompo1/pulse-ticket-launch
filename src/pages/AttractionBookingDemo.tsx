import React from "react";
import BookingWidget from "@/components/BookingWidget";

/**
 * Demo page for the Attraction Booking Widget
 *
 * To add this to your app, import and use in your routes:
 *
 * Example usage in your main App or router:
 * <Route path="/book/:attractionId" element={<AttractionBookingDemo />} />
 */

export default function AttractionBookingDemo() {
  // This would come from your Supabase query based on route params
  const experienceData = {
    title: "Karaoke Session",
    durationMin: 60,
    venue: "Homewood City Fire Station",
    org: "Mitch's Ticket Company",
    basePrice: 50,
    currency: "USD",
    timezone: "America/Chicago",
    description: "Private karaoke room with professional audio equipment",
    highlights: [
      "Private room with pro audio system",
      "Access to 50,000+ songs in multiple languages",
      "Song queue & wireless remote control",
      "BYO snacks and drinks; refreshments available on-site",
      "Free parking and easy access",
    ],
    coverImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=400&fit=crop", // Optional
  };

  // Replace this with your actual Supabase fetch function
  const fetchAvailability = async ({ dateISO, partySize }: { dateISO: string; partySize: number }) => {
    console.log("🔍 Fetching slots for:", { dateISO, partySize });

    // Example Supabase query:
    // const { data, error } = await supabase
    //   .from('attraction_slots')
    //   .select('*')
    //   .eq('attraction_id', attractionId)
    //   .eq('date', dateISO)
    //   .gte('capacity', partySize)
    //   .order('start_time');

    // For now, use the demo function
    const { demoFetchSlots } = await import("@/components/BookingWidget");
    return demoFetchSlots(dateISO, partySize);
  };

  const handleContinue = (bookingState: any) => {
    console.log("📋 Booking state:", bookingState);

    // Navigate to checkout/payment page with booking details
    // Example:
    // navigate('/checkout', { state: bookingState });

    // Or create order in Supabase:
    // const { data, error } = await supabase
    //   .from('orders')
    //   .insert({
    //     attraction_id: attractionId,
    //     party_size: bookingState.partySize,
    //     booking_date: bookingState.dateISO,
    //     time_slot_id: bookingState.slotId,
    //     total_amount: bookingState.totalPrice,
    //   });

    alert(`Great! Proceeding to checkout...\n\nDetails:\n${JSON.stringify(bookingState, null, 2)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <BookingWidget
        experience={experienceData}
        fetchSlots={fetchAvailability}
        onContinue={handleContinue}
      />
    </div>
  );
}

/**
 * Integration Guide
 * ==================
 *
 * 1. Create attraction_slots table in Supabase:
 *
 * ```sql
 * create table attraction_slots (
 *   id uuid primary key default uuid_generate_v4(),
 *   attraction_id uuid references attractions(id),
 *   date date not null,
 *   start_time time not null,
 *   end_time time not null,
 *   capacity int not null,
 *   booked int default 0,
 *   price numeric(10,2) not null,
 *   created_at timestamptz default now()
 * );
 *
 * create index on attraction_slots (attraction_id, date);
 * ```
 *
 * 2. Query real availability:
 *
 * ```typescript
 * const fetchAvailability = async ({ dateISO, partySize }) => {
 *   const { data, error } = await supabase
 *     .from('attraction_slots')
 *     .select('*')
 *     .eq('attraction_id', attractionId)
 *     .eq('date', dateISO)
 *     .order('start_time');
 *
 *   if (error) throw error;
 *
 *   return data.map(slot => ({
 *     id: slot.id,
 *     timeLabel: formatTime(slot.start_time), // "09:00 AM"
 *     remaining: slot.capacity - slot.booked,
 *     available: (slot.capacity - slot.booked) >= partySize,
 *   }));
 * };
 * ```
 *
 * 3. Add to your router:
 *
 * ```typescript
 * // In your App.tsx or routes file
 * import AttractionBookingDemo from '@/pages/AttractionBookingDemo';
 *
 * <Routes>
 *   <Route path="/attractions/:id/book" element={<AttractionBookingDemo />} />
 * </Routes>
 * ```
 */
