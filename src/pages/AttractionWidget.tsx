import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star } from "lucide-react";
import BookingWidget, { type Experience, type BookingState } from "@/components/BookingWidget";
import { SEOHead } from "@/components/SEOHead";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AttractionStripePayment } from "@/components/payment/AttractionStripePayment";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AttractionData {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  attraction_type: string;
  duration_minutes: number;
  base_price: number;
  max_concurrent_bookings: number;
  logo_url: string | null;
  widget_customization: any;
  organization_id: string;
  status: string;
  resource_label?: string | null;
}

interface OrganizationData {
  id: string;
  name: string;
  logo_url: string | null;
}

const AttractionWidget = () => {
  const { attractionId } = useParams();
  const { toast } = useToast();
  const [attractionData, setAttractionData] = useState<AttractionData | null>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingState, setBookingState] = useState<BookingState | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(true);

  // Map attraction data to Experience format for BookingWidget
  const experienceData = useMemo<Experience | undefined>(() => {
    if (!attractionData) return undefined;

    const experience = {
      title: attractionData.name,
      durationMin: attractionData.duration_minutes,
      venue: attractionData.venue || "Main Venue",
      org: organizationData?.name || "Your Organization",
      basePrice: attractionData.base_price,
      currency: "USD",
      timezone: "America/Chicago", // TODO: Get from organization settings
      description: attractionData.description || undefined,
      highlights: attractionData.widget_customization?.expectations?.items || [
        "Professional staff assistance available throughout",
        "All equipment and safety gear provided on-site",
        "Comfortable clothing and closed-toe shoes recommended",
        "Arrive 15 minutes early for check-in"
      ],
      coverImage: attractionData.logo_url || undefined
    };

    console.log('📦 Experience data prepared for BookingWidget:', {
      title: experience.title,
      coverImage: experience.coverImage,
      hasCoverImage: !!experience.coverImage,
      rawLogoUrl: attractionData.logo_url
    });

    return experience;
  }, [attractionData, organizationData]);

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

      console.log('🎯 Attraction loaded from database:', {
        id: attraction.id,
        name: attraction.name,
        logo_url: attraction.logo_url,
        hasLogo: !!attraction.logo_url
      });

      setAttractionData(attraction);

      // Load organization details
      if (attraction.organization_id) {
        const { data: organization, error: orgError } = await supabase
          .from("organizations")
          .select("id, name, logo_url")
          .eq("id", attraction.organization_id)
          .single();

        if (!orgError && organization) {
          setOrganizationData(organization);
        }
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

  // Fetch available slots for the booking widget
  const fetchAttractionSlots = async ({ dateISO, partySize }: { dateISO: string; partySize: number }) => {
    if (!attractionId) return [];

    try {
      // TODO: Replace with actual Supabase query for attraction slots
      // For now, using demo data
      const { demoFetchSlots } = await import("@/components/BookingWidget");
      return demoFetchSlots(dateISO, partySize);
    } catch (error) {
      console.error("Error fetching slots:", error);
      return [];
    }
  };

  const handleContinue = (state: BookingState) => {
    console.log("📋 Booking state:", state);
    setBookingState(state);
    setShowPaymentModal(true);
    setShowCustomerForm(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      toast({
        title: "Booking Confirmed!",
        description: `Payment successful! Confirmation email will be sent to ${customerEmail}.`,
      });

      setShowPaymentModal(false);

    } catch (error) {
      console.error('Error in payment success handler:', error);
      toast({
        title: "Booking Confirmed",
        description: "Payment was successful! You should receive a confirmation email shortly.",
      });
      setShowPaymentModal(false);
    }
  };

  const handlePaymentError = (error: Error) => {
    toast({
      title: "Payment Failed",
      description: error.message,
      variant: "destructive",
    });
  };

  const handleCustomerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerEmail && customerName) {
      setShowCustomerForm(false);
    }
  };

  if (loading) {
    return (
      <>
        <SEOHead
          title="Loading Attraction - TicketFlo"
          description="Loading attraction details..."
        />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-gray-900" />
            <p className="text-gray-700">Loading attraction...</p>
          </div>
        </div>
      </>
    );
  }

  if (!attractionData) {
    return (
      <>
        <SEOHead
          title="Attraction Not Found - TicketFlo"
          description="The attraction you're looking for could not be found or is not active."
        />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Star className="h-12 w-12 mx-auto mb-4 text-gray-900" />
            <h1 className="text-2xl font-bold mb-2 text-gray-900">
              Attraction Not Found
            </h1>
            <p className="text-gray-600">
              The attraction you're looking for could not be found or is not active.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={`${attractionData.name} - Book Now | ${organizationData?.name || 'TicketFlo'}`}
        description={attractionData.description || `Book your ${attractionData.name} experience. From $${attractionData.base_price} for ${attractionData.duration_minutes} minutes.`}
        ogTitle={`${attractionData.name} - Book Now`}
        ogDescription={attractionData.description || `Book your ${attractionData.name} experience. From $${attractionData.base_price} for ${attractionData.duration_minutes} minutes.`}
        ogImage={attractionData.logo_url || organizationData?.logo_url || "https://www.ticketflo.org/og-image.jpg"}
        canonical={`https://www.ticketflo.org/attraction/${attractionId}`}
      />
      <div className="min-h-screen bg-gray-50 py-8">
        <BookingWidget
          experience={experienceData}
          fetchSlots={fetchAttractionSlots}
          onContinue={handleContinue}
        />
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Booking</DialogTitle>
            <DialogDescription>
              {attractionData?.name} - {bookingState?.partySize} {bookingState?.partySize === 1 ? 'guest' : 'guests'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Booking Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Booking Details</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Date:</span> {bookingState?.date ? new Date(bookingState.date).toLocaleDateString() : 'N/A'}</p>
                <p><span className="font-medium">Time:</span> {bookingState?.slotLabel || 'N/A'}</p>
                <p><span className="font-medium">Party Size:</span> {bookingState?.partySize || 0}</p>
                <p className="text-lg font-bold mt-2">Total: ${((bookingState?.partySize || 0) * (attractionData?.base_price || 0)).toFixed(2)}</p>
              </div>
            </div>

            {/* Customer Information Form */}
            {showCustomerForm ? (
              <form onSubmit={handleCustomerFormSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Full Name *</Label>
                  <Input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email Address *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                >
                  Continue to Payment
                </button>
              </form>
            ) : (
              <>
                {/* Customer Info Display */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Contact Information</h3>
                  <p className="text-sm">{customerName}</p>
                  <p className="text-sm text-gray-600">{customerEmail}</p>
                  <button
                    onClick={() => setShowCustomerForm(true)}
                    className="text-sm text-primary mt-2 hover:underline"
                  >
                    Edit
                  </button>
                </div>

                {/* Payment Form */}
                <div>
                  <h3 className="font-semibold mb-4">Payment Information</h3>
                  <AttractionStripePayment
                    amount={(bookingState?.partySize || 0) * (attractionData?.base_price || 0)}
                    currency="USD"
                    description={`${attractionData?.name} - ${bookingState?.partySize} guests`}
                    customerEmail={customerEmail}
                    customerName={customerName}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    metadata={{
                      organization_id: attractionData?.organization_id || '',
                      attraction_id: attractionData?.id || '',
                      booking_date: bookingState?.date || '',
                      booking_time: bookingState?.slotLabel || '',
                      party_size: String(bookingState?.partySize || 0),
                    }}
                    theme={{
                      primary: attractionData?.widget_customization?.primaryColor || '#3b82f6',
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AttractionWidget;
