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

  const getAttractionTypeEmoji = (type: string) => {
    const typeEmojis: Record<string, string> = {
      'golf_simulator': '⛳',
      'karaoke_room': '🎤',
      'tour': '🗺️',
      'workshop': '🔧',
      'escape_room': '🚪',
      'arcade': '🕹️',
      'playground': '🎠',
      'trampoline_park': '🦘',
      'climbing_wall': '🧗',
      'laser_tag': '🎯',
      'mini_golf': '🏌️',
      'bowling': '🎳',
      'cinema': '🎬',
      'museum': '🏛️',
      'zoo': '🦁',
      'aquarium': '🐠',
      'theme_park': '🎢',
      'water_park': '🌊',
      'ski_resort': '⛷️',
      'adventure_park': '🎯'
    };
    return typeEmojis[type] || '📍';
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
        {/* Hero Section - Optimized for conversion */}
        <div className="relative">
          {/* Logo - Top right corner */}
          {(attractionData.logo_url || organizationData?.logo_url) && (
            <div className="absolute top-0 right-0 z-10">
              {attractionData.logo_url ? (
                <img 
                  src={attractionData.logo_url} 
                  alt={`${attractionData.name} Logo`}
                  className="h-16 md:h-20 object-contain"
                />
              ) : organizationData?.logo_url ? (
                <img 
                  src={organizationData.logo_url} 
                  alt={`${organizationData.name} Logo`}
                  className="h-12 md:h-16 object-contain"
                />
              ) : null}
            </div>
          )}

          {/* Hero Content */}
          <div className="pr-20 md:pr-24 pb-8">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-4xl md:text-5xl flex-shrink-0 mt-1">
                {getAttractionTypeEmoji(attractionData.attraction_type)}
              </span>
              <div className="flex-1">
                <h1 className="text-3xl md:text-5xl font-bold mb-3" style={{ color: headerTextColor }}>
                  {attractionData.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <Badge 
                    className="text-sm px-3 py-1"
                    style={{ 
                      backgroundColor: primaryColor,
                      color: buttonTextColor
                    }}
                  >
                    {getAttractionTypeLabel(attractionData.attraction_type)}
                  </Badge>
                  {attractionData.venue && (
                    <div className="flex items-center gap-2" style={{ color: bodyTextColor }}>
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{attractionData.venue}</span>
                    </div>
                  )}
                </div>
                {attractionData.description && (
                  <p className="text-lg leading-relaxed mb-6" style={{ color: bodyTextColor }}>
                    {attractionData.description}
                  </p>
                )}
              </div>
            </div>

            {/* Key Info Bar - Horizontal layout for better scanning */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: primaryColor + '10' }}>
                <DollarSign className="h-6 w-6 flex-shrink-0" style={{ color: primaryColor }} />
                <div>
                  <p className="text-xs" style={{ color: bodyTextColor }}>From</p>
                  <p className="text-xl font-bold" style={{ color: primaryColor }}>
                    ${attractionData.base_price}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: primaryColor + '10' }}>
                <Clock className="h-6 w-6 flex-shrink-0" style={{ color: primaryColor }} />
                <div>
                  <p className="text-xs" style={{ color: bodyTextColor }}>Duration</p>
                  <p className="text-lg font-semibold" style={{ color: headerTextColor }}>
                    {attractionData.duration_minutes}min
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: primaryColor + '10' }}>
                <Users className="h-6 w-6 flex-shrink-0" style={{ color: primaryColor }} />
                <div>
                  <p className="text-xs" style={{ color: bodyTextColor }}>Group Size</p>
                  <p className="text-lg font-semibold" style={{ color: headerTextColor }}>
                    Any Size
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: primaryColor + '10' }}>
                <CheckCircle className="h-6 w-6 flex-shrink-0" style={{ color: primaryColor }} />
                <div>
                  <p className="text-xs" style={{ color: bodyTextColor }}>Status</p>
                  <p className="text-lg font-semibold" style={{ color: primaryColor }}>
                    Available
                  </p>
                </div>
              </div>
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
                    Ready to Book Your Experience?
                  </h2>
                  <p className="text-lg mb-6" style={{ color: bodyTextColor }}>
                    Choose your preferred date and time • Instant confirmation • Secure payment
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
                    Book Now - From ${attractionData.base_price}
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
                What to Expect
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: primaryColor }}></div>
                  <p style={{ color: bodyTextColor }}>Arrive 15 minutes early for check-in and brief orientation</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: primaryColor }}></div>
                  <p style={{ color: bodyTextColor }}>All equipment and safety gear provided on-site</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: primaryColor }}></div>
                  <p style={{ color: bodyTextColor }}>Comfortable clothing and closed-toe shoes recommended</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: primaryColor }}></div>
                  <p style={{ color: bodyTextColor }}>Professional staff assistance available throughout</p>
                </div>
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
                    <MapPin className="h-6 w-6" style={{ color: primaryColor }} />
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
