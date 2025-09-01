import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings, 
  Palette, 
  Mail, 
  Monitor, 
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Save,
  Upload,
  Eye,
  Star
} from "lucide-react";
import { EmailTemplateBuilder } from "./EmailTemplateBuilder";
import { EmailTemplatePreview } from "./EmailTemplatePreview";
import CalendarBookingSystem from "./CalendarBookingSystem";
import ResourceManager from "./ResourceManager";
import { AttractionLogoUploader } from "./attractions/AttractionLogoUploader";

interface AttractionCustomizationProps {
  attractionId: string;
  onSave?: () => void;
}

interface AttractionData {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  attraction_type: string;
  duration_minutes: number;
  base_price: number;
  max_concurrent_bookings: number;
  advance_booking_days: number | null;
  status: string;
  organization_id: string;
  logo_url: string | null;
  operating_hours: any;
  blackout_dates: any;
  widget_customization: Record<string, unknown>;
  email_customization: Record<string, unknown>;
  booking_customization: Record<string, unknown>;
}

interface OrganizationData {
  name: string;
  logo_url: string | null;
}

const ATTRACTION_TYPES = [
  { value: "golf_simulator", label: "Golf Simulator", icon: "🏌️" },
  { value: "karaoke_room", label: "Karaoke Room", icon: "🎤" },
  { value: "escape_room", label: "Escape Room", icon: "🗝️" },
  { value: "vr_experience", label: "VR Experience", icon: "🥽" },
  { value: "bowling_lane", label: "Bowling Lane", icon: "🎳" },
  { value: "conference_room", label: "Conference Room", icon: "💼" },
  { value: "studio", label: "Studio", icon: "🎨" },
  { value: "tour", label: "Tour", icon: "🚶" },
  { value: "workshop", label: "Workshop", icon: "🔧" },
  { value: "other", label: "Other", icon: "📍" }
];

const AttractionCustomization: React.FC<AttractionCustomizationProps> = ({ 
  attractionId, 
  onSave 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  
  const [attractionData, setAttractionData] = useState<AttractionData | null>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);

  // Widget customization state
  const [widgetCustomization, setWidgetCustomization] = useState({
    theme: {
      primary_color: "#3b82f6",
      secondary_color: "#64748b",
      font_family: "Inter",
      enabled: false
    },
    branding: {
      show_logo: true,
      show_powered_by: true
    },
    layout: {
      booking_style: "calendar", // calendar, list, grid
      show_description: true,
      show_duration: true,
      show_price: true
    },
    booking: {
      title: "Ready to Book Your Experience?",
      description: "Choose your preferred date and time • Instant confirmation • Secure payment",
      buttonText: "Book Now - From $40"
    },
    expectations: {
      title: "What to Expect",
      items: [
        "Arrive 15 minutes early for check-in and brief orientation",
        "All equipment and safety gear provided on-site",
        "Comfortable clothing and closed-toe shoes recommended",
        "Professional staff assistance available throughout"
      ]
    },
    resourceSelection: {
      label: "Select Resource (Optional)",
      placeholder: "Any available resource",
      anyOption: "Any Available Resource"
    }
  });

  // Email customization state  
  const [emailCustomization, setEmailCustomization] = useState({
    template: {
      version: 1 as const,
      subject: "Your booking confirmation",
      blocks: [
        {
          id: "header1",
          type: "header" as const,
          title: "Thank you for your booking!",
          align: "center" as const,
          includeLogo: true
        },
        {
          id: "text1",
          type: "text" as const,
          html: "We're excited to welcome you for your upcoming session."
        },
        {
          id: "event_details1",
          type: "event_details" as const,
          showDate: true,
          showTime: true,
          showVenue: true,
          showCustomer: true
        },
        {
          id: "footer1",
          type: "footer" as const,
          text: "Questions? Contact us anytime."
        }
      ],
      theme: {
        backgroundColor: '#ffffff',
        headerColor: '#000000',
        textColor: '#333333',
        buttonColor: '#007bff',
        accentColor: '#f8f9fa',
        borderColor: '#e5e7eb',
        fontFamily: 'Arial, sans-serif'
      }
    },
    branding: {
      show_logo: true,
      logo_position: "header" as "header" | "content",
      logo_source: "attraction" as "attraction" | "organization" | "custom",
      custom_logo_url: "",
      logo_size: "medium" as "small" | "medium" | "large"
    }
  });

  useEffect(() => {
    if (attractionId) {
      loadCustomizations();
    }
  }, [attractionId]);

  const loadCustomizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attractions")
        .select("*")
        .eq("id", attractionId)
        .single();

      if (error) throw error;

      if (data) {
        setOrganizationId(data.organization_id);
        setAttractionData({
          id: attractionId,
          name: data.name,
          description: data.description,
          venue: data.venue,
          attraction_type: data.attraction_type,
          duration_minutes: data.duration_minutes,
          base_price: data.base_price,
          max_concurrent_bookings: data.max_concurrent_bookings,
          advance_booking_days: data.advance_booking_days,
          status: data.status,
          organization_id: data.organization_id,
          logo_url: data.logo_url,
          operating_hours: data.operating_hours,
          blackout_dates: data.blackout_dates,
          widget_customization: data.widget_customization as Record<string, unknown>,
          email_customization: data.email_customization as Record<string, unknown>,
          booking_customization: data.booking_customization as Record<string, unknown>
        });
        setCurrentLogoUrl(data?.logo_url || null);

        // Load organization data for email preview
        if (data.organization_id) {
          try {
            const { data: orgData, error: orgError } = await supabase
              .from("organizations")
              .select("name, logo_url")
              .eq("id", data.organization_id)
              .single();

            if (!orgError && orgData) {
              setOrganizationData(orgData);
            }
          } catch (orgError) {
            console.error("Error loading organization data:", orgError);
          }
        }

        // Load existing customizations
        if (data.widget_customization) {
          setWidgetCustomization(prev => ({
            ...prev,
            ...data.widget_customization,
            booking: {
              ...prev.booking,
              ...(data.widget_customization as any)?.booking
            },
            expectations: {
              ...prev.expectations,
              ...(data.widget_customization as any)?.expectations
            },
            resourceSelection: {
              ...prev.resourceSelection,
              ...(data.widget_customization as any)?.resourceSelection
            }
          }));
        }

        if (data.email_customization) {
          setEmailCustomization(prev => ({
            ...prev,
            ...data.email_customization
          }));
        }
      }
    } catch (error) {
      console.error("Error loading attraction:", error);
      toast({
        title: "Error",
        description: "Failed to load attraction data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCustomizations = async () => {
    if (!attractionData?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("attractions")
        .update({
          widget_customization: widgetCustomization,
          email_customization: emailCustomization,
          booking_customization: {} // Add booking-specific customizations later
        })
        .eq("id", attractionData.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attraction customizations saved successfully!"
      });

      onSave?.();
    } catch (error) {
      console.error("Error saving customizations:", error);
      toast({
        title: "Error",
        description: "Failed to save customizations",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };



  const getAttractionTypeLabel = (type: string) => {
    const attractionType = ATTRACTION_TYPES.find(t => t.value === type);
    return attractionType?.label || type;
  };

  const getAttractionTypeEmoji = (type: string) => {
    const attractionType = ATTRACTION_TYPES.find(t => t.value === type);
    return attractionType?.icon || '📍';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center">Loading attraction...</p>
        </CardContent>
      </Card>
    );
  }

  if (!attractionData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Attraction not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getAttractionTypeEmoji(attractionData.attraction_type)}</span>
            <div>
              <h1 className="text-2xl font-bold">{attractionData.name}</h1>
              <p className="text-muted-foreground">
                {getAttractionTypeLabel(attractionData.attraction_type)} • {attractionData.venue}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={attractionData.status === 'active' ? 'default' : 'secondary'}>
            {attractionData.status}
          </Badge>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => window.open(`/attraction/${attractionId}`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Widget
            </Button>
            <Button onClick={saveCustomizations} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Booking
          </TabsTrigger>
          <TabsTrigger value="widget" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Widget
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Update your attraction details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Attraction Name</Label>
                  <Input value={attractionData.name} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input value={getAttractionTypeLabel(attractionData.attraction_type)} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Venue/Location</Label>
                  <Input value={attractionData.venue || "Not specified"} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={attractionData.description || ""} 
                    readOnly 
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing & Scheduling</CardTitle>
                <CardDescription>Session pricing and availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Base Price
                    </Label>
                    <Input value={`$${attractionData.base_price}`} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration
                    </Label>
                    <Input value={`${attractionData.duration_minutes} min`} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Max Concurrent
                    </Label>
                    <Input value={attractionData.max_concurrent_bookings} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Advance Booking</Label>
                    <Input value={`${attractionData.advance_booking_days || 30} days`} readOnly />
                  </div>
                </div>
              </CardContent>
            </Card>

            <AttractionLogoUploader
              attractionId={attractionId}
              currentLogoUrl={currentLogoUrl}
              onLogoChange={(logoUrl) => {
                setCurrentLogoUrl(logoUrl);
                setAttractionData(prev => prev ? { ...prev, logo_url: logoUrl } : null);
              }}
            />

            {/* Hero Banner Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Hero Banner Preview</CardTitle>
                <CardDescription>See how your logo will appear as a hero banner on the booking widget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <div className="bg-white p-6">
                    <div className="max-w-4xl mx-auto">
                      <div className="text-center mb-8">
                        {currentLogoUrl ? (
                          <img 
                            src={currentLogoUrl} 
                            alt={`${attractionData?.name} Logo`}
                            className="mx-auto max-h-64 w-auto object-contain rounded-lg shadow-lg"
                          />
                        ) : (
                          /* Fallback with attraction icon if no logo */
                          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                            <MapPin className="h-16 w-16 text-blue-600" />
                          </div>
                        )}
                      </div>
                      
                      <div className="max-w-2xl mx-auto text-left">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                          {attractionData?.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 text-base text-gray-600 mb-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{attractionData?.duration_minutes} minutes</span>
                          </div>
                          <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">From ${attractionData?.base_price}</span>
                          </div>
                        </div>
                        <p className="text-gray-600">
                          {attractionData?.description || "Book your session now"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <ResourceManager 
            attractionId={attractionId}
            attractionName={attractionData.name}
          />
        </TabsContent>

        {/* Booking Tab */}
        <TabsContent value="booking" className="space-y-6">
          <CalendarBookingSystem 
            attractionId={attractionId}
            attractionData={{
              name: attractionData.name,
              duration_minutes: attractionData.duration_minutes,
              base_price: attractionData.base_price,
              max_concurrent_bookings: attractionData.max_concurrent_bookings,
              advance_booking_days: attractionData.advance_booking_days
            }}
          />
        </TabsContent>

        {/* Widget Tab */}
        <TabsContent value="widget" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Widget Customization</CardTitle>
                <CardDescription>Customize how your booking widget appears to customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <Input
                    type="color"
                    value={widgetCustomization.theme.primary_color}
                    onChange={(e) => setWidgetCustomization(prev => ({
                      ...prev,
                      theme: { ...prev.theme, primary_color: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <Input
                    type="color"
                    value={widgetCustomization.theme.secondary_color}
                    onChange={(e) => setWidgetCustomization(prev => ({
                      ...prev,
                      theme: { ...prev.theme, secondary_color: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={widgetCustomization.theme.font_family}
                    onValueChange={(value) => setWidgetCustomization(prev => ({
                      ...prev,
                      theme: { ...prev.theme, font_family: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Branding Options</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Show Attraction Logo</Label>
                      <Switch
                        checked={widgetCustomization.branding.show_logo}
                        onCheckedChange={(checked) => setWidgetCustomization(prev => ({
                          ...prev,
                          branding: { ...prev.branding, show_logo: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Show "Powered by TicketFlo"</Label>
                      <Switch
                        checked={widgetCustomization.branding.show_powered_by}
                        onCheckedChange={(checked) => setWidgetCustomization(prev => ({
                          ...prev,
                          branding: { ...prev.branding, show_powered_by: checked }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Booking Card Text</h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Card Title</Label>
                      <Input
                        value={widgetCustomization.booking.title}
                        onChange={(e) => setWidgetCustomization(prev => ({
                          ...prev,
                          booking: { ...prev.booking, title: e.target.value }
                        }))}
                        placeholder="Ready to Book Your Experience?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Card Description</Label>
                      <Textarea
                        value={widgetCustomization.booking.description}
                        onChange={(e) => setWidgetCustomization(prev => ({
                          ...prev,
                          booking: { ...prev.booking, description: e.target.value }
                        }))}
                        placeholder="Choose your preferred date and time • Instant confirmation • Secure payment"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Button Text</Label>
                      <Input
                        value={widgetCustomization.booking.buttonText}
                        onChange={(e) => setWidgetCustomization(prev => ({
                          ...prev,
                          booking: { ...prev.booking, buttonText: e.target.value }
                        }))}
                        placeholder="Book Now - From $40"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">What to Expect Section</h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Section Title</Label>
                      <Input
                        value={widgetCustomization.expectations.title}
                        onChange={(e) => setWidgetCustomization(prev => ({
                          ...prev,
                          expectations: { ...prev.expectations, title: e.target.value }
                        }))}
                        placeholder="What to Expect"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expectation Items</Label>
                      <div className="space-y-2">
                        {widgetCustomization.expectations.items.map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={item}
                              onChange={(e) => {
                                const newItems = [...widgetCustomization.expectations.items];
                                newItems[index] = e.target.value;
                                setWidgetCustomization(prev => ({
                                  ...prev,
                                  expectations: { ...prev.expectations, items: newItems }
                                }));
                              }}
                              placeholder={`Expectation ${index + 1}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newItems = widgetCustomization.expectations.items.filter((_, i) => i !== index);
                                setWidgetCustomization(prev => ({
                                  ...prev,
                                  expectations: { ...prev.expectations, items: newItems }
                                }));
                              }}
                              className="px-2"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newItems = [...widgetCustomization.expectations.items, ""];
                            setWidgetCustomization(prev => ({
                              ...prev,
                              expectations: { ...prev.expectations, items: newItems }
                            }));
                          }}
                          className="w-full"
                        >
                          + Add Item
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Resource Selection Text</h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Selection Label</Label>
                      <Input
                        value={widgetCustomization.resourceSelection.label}
                        onChange={(e) => setWidgetCustomization(prev => ({
                          ...prev,
                          resourceSelection: { ...prev.resourceSelection, label: e.target.value }
                        }))}
                        placeholder="Select Resource (Optional)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Placeholder Text</Label>
                      <Input
                        value={widgetCustomization.resourceSelection.placeholder}
                        onChange={(e) => setWidgetCustomization(prev => ({
                          ...prev,
                          resourceSelection: { ...prev.resourceSelection, placeholder: e.target.value }
                        }))}
                        placeholder="Any available resource"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>"Any Available" Option Text</Label>
                      <Input
                        value={widgetCustomization.resourceSelection.anyOption}
                        onChange={(e) => setWidgetCustomization(prev => ({
                          ...prev,
                          resourceSelection: { ...prev.resourceSelection, anyOption: e.target.value }
                        }))}
                        placeholder="Any Available Resource"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Widget Preview</CardTitle>
                <CardDescription>See how your widget will look to customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">Widget Preview</p>
                    <Button 
                      onClick={() => window.open(`/attraction/${attractionId}`, '_blank')}
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open Full Preview
                    </Button>
                  </div>
                </div>
                
                {/* Expectations Preview */}
                <div className="mt-4 border rounded-lg p-4 bg-white">
                  <h4 className="font-medium mb-3 text-sm">Expectations Preview:</h4>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-blue-600" />
                    {widgetCustomization.expectations.title}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {widgetCustomization.expectations.items.filter(item => item.trim()).map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 bg-blue-600"></div>
                        <p className="text-sm text-gray-600">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resource Selection Preview */}
                <div className="mt-4 border rounded-lg p-4 bg-white">
                  <h4 className="font-medium mb-3 text-sm">Resource Selection Preview:</h4>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Label:</strong> {widgetCustomization.resourceSelection.label}
                    </div>
                    <div className="text-sm">
                      <strong>Placeholder:</strong> {widgetCustomization.resourceSelection.placeholder}
                    </div>
                    <div className="text-sm">
                      <strong>Any Option:</strong> {widgetCustomization.resourceSelection.anyOption}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2 text-sm">
                  <p><strong>Widget URL:</strong></p>
                  <div className="flex gap-2">
                    <Input 
                      value={`${window.location.origin}/attraction/${attractionId}`}
                      readOnly
                      className="text-xs"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/attraction/${attractionId}`);
                        toast({ title: "Copied!", description: "Widget URL copied to clipboard" });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Email Template Builder</CardTitle>
                <CardDescription>Customize booking confirmation emails</CardDescription>
              </CardHeader>
              <CardContent>
                <EmailTemplateBuilder
                  emailCustomization={emailCustomization}
                  onEmailCustomizationChange={setEmailCustomization}
                  isAttractionMode={true}
                  templateType="booking_confirmation"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
                <CardDescription>Preview how your emails will look</CardDescription>
              </CardHeader>
              <CardContent>
                <EmailTemplatePreview
                  emailCustomization={emailCustomization}
                  attractionDetails={attractionData}
                  organizationDetails={organizationData}
                  isAttractionMode={true}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttractionCustomization;
