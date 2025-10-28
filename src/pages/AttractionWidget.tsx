import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star } from "lucide-react";
import BookingWidget, { type Experience, type BookingState } from "@/components/BookingWidget";
import { SEOHead } from "@/components/SEOHead";

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

  // Map attraction data to Experience format for BookingWidget
  const experienceData = useMemo<Experience | undefined>(() => {
    if (!attractionData) return undefined;
    return {
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

  const handleContinue = (bookingState: BookingState) => {
    console.log("📋 Booking state:", bookingState);

    // TODO: Navigate to checkout/payment page with booking details
    // Or create order in Supabase
    alert(`Great! Proceeding to checkout...\n\nDetails:\n${JSON.stringify(bookingState, null, 2)}`);
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
    </>
  );
};

export default AttractionWidget;
