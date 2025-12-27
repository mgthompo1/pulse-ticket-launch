/**
 * AttractionWidget - Public booking page for attractions
 * Uses V3 booking widget with Stripe payment integration
 */

import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, AlertCircle } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { AttractionBookingWidgetV3 } from "@/components/attractions/v3";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AttractionStripePayment } from "@/components/payment/AttractionStripePayment";
import { AttractionWindcavePayment } from "@/components/payment/AttractionWindcavePayment";

interface AttractionData {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  attraction_type: string;
  vertical_type?: string;
  duration_minutes: number;
  base_price: number;
  max_concurrent_bookings: number;
  logo_url: string | null;
  widget_customization: any;
  organization_id: string;
  status: string;
  resource_label?: string | null;
  currency?: string;
  timezone?: string;
}

interface OrganizationData {
  id: string;
  name: string;
  logo_url: string | null;
  payment_provider?: 'stripe' | 'windcave';
  currency?: string;
}

interface BookingData {
  id?: string;
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

const AttractionWidget = () => {
  const { attractionId } = useParams();
  const { toast } = useToast();
  const [attractionData, setAttractionData] = useState<AttractionData | null>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<BookingData | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Load attraction and related data
  const loadAttractionData = async () => {
    if (!attractionId) return;

    try {
      setLoading(true);

      // Load attraction details
      const { data: attraction, error: attractionError } = await supabase
        .from("attractions")
        .select("*")
        .eq("id", attractionId)
        .eq("status", "active")
        .single();

      if (attractionError) {
        console.error("Attraction error:", attractionError);
        throw attractionError;
      }

      if (!attraction) {
        throw new Error("Attraction not found or not active");
      }

      console.log('🎯 Attraction loaded:', attraction.name);
      setAttractionData(attraction);

      // Load organization details including payment provider
      if (attraction.organization_id) {
        const { data: organization, error: orgError } = await supabase
          .from("organizations")
          .select("id, name, logo_url, payment_provider, currency")
          .eq("id", attraction.organization_id)
          .single();

        if (!orgError && organization) {
          setOrganizationData(organization);
        }
      }

      // Load requirements
      const { data: reqData } = await supabase
        .from("attraction_requirements")
        .select("*")
        .eq("attraction_id", attractionId)
        .order("display_order");

      if (reqData) {
        setRequirements(reqData);
      }

      // Load custom fields
      const { data: fieldsData } = await supabase
        .from("attraction_custom_fields")
        .select("*")
        .eq("attraction_id", attractionId)
        .eq("is_active", true)
        .order("display_order");

      if (fieldsData) {
        setCustomFields(fieldsData);
      }

    } catch (error) {
      console.error("Error loading attraction data:", error);
      toast({
        title: "Error",
        description: "Failed to load attraction information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attractionId) {
      loadAttractionData();
    }
  }, [attractionId]);

  // Handle booking completion - triggers payment modal
  const handleBookingComplete = (booking: any) => {
    console.log("📋 Booking ready for payment:", booking);
    setPendingBooking(booking);
    setShowPaymentModal(true);
  };

  // Handle successful payment
  const handlePaymentSuccess = async () => {
    if (!pendingBooking || !attractionData) return;

    try {
      setPaymentProcessing(true);

      // Create the booking in database
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

      toast({
        title: "Booking Confirmed! 🎉",
        description: `Confirmation sent to ${pendingBooking.customerInfo.email}`,
      });

      setShowPaymentModal(false);
      setPendingBooking(null);

      // Trigger email notification via edge function
      try {
        await supabase.functions.invoke("send-attraction-confirmation", {
          body: {
            bookingId: newBooking.id,
            email: pendingBooking.customerInfo.email,
          },
        });
      } catch (emailError) {
        console.error("Email notification failed:", emailError);
        // Don't fail the booking for email errors
      }

    } catch (error) {
      console.error('Error completing booking:', error);
      toast({
        title: "Error",
        description: "Failed to complete booking. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Handle payment error
  const handlePaymentError = (error: Error) => {
    toast({
      title: "Payment Failed",
      description: error.message,
      variant: "destructive",
    });
  };

  // Loading state
  if (loading) {
    return (
      <>
        <SEOHead
          title="Loading Attraction - TicketFlo"
          description="Loading attraction details..."
        />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-gray-700">Loading attraction...</p>
          </div>
        </div>
      </>
    );
  }

  // Not found state
  if (!attractionData) {
    return (
      <>
        <SEOHead
          title="Attraction Not Found - TicketFlo"
          description="The attraction you're looking for could not be found or is not active."
        />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h1 className="text-2xl font-bold mb-2 text-gray-900">
              Attraction Not Found
            </h1>
            <p className="text-gray-600">
              The attraction you're looking for could not be found or is no longer active.
            </p>
          </div>
        </div>
      </>
    );
  }

  const currency = attractionData.currency || 'USD';

  return (
    <>
      <SEOHead
        title={`${attractionData.name} - Book Now | ${organizationData?.name || 'TicketFlo'}`}
        description={attractionData.description || `Book your ${attractionData.name} experience. From $${attractionData.base_price} for ${attractionData.duration_minutes} minutes.`}
        ogTitle={`${attractionData.name} - Book Now`}
        ogDescription={attractionData.description || `Book your ${attractionData.name} experience.`}
        ogImage={attractionData.logo_url || organizationData?.logo_url || "https://www.ticketflo.org/og-image.jpg"}
        canonical={`https://www.ticketflo.org/attraction/${attractionId}`}
      />

      {/* V3 Booking Widget */}
      <AttractionBookingWidgetV3
        attractionId={attractionId!}
        organizationId={attractionData.organization_id}
        attraction={{
          id: attractionData.id,
          name: attractionData.name,
          description: attractionData.description || undefined,
          base_price: attractionData.base_price,
          currency: currency,
          duration_minutes: attractionData.duration_minutes,
          location: attractionData.venue || undefined,
          image_url: attractionData.logo_url || undefined,
          resource_label: attractionData.widget_customization?.resourceLabel || undefined,
          timezone: attractionData.timezone || 'Pacific/Auckland',
          vertical_type: attractionData.vertical_type as any,
          hero_settings: attractionData.widget_customization ? {
            layout: attractionData.widget_customization.heroLayout || 'fullwidth',
            showGallery: true,
            showRating: attractionData.widget_customization.showReviews !== false,
            showBookingCount: attractionData.widget_customization.showSocialProof !== false,
            overlayOpacity: (attractionData.widget_customization.heroOverlayOpacity ?? 50) / 100, // Convert 0-100 to 0-1
            ctaText: attractionData.widget_customization.ctaButtonText || 'Book Now',
            showFloatingCard: attractionData.widget_customization.showFloatingCard !== false,
          } : undefined,
        }}
        theme={attractionData.widget_customization ? {
          primaryColor: attractionData.widget_customization.primaryColor,
          accentColor: attractionData.widget_customization.accentColor,
          borderRadius: attractionData.widget_customization.borderRadius,
          fontFamily: attractionData.widget_customization.fontFamily,
          compactMode: attractionData.widget_customization.compactMode,
          hidePrice: attractionData.widget_customization.hidePrice,
          showTrustSignals: attractionData.widget_customization.showTrustSignals,
          customCss: attractionData.widget_customization.customCss,
        } : undefined}
        trustSignals={attractionData.widget_customization?.trustSignals}
        requirements={requirements}
        customFields={customFields}
        showStaffSelector={attractionData.widget_customization?.showStaffSelector !== false}
        showAddons={attractionData.widget_customization?.showAddons !== false}
        showPackages={attractionData.widget_customization?.showPackages !== false}
        showReviews={attractionData.widget_customization?.showReviews !== false}
        showUrgency={attractionData.widget_customization?.showUrgency !== false}
        showSocialProof={attractionData.widget_customization?.showSocialProof !== false}
        onBookingComplete={handleBookingComplete}
      />

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Payment</DialogTitle>
            <DialogDescription>
              {attractionData.name} - {pendingBooking?.partySize} {pendingBooking?.partySize === 1 ? 'guest' : 'guests'}
            </DialogDescription>
          </DialogHeader>

          {pendingBooking && (
            <div className="space-y-6 mt-4">
              {/* Booking Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Booking Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="font-medium">{new Date(pendingBooking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time</span>
                    <span className="font-medium">{pendingBooking.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Guests</span>
                    <span className="font-medium">{pendingBooking.partySize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contact</span>
                    <span className="font-medium">{pendingBooking.customerInfo.email}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 mt-3 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${pendingBooking.total.toFixed(2)} {currency}</span>
                  </div>
                </div>
              </div>

              {/* Payment Form - Stripe or Windcave based on org settings */}
              {organizationData?.payment_provider === 'windcave' ? (
                <AttractionWindcavePayment
                  attractionId={attractionData.id}
                  bookingId={pendingBooking.id || pendingBooking.reference}
                  amount={pendingBooking.total}
                  currency={currency}
                  description={`${attractionData.name} - ${pendingBooking.partySize} guests`}
                  customerEmail={pendingBooking.customerInfo.email}
                  customerName={`${pendingBooking.customerInfo.first_name} ${pendingBooking.customerInfo.last_name}`}
                  onSuccess={() => handlePaymentSuccess()}
                  onError={handlePaymentError}
                  theme={{
                    primary: attractionData.widget_customization?.primaryColor || '#3b82f6',
                  }}
                />
              ) : (
                <AttractionStripePayment
                  amount={pendingBooking.total}
                  currency={currency}
                  description={`${attractionData.name} - ${pendingBooking.partySize} guests`}
                  customerEmail={pendingBooking.customerInfo.email}
                  customerName={`${pendingBooking.customerInfo.first_name} ${pendingBooking.customerInfo.last_name}`}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  metadata={{
                    organization_id: attractionData.organization_id,
                    attraction_id: attractionData.id,
                    booking_reference: pendingBooking.reference,
                    booking_date: pendingBooking.date,
                    booking_time: pendingBooking.time,
                    party_size: String(pendingBooking.partySize),
                  }}
                  theme={{
                    primary: attractionData.widget_customization?.primaryColor || '#3b82f6',
                  }}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AttractionWidget;
