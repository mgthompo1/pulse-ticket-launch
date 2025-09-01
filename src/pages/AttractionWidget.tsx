import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  ArrowLeft,
  CheckCircle,
  Star,
  Play,
  Loader2
} from "lucide-react";
import AttractionBookingWidget from "@/components/AttractionBookingWidget";
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
  const [showBooking, setShowBooking] = useState(false);

  // Get theme colors and apply them consistently
  const theme = useMemo(() => {
    const themeData = attractionData?.widget_customization?.theme || {};
    const isEnabled = themeData.enabled === true;
    
    let newTheme;
    if (!isEnabled) {
      // Use default theme when customization is disabled
      newTheme = {
        enabled: false,
        primaryColor: '#000000', // Default black for buttons and progress bars
        buttonTextColor: '#ffffff', // White for button text
        secondaryColor: '#ffffff', // White for borders and secondary elements
        backgroundColor: '#ffffff', // White background
        cardBackgroundColor: '#ffffff',
        inputBackgroundColor: '#ffffff',
        borderEnabled: false,
        borderColor: '#e5e7eb',
        headerTextColor: '#111827', // Dark gray for headers
        bodyTextColor: '#6b7280', // Lighter gray for body text
        fontFamily: 'Manrope' // Default to Manrope
      };
    } else {
      // Use custom theme when enabled
      newTheme = {
        enabled: true,
        primaryColor: themeData.primaryColor || '#000000',
        buttonTextColor: themeData.buttonTextColor || '#ffffff',
        secondaryColor: themeData.secondaryColor || '#ffffff',
        backgroundColor: themeData.backgroundColor || '#ffffff',
        cardBackgroundColor: themeData.cardBackgroundColor || themeData.backgroundColor || '#ffffff',
        inputBackgroundColor: themeData.inputBackgroundColor || '#ffffff',
        borderEnabled: themeData.borderEnabled ?? false,
        borderColor: themeData.borderColor || '#e5e7eb',
        headerTextColor: themeData.headerTextColor || '#111827',
        bodyTextColor: themeData.bodyTextColor || '#6b7280',
        fontFamily: themeData.fontFamily || 'Manrope'
      };
    }
    
    return newTheme;
  }, [attractionData?.widget_customization?.theme]);

  // Destructure theme colors for easier use
  const { 
    primaryColor, 
    buttonTextColor, 
    backgroundColor, 
    headerTextColor, 
    bodyTextColor, 
    fontFamily,
    cardBackgroundColor,
    borderEnabled,
    borderColor
  } = theme;

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

  const getAttractionTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'golf_simulator': 'Golf Simulator',
      'karaoke_room': 'Karaoke Room',
      'tour': 'Tour',
      'workshop': 'Workshop',
      'escape_room': 'Escape Room',
      'arcade': 'Arcade',
      'playground': 'Playground',
      'trampoline_park': 'Trampoline Park',
      'climbing_wall': 'Climbing Wall',
      'laser_tag': 'Laser Tag',
      'mini_golf': 'Mini Golf',
      'bowling': 'Bowling',
      'cinema': 'Cinema',
      'museum': 'Museum',
      'zoo': 'Zoo',
      'aquarium': 'Aquarium',
      'theme_park': 'Theme Park',
      'water_park': 'Water Park',
      'ski_resort': 'Ski Resort',
      'adventure_park': 'Adventure Park'
    };
    return typeLabels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };



  if (loading) {
    return (
      <>
        <SEOHead
          title="Loading Attraction - TicketFlo"
          description="Loading attraction details..."
        />
        <div 
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor, fontFamily }}
        >
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" style={{ color: primaryColor }} />
            <p style={{ color: headerTextColor }}>Loading attraction...</p>
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
        <div 
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor, fontFamily }}
        >
        <div className="text-center">
            <Star className="h-12 w-12 mx-auto mb-4" style={{ color: headerTextColor }} />
            <h1 className="text-2xl font-bold mb-2" style={{ color: headerTextColor }}>
            Attraction Not Found
          </h1>
            <p style={{ color: bodyTextColor }}>
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
        canonical={`https://www.ticketflo.org/widget/${attractionId}`}
      />
      <div 
        className="min-h-screen"
        style={{ 
          backgroundColor,
          fontFamily,
          color: headerTextColor
        }}
      >
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero Banner Section - Matching Event Widget Design */}
        <div className="mb-8">
          {/* Logo Container - Centered Hero Banner */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              {attractionData.logo_url ? (
                <img 
                  src={attractionData.logo_url} 
                  alt={`${attractionData.name} Logo`}
                  className="mx-auto max-h-64 w-auto object-contain rounded-lg shadow-lg"
                />
              ) : (
                /* Fallback with attraction icon if no logo */
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                  <MapPin className="h-16 w-16" style={{ color: primaryColor }} />
                </div>
              )}


            </div>
          </div>

          {/* Text Container - Left Aligned */}
          <div className="max-w-4xl">
            <div className="space-y-6 text-left max-w-2xl">
              {/* Attraction Name */}
              <h1 className="text-3xl md:text-4xl font-bold leading-tight" style={{ color: headerTextColor }}>
                {attractionData.name}
              </h1>

              {/* Attraction Details - Horizontal Layout */}
              <div className="space-y-3">
                {/* Main attraction details in one line */}
                <div className="flex flex-wrap items-center gap-3 text-base" style={{ color: bodyTextColor }}>
                  {/* Duration */}
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" style={{ color: primaryColor }} />
                    <span className="font-medium">{attractionData.duration_minutes} minutes</span>
                  </div>

                  {/* Venue */}
                  {attractionData.venue && (
                    <>
                      <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" style={{ color: primaryColor }} />
                        <span className="font-medium">{attractionData.venue}</span>
                      </div>
                    </>
                  )}

                  {/* Organization */}
                  {organizationData?.name && (
                    <>
                      <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                          <span className="text-xs text-white font-bold">H</span>
                        </div>
                        <span><span className="font-medium">{organizationData.name}</span></span>
                      </div>
                    </>
                  )}
                </div>

                {/* Price and Group Size - Below the main line */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" style={{ color: primaryColor }} />
                    <span className="font-medium">From ${attractionData.base_price}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" style={{ color: primaryColor }} />
                    <span className="font-medium">Up to {attractionData.max_concurrent_bookings} people</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {attractionData.description && (
                <p className="text-lg leading-relaxed" style={{ color: bodyTextColor }}>
                  {attractionData.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Single column with prominent booking */}
        <div className="space-y-8">
          {/* Primary CTA - Above the fold */}
          <Card 
            className="border-2 shadow-lg"
            style={{ 
              backgroundColor: cardBackgroundColor,
              borderColor: primaryColor + '40'
            }}
          >
            <CardContent className="p-8">
              {!showBooking ? (
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4" style={{ color: headerTextColor }}>
                    {attractionData.widget_customization?.booking?.title || "Ready to Book Your Experience?"}
                  </h2>
                  <p className="text-lg mb-6" style={{ color: bodyTextColor }}>
                    {attractionData.widget_customization?.booking?.description || "Choose your preferred date and time • Instant confirmation • Secure payment"}
                  </p>
                  <Button 
                    onClick={() => setShowBooking(true)}
                    size="lg"
                    className="px-12 py-4 text-lg font-semibold hover:scale-[1.02] transition-all duration-200 shadow-lg"
                    style={{ 
                      backgroundColor: primaryColor,
                      color: buttonTextColor
                    }}
                  >
                    <Calendar className="h-6 w-6 mr-3" />
                    {attractionData.widget_customization?.booking?.buttonText || `Book Now - From $${attractionData.base_price}`}
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold" style={{ color: headerTextColor }}>
                      Book Your {attractionData.name} Experience
                    </h2>
                    <Button
                      variant="outline"
                      onClick={() => setShowBooking(false)}
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Details
                    </Button>
                  </div>
                  <AttractionBookingWidget 
                    attractionId={attractionId!}
                    onBack={() => setShowBooking(false)}
                    compact
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* What to Expect - Secondary information */}
          <Card 
            className="shadow-sm"
            style={{ 
              backgroundColor: cardBackgroundColor, 
              border: borderEnabled ? `1px solid ${borderColor}` : undefined 
            }}
          >
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-3" style={{ color: headerTextColor }}>
                <Star className="h-6 w-6" style={{ color: primaryColor }} />
                {attractionData.widget_customization?.expectations?.title || "What to Expect"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(attractionData.widget_customization?.expectations?.items || [
                  "Arrive 15 minutes early for check-in and brief orientation",
                  "All equipment and safety gear provided on-site",
                  "Comfortable clothing and closed-toe shoes recommended",
                  "Professional staff assistance available throughout"
                ]).map((item: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: primaryColor }}></div>
                    <p style={{ color: bodyTextColor }}>{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          {organizationData && (
            <Card 
              className="shadow-sm"
              style={{ 
                backgroundColor: cardBackgroundColor, 
                border: borderEnabled ? `1px solid ${borderColor}` : undefined 
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Organization Logo */}
                    {organizationData.logo_url && (
                      <img 
                        src={organizationData.logo_url} 
                        alt={`${organizationData.name} Logo`}
                        className="h-12 w-12 object-contain rounded-lg"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-lg" style={{ color: headerTextColor }}>
                        {organizationData.name}
                      </p>
                      {attractionData.venue && (
                        <p style={{ color: bodyTextColor }}>{attractionData.venue}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: bodyTextColor }}>
                    Questions? Contact us for more information
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default AttractionWidget;
