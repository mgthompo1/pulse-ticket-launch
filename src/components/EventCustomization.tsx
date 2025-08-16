import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Palette, Layout, Mail, Ticket, Monitor, Save, MapPin, Users, Package, Settings, Plus, Trash2, HelpCircle } from "lucide-react";
import { SeatMapDesigner } from "@/components/SeatMapDesigner";
import AttendeeManagement from "@/components/AttendeeManagement";
import MerchandiseManager from "@/components/MerchandiseManager";
import TicketTypesManager from "@/components/TicketTypesManager";
import { EventLogoUploader } from "@/components/events/EventLogoUploader";

interface EventCustomizationProps {
  eventId: string;
  onSave?: () => void;
}

const EventCustomization: React.FC<EventCustomizationProps> = ({ eventId, onSave }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSeatMapDesigner, setShowSeatMapDesigner] = useState(false);
  const [eventData, setEventData] = useState<{
    id: string;
    name: string;
    status: string;
    test_mode: boolean;
    logo_url: string | null;
    venue: string | null;
    widget_customization?: Record<string, unknown>;
    ticket_customization?: Record<string, unknown>;
    email_customization?: Record<string, unknown>;
  } | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [eventVenue, setEventVenue] = useState<string>("");
  
  // Widget customization state
  const [widgetCustomization, setWidgetCustomization] = useState({
    theme: {
      primaryColor: "#000000",
      secondaryColor: "#ffffff",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      fontFamily: "Inter"
    },
    layout: {
      showEventImage: true,
      showDescription: true,
      showVenue: true,
      showCapacity: true,
      ticketLayout: "list"
    },
    branding: {
      showOrgLogo: true,
      customCss: "",
      customHeaderText: "",
      customFooterText: ""
    },
    seatMaps: {
      enabled: false
    },
    customQuestions: {
      enabled: false,
      questions: []
    }
  });

  // Ticket customization state
  const [ticketCustomization, setTicketCustomization] = useState({
    design: {
      template: "modern",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      borderColor: "#e5e7eb",
      qrCodePosition: "bottom-right",
      fontFamily: "Inter"
    },
    content: {
      showLogo: true,
      showQrCode: true,
      showEventDetails: true,
      showVenueInfo: true,
      customFields: [],
      logoSource: "event" as "event" | "organization" | "custom",
      customLogoUrl: ""
    }
  });

  // Email customization state
  const [emailCustomization, setEmailCustomization] = useState({
    template: {
      headerColor: "#000000",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      buttonColor: "#000000"
    },
    content: {
      subject: "Your ticket confirmation",
      headerText: "Thank you for your purchase!",
      bodyText: "We are excited to see you at the event.",
      footerText: "Questions? Contact us anytime."
    },
    branding: {
      showLogo: true,
      logoPosition: "header"
    },
    notifications: {
      organiserNotifications: false,
      organiserEmail: ""
    }
  });

  const loadCustomizations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("widget_customization, ticket_customization, email_customization, name, status, test_mode, logo_url, venue")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      setEventData({ 
        id: eventId,
        name: data.name,
        status: data.status,
        test_mode: data.test_mode,
        logo_url: data.logo_url,
        venue: data.venue,
        widget_customization: data.widget_customization as Record<string, unknown>,
        ticket_customization: data.ticket_customization as Record<string, unknown>,
        email_customization: data.email_customization as Record<string, unknown>
      });
      setCurrentLogoUrl(data?.logo_url || null);
      setEventVenue(data?.venue || "");

      if (data?.widget_customization) {
        setWidgetCustomization(data.widget_customization as typeof widgetCustomization);
      }
      if (data?.ticket_customization) {
        setTicketCustomization(data.ticket_customization as typeof ticketCustomization);
      }
      if (data?.email_customization) {
        setEmailCustomization(data.email_customization as typeof emailCustomization);
      }
    } catch (error) {
      console.error("Error loading customizations:", error);
    }
  }, [eventId]);

  useEffect(() => {
    loadCustomizations();
  }, [loadCustomizations]);

  const saveCustomizations = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          widget_customization: widgetCustomization,
          ticket_customization: ticketCustomization,
          email_customization: emailCustomization
        })
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customizations saved successfully!"
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
      setLoading(false);
    }
  };

  const updateWidgetCustomization = (path: string[], value: any) => {
    setWidgetCustomization(prev => {
      const updated = { ...prev } as any;
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const updateTicketCustomization = (path: string[], value: any) => {
    setTicketCustomization(prev => {
      const updated = { ...prev } as any;
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const updateEmailCustomization = (path: string[], value: any) => {
    setEmailCustomization(prev => {
      const updated = { ...prev } as any;
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Customization</h2>
          <p className="text-muted-foreground">Customize your event widget, tickets, and emails</p>
        </div>
        <Button onClick={saveCustomizations} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Seat Map Designer Modal */}
      {showSeatMapDesigner && eventData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-7xl h-[90vh] overflow-hidden">
            <SeatMapDesigner
              eventId={eventId}
              eventName={eventData.name}
              onClose={() => setShowSeatMapDesigner(false)}
            />
          </div>
        </div>
      )}

      <Tabs defaultValue="widget" className="space-y-4">
        <TabsList>
          <TabsTrigger value="widget" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Widget
          </TabsTrigger>
          <TabsTrigger value="seats" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Seat Maps
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Emails
          </TabsTrigger>
          <TabsTrigger value="merchandise" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Merchandise
          </TabsTrigger>
          <TabsTrigger value="attendees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Attendees
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="widget" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme
                </CardTitle>
                <CardDescription>Customize colors and fonts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <Input
                    id="primaryColor"
                    type="color"
                    value={widgetCustomization.theme.primaryColor}
                    onChange={(e) => updateWidgetCustomization(['theme', 'primaryColor'], e.target.value)}
                    className="w-full h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={widgetCustomization.theme.secondaryColor}
                    onChange={(e) => updateWidgetCustomization(['theme', 'secondaryColor'], e.target.value)}
                    className="w-full h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={widgetCustomization.theme.backgroundColor}
                    onChange={(e) => updateWidgetCustomization(['theme', 'backgroundColor'], e.target.value)}
                    className="w-full h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Select
                    value={widgetCustomization.theme.fontFamily}
                    onValueChange={(value) => updateWidgetCustomization(['theme', 'fontFamily'], value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Modern Sans-Serif Fonts */}
                      <SelectItem value="Inter" className="font-inter">Inter</SelectItem>
                      <SelectItem value="Roboto" className="font-roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans" className="font-open-sans">Open Sans</SelectItem>
                      <SelectItem value="Poppins" className="font-poppins">Poppins</SelectItem>
                      <SelectItem value="Montserrat" className="font-montserrat">Montserrat</SelectItem>
                      <SelectItem value="Lato" className="font-lato">Lato</SelectItem>
                      <SelectItem value="Source Sans Pro" className="font-source-sans-pro">Source Sans Pro</SelectItem>
                      <SelectItem value="Ubuntu" className="font-ubuntu">Ubuntu</SelectItem>
                      <SelectItem value="Noto Sans" className="font-noto-sans">Noto Sans</SelectItem>
                      <SelectItem value="Work Sans" className="font-work-sans">Work Sans</SelectItem>
                      <SelectItem value="PT Sans" className="font-pt-sans">PT Sans</SelectItem>
                      <SelectItem value="Oswald" className="font-oswald">Oswald</SelectItem>
                      <SelectItem value="Raleway" className="font-raleway">Raleway</SelectItem>
                      <SelectItem value="Nunito" className="font-nunito">Nunito</SelectItem>
                      <SelectItem value="Quicksand" className="font-quicksand">Quicksand</SelectItem>
                      <SelectItem value="Josefin Sans" className="font-josefin-sans">Josefin Sans</SelectItem>
                      <SelectItem value="DM Sans" className="font-dm-sans">DM Sans</SelectItem>
                      <SelectItem value="Outfit" className="font-outfit">Outfit</SelectItem>
                      <SelectItem value="Plus Jakarta Sans" className="font-plus-jakarta-sans">Plus Jakarta Sans</SelectItem>
                      <SelectItem value="Albert Sans" className="font-albert-sans">Albert Sans</SelectItem>
                      <SelectItem value="Onest" className="font-onest">Onest</SelectItem>
                      <SelectItem value="Geist" className="font-geist">Geist</SelectItem>
                      <SelectItem value="Cal Sans" className="font-cal-sans">Cal Sans</SelectItem>
                      <SelectItem value="General Sans" className="font-general-sans">General Sans</SelectItem>
                      <SelectItem value="Clash Display" className="font-clash-display">Clash Display</SelectItem>
                      <SelectItem value="Clash Grotesk" className="font-clash-grotesk">Clash Grotesk</SelectItem>
                      <SelectItem value="Sentient" className="font-sentient">Sentient</SelectItem>
                      <SelectItem value="Chillax" className="font-chillax">Chillax</SelectItem>
                      <SelectItem value="Cabinet Grotesk" className="font-cabinet-grotesk">Cabinet Grotesk</SelectItem>
                      <SelectItem value="Switzer" className="font-switzer">Switzer</SelectItem>
                      <SelectItem value="Gambarino" className="font-gambarino">Gambarino</SelectItem>
                      <SelectItem value="Melodrama" className="font-melodrama">Melodrama</SelectItem>
                      <SelectItem value="Zodiak" className="font-zodiak">Zodiak</SelectItem>
                      <SelectItem value="Panchang" className="font-panchang">Panchang</SelectItem>
                      
                      {/* Classic Serif Fonts */}
                      <SelectItem value="Playfair Display" className="font-playfair-display">Playfair Display</SelectItem>
                      <SelectItem value="Merriweather" className="font-merriweather">Merriweather</SelectItem>
                      
                      {/* System Fonts */}
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="-apple-system">System Font</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Layout
                </CardTitle>
                <CardDescription>Control what information to display</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showEventImage">Show Event Image</Label>
                  <Switch
                    id="showEventImage"
                    checked={widgetCustomization.layout.showEventImage}
                    onCheckedChange={(checked) => updateWidgetCustomization(['layout', 'showEventImage'], checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showDescription">Show Description</Label>
                  <Switch
                    id="showDescription"
                    checked={widgetCustomization.layout.showDescription}
                    onCheckedChange={(checked) => updateWidgetCustomization(['layout', 'showDescription'], checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showVenue">Show Venue</Label>
                  <Switch
                    id="showVenue"
                    checked={widgetCustomization.layout.showVenue}
                    onCheckedChange={(checked) => updateWidgetCustomization(['layout', 'showVenue'], checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showCapacity">Show Capacity</Label>
                  <Switch
                    id="showCapacity"
                    checked={widgetCustomization.layout.showCapacity}
                    onCheckedChange={(checked) => updateWidgetCustomization(['layout', 'showCapacity'], checked)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticketLayout">Ticket Layout</Label>
                  <Select
                    value={widgetCustomization.layout.ticketLayout}
                    onValueChange={(value) => updateWidgetCustomization(['layout', 'ticketLayout'], value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="list">List View</SelectItem>
                      <SelectItem value="grid">Grid View</SelectItem>
                      <SelectItem value="compact">Compact View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Custom Branding</CardTitle>
              <CardDescription>Add custom text and styling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="showOrgLogo">Show Organization Logo</Label>
                <Switch
                  id="showOrgLogo"
                  checked={widgetCustomization.branding.showOrgLogo}
                  onCheckedChange={(checked) => updateWidgetCustomization(['branding', 'showOrgLogo'], checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customHeaderText">Custom Header Text</Label>
                <Input
                  id="customHeaderText"
                  value={widgetCustomization.branding.customHeaderText}
                  onChange={(e) => updateWidgetCustomization(['branding', 'customHeaderText'], e.target.value)}
                  placeholder="Welcome to our event!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customFooterText">Custom Footer Text</Label>
                <Input
                  id="customFooterText"
                  value={widgetCustomization.branding.customFooterText}
                  onChange={(e) => updateWidgetCustomization(['branding', 'customFooterText'], e.target.value)}
                  placeholder="Contact us for questions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customCss">Custom CSS</Label>
                <Textarea
                  id="customCss"
                  value={widgetCustomization.branding.customCss}
                  onChange={(e) => updateWidgetCustomization(['branding', 'customCss'], e.target.value)}
                  placeholder=".custom-button { background: linear-gradient(...) }"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Custom Questions Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Custom Questions
              </CardTitle>
              <CardDescription>
                Add custom questions that customers must answer when purchasing tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Custom Questions */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="enableCustomQuestions" className="text-base font-medium">
                    Enable Custom Questions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Require customers to answer custom questions during ticket purchase
                  </p>
                </div>
                <Switch
                  id="enableCustomQuestions"
                  checked={widgetCustomization.customQuestions?.enabled || false}
                  onCheckedChange={(checked) => updateWidgetCustomization(['customQuestions', 'enabled'], checked)}
                />
              </div>

              {/* Custom Questions Management - Only show when enabled */}
              {widgetCustomization.customQuestions?.enabled && (
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Question Management</h4>
                      <Button
                        onClick={() => {
                          const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                          if (currentQuestions.length >= 5) {
                            toast({
                              title: "Maximum Questions Reached",
                              description: "You can only add up to 5 custom questions.",
                              variant: "destructive"
                            });
                            return;
                          }
                          const newQuestion = {
                            id: `question_${Date.now()}`,
                            label: "",
                            type: "text",
                            required: false,
                            options: ""
                          };
                          updateWidgetCustomization(['customQuestions', 'questions'], [...currentQuestions, newQuestion]);
                        }}
                        size="sm"
                        disabled={(widgetCustomization.customQuestions?.questions || []).length >= 5}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {(widgetCustomization.customQuestions?.questions || []).map((question: any, index: number) => (
                        <div key={question.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">Question {index + 1}</h5>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                const updatedQuestions = currentQuestions.filter((q: any) => q.id !== question.id);
                                updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Question Label *</Label>
                              <Input
                                value={question.label}
                                onChange={(e) => {
                                  const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                  const updatedQuestions = currentQuestions.map((q: any) =>
                                    q.id === question.id ? { ...q, label: e.target.value } : q
                                  );
                                  updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                                }}
                                placeholder="e.g., Dietary Requirements"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Question Type</Label>
                              <Select
                                value={question.type}
                                onValueChange={(value) => {
                                  const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                  const updatedQuestions = currentQuestions.map((q: any) =>
                                    q.id === question.id ? { ...q, type: value } : q
                                  );
                                  updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text Input</SelectItem>
                                  <SelectItem value="textarea">Long Text</SelectItem>
                                  <SelectItem value="select">Dropdown</SelectItem>
                                  <SelectItem value="radio">Radio Buttons</SelectItem>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="phone">Phone Number</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Options field for select/radio/checkbox types */}
                          {(question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') && (
                            <div className="space-y-2">
                              <Label>Options (one per line)</Label>
                              <Textarea
                                value={question.options}
                                onChange={(e) => {
                                  const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                  const updatedQuestions = currentQuestions.map((q: any) =>
                                    q.id === question.id ? { ...q, options: e.target.value } : q
                                  );
                                  updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                                }}
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                rows={3}
                              />
                              <p className="text-xs text-muted-foreground">
                                Enter each option on a separate line
                              </p>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`required-${question.id}`}
                              checked={question.required}
                              onCheckedChange={(checked) => {
                                const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                const updatedQuestions = currentQuestions.map((q: any) =>
                                  q.id === question.id ? { ...q, required: checked } : q
                                );
                                updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                              }}
                            />
                            <Label htmlFor={`required-${question.id}`}>Required field</Label>
                          </div>
                        </div>
                      ))}

                      {(widgetCustomization.customQuestions?.questions || []).length === 0 && (
                        <div className="text-center p-6 border rounded-lg bg-muted/30">
                          <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No custom questions added yet. Click "Add Question" to get started.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Information when disabled */}
              {!widgetCustomization.customQuestions?.enabled && (
                <div className="text-center p-6 border rounded-lg bg-muted/30">
                  <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Enable custom questions above to collect additional information from customers during ticket purchase
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Widget URL Section - Only show when event is published */}
          {eventData?.status === 'published' && (
            <Card>
              <CardHeader>
                <CardTitle>Widget Sharing</CardTitle>
                <CardDescription>Share your customized ticket widget</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Widget URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`${window.location.origin}/widget/${eventId}`}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/widget/${eventId}`);
                        toast({
                          title: "Copied!",
                          description: "Widget URL copied to clipboard"
                        });
                      }}
                    >
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`${window.location.origin}/widget/${eventId}`, '_blank')}
                    >
                      Preview
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <div className="space-y-2">
                    <Textarea
                      value={`<iframe src="${window.location.origin}/widget/${eventId}" width="100%" height="600" frameborder="0"></iframe>`}
                      readOnly
                      rows={3}
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`<iframe src="${window.location.origin}/widget/${eventId}" width="100%" height="600" frameborder="0"></iframe>`);
                        toast({
                          title: "Copied!",
                          description: "Embed code copied to clipboard"
                        });
                      }}
                    >
                      Copy Embed Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="seats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Seat Map Management
              </CardTitle>
              <CardDescription>
                Configure seating options for your event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Seat Maps */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="enableSeatMaps" className="text-base font-medium">
                    Enable Seat Maps
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow guests to select specific seats when purchasing tickets
                  </p>
                </div>
                <Switch
                  id="enableSeatMaps"
                  checked={widgetCustomization.seatMaps?.enabled || false}
                  onCheckedChange={(checked) => updateWidgetCustomization(['seatMaps', 'enabled'], checked)}
                />
              </div>

              {/* Seat Map Designer - Only show when enabled */}
              {widgetCustomization.seatMaps?.enabled && (
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Seating Layout Design</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create custom seating layouts to allow guests to select their preferred seats during ticket purchase.
                    </p>
                    <Button 
                      onClick={() => {
                        console.log("=== SEAT MAP BUTTON CLICKED ===");
                        console.log("Event ID:", eventId);
                        console.log("Event Data:", eventData);
                        console.log("Current showSeatMapDesigner state:", showSeatMapDesigner);
                        setShowSeatMapDesigner(true);
                        console.log("Set showSeatMapDesigner to true");
                      }}
                      className="w-full"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Open Seat Map Designer
                    </Button>
                  </div>
                </div>
              )}

              {/* Information when disabled */}
              {!widgetCustomization.seatMaps?.enabled && (
                <div className="text-center p-6 border rounded-lg bg-muted/30">
                  <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Enable seat maps above to create custom seating layouts for your event
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          {/* Ticket Types & Pricing Management */}
          <TicketTypesManager eventId={eventId} />
          
          {/* Ticket Design Customization */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Design & Appearance</CardTitle>
              <CardDescription>Customize how your tickets look when sent to customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ticket Design</CardTitle>
                    <CardDescription>Customize ticket appearance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticketTemplate">Template</Label>
                      <Select
                        value={ticketCustomization.design.template}
                        onValueChange={(value) => updateTicketCustomization(['design', 'template'], value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern">Modern</SelectItem>
                          <SelectItem value="classic">Classic</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="elegant">Elegant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticketBgColor">Background Color</Label>
                      <Input
                        id="ticketBgColor"
                        type="color"
                        value={ticketCustomization.design.backgroundColor}
                        onChange={(e) => updateTicketCustomization(['design', 'backgroundColor'], e.target.value)}
                        className="w-full h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticketTextColor">Text Color</Label>
                      <Input
                        id="ticketTextColor"
                        type="color"
                        value={ticketCustomization.design.textColor}
                        onChange={(e) => updateTicketCustomization(['design', 'textColor'], e.target.value)}
                        className="w-full h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qrCodePosition">QR Code Position</Label>
                      <Select
                        value={ticketCustomization.design.qrCodePosition}
                        onValueChange={(value) => updateTicketCustomization(['design', 'qrCodePosition'], value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-left">Top Left</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticketFontFamily">Font Family</Label>
                      <Select
                        value={ticketCustomization.design.fontFamily || "Inter"}
                        onValueChange={(value) => updateTicketCustomization(['design', 'fontFamily'], value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Modern Sans-Serif Fonts */}
                          <SelectItem value="Inter" className="font-inter">Inter</SelectItem>
                          <SelectItem value="Roboto" className="font-roboto">Roboto</SelectItem>
                          <SelectItem value="Open Sans" className="font-open-sans">Open Sans</SelectItem>
                          <SelectItem value="Poppins" className="font-poppins">Poppins</SelectItem>
                          <SelectItem value="Montserrat" className="font-montserrat">Montserrat</SelectItem>
                          <SelectItem value="Lato" className="font-lato">Lato</SelectItem>
                          <SelectItem value="Source Sans Pro" className="font-source-sans-pro">Source Sans Pro</SelectItem>
                          <SelectItem value="Ubuntu" className="font-ubuntu">Ubuntu</SelectItem>
                          <SelectItem value="Noto Sans" className="font-noto-sans">Noto Sans</SelectItem>
                          <SelectItem value="Work Sans" className="font-work-sans">Work Sans</SelectItem>
                          <SelectItem value="PT Sans" className="font-pt-sans">PT Sans</SelectItem>
                          <SelectItem value="Oswald" className="font-oswald">Oswald</SelectItem>
                          <SelectItem value="Raleway" className="font-raleway">Raleway</SelectItem>
                          <SelectItem value="Nunito" className="font-nunito">Nunito</SelectItem>
                          <SelectItem value="Quicksand" className="font-quicksand">Quicksand</SelectItem>
                          <SelectItem value="Josefin Sans" className="font-josefin-sans">Josefin Sans</SelectItem>
                          <SelectItem value="DM Sans" className="font-dm-sans">DM Sans</SelectItem>
                          <SelectItem value="Outfit" className="font-outfit">Outfit</SelectItem>
                          <SelectItem value="Plus Jakarta Sans" className="font-plus-jakarta-sans">Plus Jakarta Sans</SelectItem>
                          <SelectItem value="Albert Sans" className="font-albert-sans">Albert Sans</SelectItem>
                          <SelectItem value="Onest" className="font-onest">Onest</SelectItem>
                          <SelectItem value="Geist" className="font-geist">Geist</SelectItem>
                          <SelectItem value="Cal Sans" className="font-cal-sans">Cal Sans</SelectItem>
                          <SelectItem value="General Sans" className="font-general-sans">General Sans</SelectItem>
                          <SelectItem value="Clash Display" className="font-clash-display">Clash Display</SelectItem>
                          <SelectItem value="Clash Grotesk" className="font-clash-grotesk">Clash Grotesk</SelectItem>
                          <SelectItem value="Sentient" className="font-sentient">Sentient</SelectItem>
                          <SelectItem value="Chillax" className="font-chillax">Chillax</SelectItem>
                          <SelectItem value="Cabinet Grotesk" className="font-cabinet-grotesk">Cabinet Grotesk</SelectItem>
                          <SelectItem value="Switzer" className="font-switzer">Switzer</SelectItem>
                          <SelectItem value="Gambarino" className="font-gambarino">Gambarino</SelectItem>
                          <SelectItem value="Melodrama" className="font-melodrama">Melodrama</SelectItem>
                          <SelectItem value="Zodiak" className="font-zodiak">Zodiak</SelectItem>
                          <SelectItem value="Panchang" className="font-panchang">Panchang</SelectItem>
                          
                          {/* Classic Serif Fonts */}
                          <SelectItem value="Playfair Display" className="font-playfair-display">Playfair Display</SelectItem>
                          <SelectItem value="Merriweather" className="font-merriweather">Merriweather</SelectItem>
                          
                          {/* System Fonts */}
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="-apple-system">System Font</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ticket Content</CardTitle>
                    <CardDescription>Choose what information to include</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTicketLogo">Show Logo</Label>
                      <Switch
                        id="showTicketLogo"
                        checked={ticketCustomization.content.showLogo}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showLogo'], checked)}
                      />
                    </div>
                    
                    {ticketCustomization.content.showLogo && (
                      <div className="space-y-3 pl-4 border-l-2 border-border">
                        <div className="space-y-2">
                          <Label htmlFor="ticketLogoSource">Logo Source</Label>
                          <Select
                            value={ticketCustomization.content.logoSource || 'event'}
                            onValueChange={(value) => updateTicketCustomization(['content', 'logoSource'], value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="event">Use Event Logo</SelectItem>
                              <SelectItem value="organization">Use Organization Logo</SelectItem>
                              <SelectItem value="custom">Custom Ticket Logo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {ticketCustomization.content.logoSource === 'event' && (
                          <div className="space-y-3">
                            <Label>Event Logo Upload</Label>
                            <EventLogoUploader 
                              eventId={eventId}
                               currentLogoUrl={currentLogoUrl || undefined}
                              onLogoChange={(logoUrl) => {
                                setCurrentLogoUrl(logoUrl);
                                // Refresh event data to get updated logo
                                loadCustomizations();
                              }}
                            />
                            {!currentLogoUrl && (
                              <p className="text-sm text-muted-foreground">
                                Upload an event logo to display on tickets when "Use Event Logo" is selected.
                              </p>
                            )}
                          </div>
                        )}
                        
                        {ticketCustomization.content.logoSource === 'custom' && (
                          <div className="space-y-2">
                            <Label htmlFor="customTicketLogo">Custom Ticket Logo URL</Label>
                            <Input
                              id="customTicketLogo"
                              type="url"
                              placeholder="https://example.com/logo.png"
                              value={ticketCustomization.content.customLogoUrl || ''}
                              onChange={(e) => updateTicketCustomization(['content', 'customLogoUrl'], e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTicketQrCode">Show QR Code</Label>
                      <Switch
                        id="showTicketQrCode"
                        checked={ticketCustomization.content.showQrCode}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showQrCode'], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTicketEventDetails">Show Event Details</Label>
                      <Switch
                        id="showTicketEventDetails"
                        checked={ticketCustomization.content.showEventDetails}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showEventDetails'], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTicketVenueInfo">Show Venue Info</Label>
                      <Switch
                        id="showTicketVenueInfo"
                        checked={ticketCustomization.content.showVenueInfo}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showVenueInfo'], checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Email Template</CardTitle>
                <CardDescription>Customize email appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailHeaderColor">Header Color</Label>
                  <Input
                    id="emailHeaderColor"
                    type="color"
                    value={emailCustomization.template.headerColor}
                    onChange={(e) => updateEmailCustomization(['template', 'headerColor'], e.target.value)}
                    className="w-full h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailBgColor">Background Color</Label>
                  <Input
                    id="emailBgColor"
                    type="color"
                    value={emailCustomization.template.backgroundColor}
                    onChange={(e) => updateEmailCustomization(['template', 'backgroundColor'], e.target.value)}
                    className="w-full h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailTextColor">Text Color</Label>
                  <Input
                    id="emailTextColor"
                    type="color"
                    value={emailCustomization.template.textColor}
                    onChange={(e) => updateEmailCustomization(['template', 'textColor'], e.target.value)}
                    className="w-full h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailButtonColor">Button Color</Label>
                  <Input
                    id="emailButtonColor"
                    type="color"
                    value={emailCustomization.template.buttonColor}
                    onChange={(e) => updateEmailCustomization(['template', 'buttonColor'], e.target.value)}
                    className="w-full h-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
                <CardDescription>Customize email text and messaging</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailSubject">Subject Line</Label>
                  <Input
                    id="emailSubject"
                    value={emailCustomization.content.subject}
                    onChange={(e) => updateEmailCustomization(['content', 'subject'], e.target.value)}
                    placeholder="Your ticket confirmation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailHeaderText">Header Text</Label>
                  <Input
                    id="emailHeaderText"
                    value={emailCustomization.content.headerText}
                    onChange={(e) => updateEmailCustomization(['content', 'headerText'], e.target.value)}
                    placeholder="Thank you for your purchase!"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailBodyText">Body Text</Label>
                  <Textarea
                    id="emailBodyText"
                    value={emailCustomization.content.bodyText}
                    onChange={(e) => updateEmailCustomization(['content', 'bodyText'], e.target.value)}
                    placeholder="We are excited to see you at the event."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailFooterText">Footer Text</Label>
                  <Input
                    id="emailFooterText"
                    value={emailCustomization.content.footerText}
                    onChange={(e) => updateEmailCustomization(['content', 'footerText'], e.target.value)}
                    placeholder="Questions? Contact us anytime."
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailShowLogo">Show Logo</Label>
                  <Switch
                    id="emailShowLogo"
                    checked={emailCustomization.branding.showLogo}
                    onCheckedChange={(checked) => updateEmailCustomization(['branding', 'showLogo'], checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organiser Notifications</CardTitle>
                <CardDescription>Get notified when tickets are sold</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="organiserNotifications">Send notifications when tickets are sold</Label>
                  <Switch
                    id="organiserNotifications"
                    checked={emailCustomization.notifications?.organiserNotifications || false}
                    onCheckedChange={(checked) => updateEmailCustomization(['notifications', 'organiserNotifications'], checked)}
                  />
                </div>
                {emailCustomization.notifications?.organiserNotifications && (
                  <div className="space-y-2">
                    <Label htmlFor="organiserEmail">Notification Email</Label>
                    <Input
                      id="organiserEmail"
                      type="email"
                      value={emailCustomization.notifications?.organiserEmail || ""}
                      onChange={(e) => updateEmailCustomization(['notifications', 'organiserEmail'], e.target.value)}
                      placeholder="Enter email to receive notifications"
                    />
                    <p className="text-sm text-muted-foreground">
                      You'll receive an email with ticket details and customer information each time a ticket is sold.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="merchandise" className="space-y-6">
          <MerchandiseManager eventId={eventId} />
        </TabsContent>

        <TabsContent value="attendees" className="space-y-6">
          <AttendeeManagement eventId={eventId} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <EventLogoUploader
            eventId={eventId}
            currentLogoUrl={currentLogoUrl || undefined}
            onLogoChange={url => {
              setCurrentLogoUrl(url);
              setEventData(prev => prev ? { ...prev, logo_url: url } : prev);
            }}
          />
          <Card>
            <CardHeader>
              <CardTitle>Event Settings</CardTitle>
              <CardDescription>Configure event publication and general settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Event Status</Label>
                    <p className="text-sm text-muted-foreground">
                      {eventData?.status === 'published' 
                        ? 'Your event is live and accepting ticket sales' 
                        : 'Your event is in draft mode and not visible to the public'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {eventData?.status === 'published' ? 'Live' : 'Draft'}
                    </span>
                    <Switch
                      checked={eventData?.status === 'published'}
                      onCheckedChange={async (checked) => {
                        try {
                          const { error } = await supabase
                            .from("events")
                            .update({ status: checked ? 'published' : 'draft' })
                            .eq("id", eventId);

                          if (error) throw error;

                          setEventData(prev => prev ? ({ ...prev, status: checked ? 'published' : 'draft' }) : null);
                          
                          toast({
                            title: "Success",
                            description: checked 
                              ? "Event published successfully! It's now live and accepting ticket sales." 
                              : "Event unpublished. It's now in draft mode and not visible to the public."
                          });
                        } catch (error) {
                          console.error("Error updating event status:", error);
                          toast({
                            title: "Error",
                            description: "Failed to update event status",
                            variant: "destructive"
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="venueName">Venue Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="venueName"
                      placeholder="e.g. Spark Arena"
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from("events")
                            .update({ venue: eventVenue || null })
                            .eq("id", eventId);
                          if (error) throw error;
                          setEventData(prev => prev ? ({ ...prev, venue: eventVenue || null }) : prev);
                          toast({ title: "Saved", description: "Venue updated" });
                        } catch (error) {
                          console.error("Error updating venue:", error);
                          toast({ title: "Error", description: "Failed to update venue", variant: "destructive" });
                        }
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              {/* Event URL and Widget Embedding */}
              {eventData?.status === 'published' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Public Event URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/widget/${eventId}`}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/widget/${eventId}`);
                          toast({
                            title: "Copied!",
                            description: "Event URL copied to clipboard"
                          });
                        }}
                      >
                        Copy URL
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Widget Embed Code</Label>
                    <div className="space-y-2">
                      <Textarea
                        value={`<iframe src="${window.location.origin}/widget/${eventId}" width="100%" height="600" frameborder="0"></iframe>`}
                        readOnly
                        rows={3}
                        className="text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`<iframe src="${window.location.origin}/widget/${eventId}" width="100%" height="600" frameborder="0"></iframe>`);
                          toast({
                            title: "Copied!",
                            description: "Widget embed code copied to clipboard"
                          });
                        }}
                      >
                        Copy Embed Code
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Direct Widget URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/widget/${eventId}`}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/widget/${eventId}`);
                          toast({
                            title: "Copied!",
                            description: "Widget URL copied to clipboard"
                          });
                        }}
                      >
                        Copy URL
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Delivery Method */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Default Ticket Delivery Method</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose how tickets will be delivered to customers by default
                  </p>
                  <Select
                    value={(eventData as any)?.ticket_delivery_method || 'qr_ticket'}
                    onValueChange={async (value: 'qr_ticket' | 'confirmation_email') => {
                      try {
                        const { error } = await supabase
                          .from("events")
                          .update({ ticket_delivery_method: value })
                          .eq("id", eventId);

                        if (error) throw error;

                        setEventData(prev => prev ? ({ ...prev, ticket_delivery_method: value }) : null);
                        
                        toast({
                          title: "Success",
                          description: "Ticket delivery method updated"
                        });
                      } catch (error) {
                        console.error("Error updating delivery method:", error);
                        toast({
                          title: "Error",
                          description: "Failed to update delivery method",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qr_ticket">Digital QR Code Tickets</SelectItem>
                      <SelectItem value="confirmation_email">Email Confirmation Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Checkout Mode */}
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Checkout Experience</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose how customers will complete their purchase
                  </p>
                  <Select
                    value={(eventData?.widget_customization as any)?.checkoutMode || 'onepage'}
                    onValueChange={async (value: 'onepage' | 'multistep') => {
                      try {
                        const currentCustomization = (eventData?.widget_customization as any) || {};
                        const { error } = await supabase
                          .from("events")
                          .update({ 
                            widget_customization: {
                              ...currentCustomization,
                              checkoutMode: value
                            }
                          })
                          .eq("id", eventId);

                        if (error) throw error;

                        setEventData(prev => prev ? ({
                          ...prev,
                          widget_customization: {
                            ...currentCustomization,
                            checkoutMode: value
                          } as any
                        }) : null);
                        
                        toast({
                          title: "Success",
                          description: "Checkout mode updated"
                        });
                      } catch (error) {
                        console.error("Error updating checkout mode:", error);
                        toast({
                          title: "Error",
                          description: "Failed to update checkout mode",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onepage">One Page Checkout</SelectItem>
                      <SelectItem value="multistep">Multi-Step Checkout</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Multi-step includes: ticket selection → add-ons → customer details → payment with order summary sidebar
                  </p>
                </div>
              </div>

              {/* Test Mode */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Test Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    {eventData?.test_mode 
                      ? 'Event is in test mode - no real payments will be processed' 
                      : 'Event is in live mode - real payments will be processed'
                    }
                  </p>
                </div>
                <Switch
                  checked={eventData?.test_mode || false}
                  onCheckedChange={async (checked) => {
                    try {
                      const { error } = await supabase
                        .from("events")
                        .update({ test_mode: checked })
                        .eq("id", eventId);

                      if (error) throw error;

                      setEventData(prev => prev ? ({ ...prev, test_mode: checked }) : null);
                      
                      toast({
                        title: "Success",
                        description: checked 
                          ? "Event switched to test mode" 
                          : "Event switched to live mode"
                      });
                    } catch (error) {
                      console.error("Error updating test mode:", error);
                      toast({
                        title: "Error",
                        description: "Failed to update test mode",
                        variant: "destructive"
                      });
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Seat Map Designer Modal */}
      {showSeatMapDesigner && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full h-[90vh] flex flex-col shadow-xl border">
            <div className="p-4 border-b flex items-center justify-between bg-white dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Seat Map Designer - {eventData?.name || 'Loading...'}
              </h2>
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log("=== CLOSING SEAT MAP DESIGNER ===");
                  setShowSeatMapDesigner(false);
                }}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
              {eventData ? (
                <SeatMapDesigner
                  eventId={eventId}
                  eventName={eventData.name}
                  onClose={() => {
                    console.log("=== CLOSING SEAT MAP DESIGNER ===");
                    setShowSeatMapDesigner(false);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading event data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCustomization;