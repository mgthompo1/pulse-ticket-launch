/**
 * AttractionEmbed - Embeddable booking widget for iframes
 * Minimal wrapper for embedding on external sites
 */

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { AttractionBookingWidgetV3 } from "@/components/attractions/v3";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AttractionStripePayment } from "@/components/payment/AttractionStripePayment";

interface AttractionData {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  duration_minutes: number;
  base_price: number;
  logo_url: string | null;
  widget_customization: any;
  organization_id: string;
  resource_label?: string | null;
  currency?: string;
}

interface BookingData {
  reference: string;
  date: string;
  time: string;
  partySize: number;
  customerInfo: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  total: number;
  selectedAddons?: { addon: any; quantity: number }[];
  selectedPackage?: any;
  selectedStaffId?: string;
}

const AttractionEmbed = () => {
  const { attractionId } = useParams();
  const [searchParams] = useSearchParams();
  const [attractionData, setAttractionData] = useState<AttractionData | null>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<BookingData | null>(null);

  // Parse configuration from URL params
  const config = {
    showStaff: searchParams.get('showStaff') !== 'false',
    showAddons: searchParams.get('showAddons') !== 'false',
    showPackages: searchParams.get('showPackages') !== 'false',
    showReviews: searchParams.get('showReviews') !== 'false',
    showUrgency: searchParams.get('showUrgency') !== 'false',
    compact: searchParams.get('compact') === 'true',
    primaryColor: searchParams.get('primaryColor'),
  };

  useEffect(() => {
    const loadData = async () => {
      if (!attractionId) {
        setError('No attraction ID provided');
        setLoading(false);
        return;
      }

      try {
        // Load attraction
        const { data: attraction, error: attractionError } = await supabase
          .from("attractions")
          .select("*")
          .eq("id", attractionId)
          .eq("status", "active")
          .single();

        if (attractionError) throw attractionError;
        if (!attraction) throw new Error("Attraction not found");

        setAttractionData(attraction);

        // Load requirements
        const { data: reqData } = await supabase
          .from("attraction_requirements")
          .select("*")
          .eq("attraction_id", attractionId)
          .order("display_order");

        if (reqData) setRequirements(reqData);

        // Load custom fields
        const { data: fieldsData } = await supabase
          .from("attraction_custom_fields")
          .select("*")
          .eq("attraction_id", attractionId)
          .eq("is_active", true)
          .order("display_order");

        if (fieldsData) setCustomFields(fieldsData);

      } catch (err: any) {
        console.error("Error loading attraction:", err);
        setError(err.message || 'Failed to load attraction');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [attractionId]);

  // Send message to parent window
  const postMessage = (type: string, data: any) => {
    if (window.parent !== window) {
      window.parent.postMessage({ type, data, source: 'ticketflo-embed' }, '*');
    }
  };

  // Handle booking completion
  const handleBookingComplete = (booking: any) => {
    setPendingBooking(booking);
    setShowPaymentModal(true);
    postMessage('booking_ready', { reference: booking.reference, total: booking.total });
  };

  // Handle payment success
  const handlePaymentSuccess = async () => {
    if (!pendingBooking || !attractionData) return;

    try {
      // Create booking in database
      const { data: newBooking, error: bookingError } = await supabase
        .from("attraction_bookings")
        .insert({
          attraction_id: attractionId,
          customer_name: `${pendingBooking.customerInfo.first_name} ${pendingBooking.customerInfo.last_name}`,
          customer_email: pendingBooking.customerInfo.email,
          customer_phone: pendingBooking.customerInfo.phone,
          booking_date: pendingBooking.date,
          party_size: pendingBooking.partySize,
          total_amount: pendingBooking.total,
          status: "confirmed",
          payment_status: "completed",
          booking_reference: pendingBooking.reference,
          resource_id: pendingBooking.selectedStaffId,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Save add-ons
      if (pendingBooking.selectedAddons?.length) {
        const addonsToInsert = pendingBooking.selectedAddons.map(({ addon, quantity }) => ({
          booking_id: newBooking.id,
          addon_id: addon.id,
          addon_name: addon.name,
          quantity,
          unit_price: addon.price,
          total_price: addon.price * quantity,
        }));

        await supabase.from("booking_add_ons").insert(addonsToInsert);
      }

      setShowPaymentModal(false);
      setPendingBooking(null);

      // Notify parent
      postMessage('booking_confirmed', {
        bookingId: newBooking.id,
        reference: pendingBooking.reference,
        email: pendingBooking.customerInfo.email,
      });

      // Trigger email notification
      try {
        await supabase.functions.invoke("send-attraction-confirmation", {
          body: { bookingId: newBooking.id, email: pendingBooking.customerInfo.email },
        });
      } catch (emailError) {
        console.error("Email notification failed:", emailError);
      }

    } catch (err) {
      console.error('Error completing booking:', err);
      postMessage('booking_error', { message: 'Failed to complete booking' });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error || !attractionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">{error || 'Attraction not available'}</p>
        </div>
      </div>
    );
  }

  const currency = attractionData.currency || 'USD';

  // Apply custom styling from URL params
  const customStyles = config.primaryColor ? {
    '--primary': config.primaryColor,
  } as React.CSSProperties : undefined;

  return (
    <div className="min-h-screen bg-white" style={customStyles}>
      <AttractionBookingWidgetV3
        attractionId={attractionId!}
        attraction={{
          id: attractionData.id,
          name: attractionData.name,
          description: attractionData.description || undefined,
          base_price: attractionData.base_price,
          currency: currency,
          duration_minutes: attractionData.duration_minutes,
          location: attractionData.venue || undefined,
          image_url: attractionData.logo_url || undefined,
          resource_label: attractionData.resource_label || undefined,
        }}
        requirements={requirements}
        customFields={customFields}
        showStaffSelector={config.showStaff}
        showAddons={config.showAddons}
        showPackages={config.showPackages}
        showReviews={config.showReviews}
        showUrgency={config.showUrgency}
        onBookingComplete={handleBookingComplete}
      />

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Payment</DialogTitle>
            <DialogDescription>
              {attractionData.name} - {pendingBooking?.partySize} guests
            </DialogDescription>
          </DialogHeader>

          {pendingBooking && (
            <div className="space-y-6 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="font-medium">{new Date(pendingBooking.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time</span>
                    <span className="font-medium">{pendingBooking.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Guests</span>
                    <span className="font-medium">{pendingBooking.partySize}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 mt-3 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${pendingBooking.total.toFixed(2)} {currency}</span>
                  </div>
                </div>
              </div>

              <AttractionStripePayment
                amount={pendingBooking.total}
                currency={currency}
                description={`${attractionData.name} - ${pendingBooking.partySize} guests`}
                customerEmail={pendingBooking.customerInfo.email}
                customerName={`${pendingBooking.customerInfo.first_name} ${pendingBooking.customerInfo.last_name}`}
                onSuccess={handlePaymentSuccess}
                onError={(err) => postMessage('payment_error', { message: err.message })}
                metadata={{
                  organization_id: attractionData.organization_id,
                  attraction_id: attractionData.id,
                  booking_reference: pendingBooking.reference,
                }}
                theme={{
                  primary: config.primaryColor || attractionData.widget_customization?.primaryColor || '#3b82f6',
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttractionEmbed;
