import React, { useState, useEffect } from "react";
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
import { Palette, Layout, Mail, Ticket, Monitor, Save, MapPin, Users, Package, Settings } from "lucide-react";
import { SeatMapDesigner } from "@/components/SeatMapDesigner";
import AttendeeManagement from "@/components/AttendeeManagement";
import MerchandiseManager from "@/components/MerchandiseManager";
import TicketTypesManager from "@/components/TicketTypesManager";

interface EventCustomizationProps {
  eventId: string;
  onSave?: () => void;
}

const EventCustomization: React.FC<EventCustomizationProps> = ({ eventId, onSave }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSeatMapDesigner, setShowSeatMapDesigner] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  
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
    }
  });

  // Ticket customization state
  const [ticketCustomization, setTicketCustomization] = useState({
    design: {
      template: "modern",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      borderColor: "#e5e7eb",
      qrCodePosition: "bottom-right"
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
    }
  });

  useEffect(() => {
    loadCustomizations();
  }, [eventId]);

  const loadCustomizations = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("widget_customization, ticket_customization, email_customization, name, status, test_mode")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      setEventData(data);

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
  };

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
      const updated = { ...prev };
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const updateTicketCustomization = (path: string[], value: any) => {
    setTicketCustomization(prev => {
      const updated = { ...prev };
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const updateEmailCustomization = (path: string[], value: any) => {
    setEmailCustomization(prev => {
      const updated = { ...prev };
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
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
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
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
          </div>
        </TabsContent>

        <TabsContent value="merchandise" className="space-y-6">
          <MerchandiseManager eventId={eventId} />
        </TabsContent>

        <TabsContent value="attendees" className="space-y-6">
          <AttendeeManagement eventId={eventId} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
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

                          setEventData(prev => ({ ...prev, status: checked ? 'published' : 'draft' }));
                          
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

                      setEventData(prev => ({ ...prev, test_mode: checked }));
                      
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
      {showSeatMapDesigner && eventData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-6xl w-full h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Seat Map Designer - {eventData.name}</h2>
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
            <div className="flex-1 overflow-hidden">
              <SeatMapDesigner
                eventId={eventId}
                eventName={eventData.name}
                onClose={() => {
                  console.log("=== CLOSING SEAT MAP DESIGNER ===");
                  setShowSeatMapDesigner(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCustomization;