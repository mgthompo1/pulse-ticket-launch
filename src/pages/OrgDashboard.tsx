import { useState } from "react";
import React from "react";
import XeroIntegration from "@/components/XeroIntegration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AIEventGenerator from "@/components/AIEventGenerator";
import AIChatbot from "@/components/AIChatbot";
import BillingDashboard from "@/components/BillingDashboard";
import { EventLogoUploader } from "@/components/events/EventLogoUploader";
import { SeatMapDesigner } from "@/components/SeatMapDesigner";
import EventCustomization from "@/components/EventCustomization";
import { PaymentConfiguration } from "@/components/PaymentConfiguration";
import AttendeeManagement from "@/components/AttendeeManagement";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Calendar, Users, Ticket, Settings, BarChart3, Mail, Palette, Globe, Plus, Edit, Trash2, CreditCard, Sparkles, MessageSquare, Bell, Monitor, LogOut, X, Link, Package, Shield, Menu } from "lucide-react";
import MerchandiseManager from "@/components/MerchandiseManager";
import OrganizationSettings from "@/components/OrganizationSettings";
import Invoicing from "./Invoicing";
import { SecurityDashboard } from "@/components/SecurityDashboard";
import { MarketingTools } from "@/components/MarketingTools";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { useNavigate } from "react-router-dom";

// Custom mobile sidebar trigger component
const MobileSidebarTrigger = () => {
  const { toggleSidebar } = useSidebar();
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleSidebar}
      className="h-8 w-8 p-0"
    >
      <Menu className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};

const OrgDashboard = () => {
  console.log("=== OrgDashboard component rendering ===");
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "windcave">("stripe");
  const [testMode, setTestMode] = useState<boolean>(true);
  const [testModeAnalytics, setTestModeAnalytics] = useState({
    totalEvents: 0,
    totalOrders: 0,
    totalRevenue: 0,
    estimatedPlatformFees: 0
  });

  // Design state
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [customCss, setCustomCss] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [windcaveConfig, setWindcaveConfig] = useState({
    username: "",
    apiKey: "",
    endpoint: "UAT" as "SEC" | "UAT",
    enabled: false,
    applePayMerchantId: "",
    hitUsername: "",
    hitKey: "",
    stationId: "",
    currency: "NZD"
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [eventForm, setEventForm] = useState({
    name: "",
    date: "",
    venue: "",
    capacity: "",
    description: ""
  });
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Ticket type form state
  const [ticketTypeForm, setTicketTypeForm] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    saleStartDate: "",
    saleEndDate: ""
  });
  const [isCreatingTicketType, setIsCreatingTicketType] = useState(false);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [showSeatMapDesigner, setShowSeatMapDesigner] = useState(false);
  
  // Edit ticket type state
  const [editingTicketType, setEditingTicketType] = useState(null);
  const [editTicketTypeForm, setEditTicketTypeForm] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    saleStartDate: "",
    saleEndDate: ""
  });
  const [isUpdatingTicketType, setIsUpdatingTicketType] = useState(false);
  
  // Custom questions state
  const [customQuestions, setCustomQuestions] = useState([]);
  const [showCustomQuestionsDialog, setShowCustomQuestionsDialog] = useState(false);
  const [showAdvancedSettingsDialog, setShowAdvancedSettingsDialog] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    label: "",
    type: "text",
    required: false,
    options: ""
  });
  
  // Advanced settings state
  const [advancedSettings, setAdvancedSettings] = useState({
    collectPhone: false,
    requireApproval: false,
    customSuccessMessage: "",
    emailNotifications: true,
    reminderEmails: true
  });

  const loadTicketTypes = async (eventId: string) => {
    const { data: ticketTypesData, error } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading ticket types:", error);
      return;
    }

    setTicketTypes(ticketTypesData || []);
  };

  // Load ticket types when selectedEvent changes
  React.useEffect(() => {
    if (selectedEvent?.id) {
      loadTicketTypes(selectedEvent.id);
    }
  }, [selectedEvent]);

  // Load organization and events
  React.useEffect(() => {
    const loadOrganization = async () => {
      if (!user) {
        console.log("No user found, cannot load organization");
        return;
      }

      console.log("Loading organization for user:", user.id);

      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error loading organization:", error);
        
        // If no organization exists, show a message to create one
        if (error.code === 'PGRST116') {
          toast({
            title: "No Organization Found",
            description: "Please create an organization first to manage events.",
            variant: "destructive"
          });
        }
        return;
      }

      if (orgs) {
        console.log("Organization loaded:", orgs);
        setOrganizationId(orgs.id);
        setOrganizationData(orgs);
        setTestMode(orgs.test_mode ?? true);
        setStripeConnected(!!(orgs as any).stripe_account_id);
        setStripeOnboardingComplete(!!(orgs as any).stripe_onboarding_complete);
        setPaymentProvider((orgs as any).payment_provider || "stripe");
        setWindcaveConfig({
          username: (orgs as any).windcave_username || "",
          apiKey: (orgs as any).windcave_api_key || "",
          endpoint: (orgs as any).windcave_endpoint || "UAT",
          enabled: !!(orgs as any).windcave_enabled,
          applePayMerchantId: (orgs as any).apple_pay_merchant_id || "",
          hitUsername: (orgs as any).windcave_hit_username || "",
          hitKey: (orgs as any).windcave_hit_key || "",
          stationId: (orgs as any).windcave_station_id || "",
          currency: (orgs as any).currency || "NZD"
        });
        
        // Load events for this organization
        loadEvents(orgs.id);
        // Load test mode analytics
        loadTestModeAnalytics(orgs.id);
      }
    };

    loadOrganization();
  }, [user]);

  const loadEvents = async (orgId: string) => {
    const { data: eventsData, error } = await supabase
      .from("events")
      .select("*")
      .eq("organization_id", orgId)
      .eq("test_mode", testMode)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading events:", error);
      return;
    }

    if (eventsData) {
      const formattedEvents = eventsData.map(event => ({
        id: event.id,
        name: event.name,
        date: event.event_date,
        venue: event.venue,
        capacity: event.capacity,
        description: event.description,
        status: event.status,
        test_mode: event.test_mode,
        tickets: { sold: 0, total: event.capacity }, // Will be updated with real data
        revenue: "$0" // Will be updated with real data
      }));
      setEvents(formattedEvents);
    }
  };

  const loadTestModeAnalytics = async (orgId: string) => {
    const { data: analyticsData, error } = await supabase
      .from("test_mode_analytics")
      .select("*")
      .eq("organization_id", orgId)
      .eq("test_mode", testMode)
      .single();

    if (error) {
      console.error("Error loading test mode analytics:", error);
      // Set default values if no data
      setTestModeAnalytics({
        totalEvents: 0,
        totalOrders: 0,
        totalRevenue: 0,
        estimatedPlatformFees: 0
      });
      return;
    }

    if (analyticsData) {
      setTestModeAnalytics({
        totalEvents: analyticsData.total_events || 0,
        totalOrders: analyticsData.total_orders || 0,
        totalRevenue: analyticsData.total_revenue || 0,
        estimatedPlatformFees: analyticsData.estimated_platform_fees || 0
      });
    }
  };

  const handleToggleTestMode = async () => {
    if (!organizationId) return;

    try {
      const newTestMode = !testMode;
      
      const { error } = await supabase
        .from("organizations")
        .update({ test_mode: newTestMode })
        .eq("id", organizationId);

      if (error) {
        console.error("Error updating test mode:", error);
        toast({
          title: "Error",
          description: "Failed to update test mode",
          variant: "destructive"
        });
        return;
      }

      setTestMode(newTestMode);
      
      // Reload events and analytics for the new mode
      loadEvents(organizationId);
      loadTestModeAnalytics(organizationId);

      toast({
        title: "Success",
        description: `Switched to ${newTestMode ? 'Test' : 'Live'} mode`,
      });
    } catch (error) {
      console.error("Error toggling test mode:", error);
      toast({
        title: "Error",
        description: "Failed to toggle test mode",
        variant: "destructive"
      });
    }
  };

  const handleCreateEvent = async () => {
    if (!organizationId || !eventForm.name || !eventForm.date || !eventForm.venue || !eventForm.capacity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingEvent(true);
    try {
      const { data: newEvent, error } = await supabase
        .from("events")
        .insert({
          name: eventForm.name,
          event_date: eventForm.date,
          venue: eventForm.venue,
          capacity: parseInt(eventForm.capacity),
          description: eventForm.description,
          organization_id: organizationId,
          test_mode: testMode
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created successfully!"
      });

      // Reset form
      setEventForm({
        name: "",
        date: "",
        venue: "",
        capacity: "",
        description: ""
      });

      // Reload events
      loadEvents(organizationId);
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header with minimal controls */}
      <header className="border-b flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile sidebar trigger - only shows on mobile */}
            <div className="flex items-center gap-2 md:hidden">
              <MobileSidebarTrigger />
            </div>
            
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center space-x-2">
                <Label htmlFor="test-mode" className="text-sm">
                  {testMode ? "Test Mode" : "Live Mode"}
                </Label>
                <Switch
                  id="test-mode"
                  checked={testMode}
                  onCheckedChange={handleToggleTestMode}
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/")}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Exit Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar and content below header - takes remaining space */}
      <SidebarProvider>
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            selectedEvent={selectedEvent} 
          />
          
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-4 md:py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-8">
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="gradient-card hover-scale">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{events.length}</div>
                    <p className="text-xs text-muted-foreground">Active events</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card hover-scale">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{testModeAnalytics.totalOrders}</div>
                    <p className="text-xs text-muted-foreground">Total orders placed</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card hover-scale">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${testModeAnalytics.totalRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Total revenue generated</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card hover-scale">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${testModeAnalytics.estimatedPlatformFees.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Estimated fees</p>
                  </CardContent>
                </Card>
              </div>

              {/* Add Analytics Charts */}
              <AnalyticsCharts />

              <Card>
                <CardHeader>
                  <CardTitle>Recent Events</CardTitle>
                  <CardDescription>Your latest event performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {events.map((event) => (
                       <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4">
                         <div className="space-y-1 flex-1">
                           <h3 className="font-medium">{event.name}</h3>
                           <p className="text-sm text-muted-foreground">{event.date} • {event.venue}</p>
                         </div>
                         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                           <div className="text-left sm:text-right">
                             <p className="text-sm font-medium">{event.tickets.sold}/{event.tickets.total} tickets</p>
                             <p className="text-sm text-muted-foreground">{event.revenue}</p>
                           </div>
                           <Badge variant={event.status === "published" ? "default" : "secondary"} className="w-fit">
                             {event.status}
                           </Badge>
                           <div className="flex gap-2 w-full sm:w-auto">
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => {
                                 setSelectedEvent(event);
                                 setActiveTab("event-details");
                               }}
                               className="flex-1 sm:flex-none"
                             >
                               <Users className="h-4 w-4 mr-2" />
                               <span className="hidden sm:inline">Manage</span>
                               <span className="sm:hidden">Manage</span>
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => window.open(`/ticket2live/${event.id}`, '_blank')}
                               className="flex-1 sm:flex-none"
                             >
                               <Monitor className="h-4 w-4 mr-2" />
                               <span className="hidden sm:inline">Ticket2LIVE</span>
                               <span className="sm:hidden">Live</span>
                             </Button>
                           </div>
                         </div>
                       </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Event</CardTitle>
                  <CardDescription>Start selling tickets for your next event</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="event-name">Event Name *</Label>
                      <Input
                        id="event-name"
                        value={eventForm.name}
                        onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter event name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-date">Event Date *</Label>
                      <Input
                        id="event-date"
                        type="datetime-local"
                        value={eventForm.date}
                        onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-venue">Venue *</Label>
                      <Input
                        id="event-venue"
                        value={eventForm.venue}
                        onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                        placeholder="Enter venue name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-capacity">Capacity *</Label>
                      <Input
                        id="event-capacity"
                        type="number"
                        value={eventForm.capacity}
                        onChange={(e) => setEventForm(prev => ({ ...prev, capacity: e.target.value }))}
                        placeholder="Maximum attendees"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea
                      id="event-description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Event description"
                      rows={4}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateEvent} 
                    disabled={isCreatingEvent}
                    className="w-full md:w-auto"
                  >
                    {isCreatingEvent ? "Creating..." : "Create Event"}
                  </Button>
                </CardContent>
              </Card>

              {/* Events List */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Events</CardTitle>
                  <CardDescription>Manage your existing events</CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No events created yet. Create your first event above!</p>
                  ) : (
                    <div className="space-y-4">
                      {events.map((event) => (
                        <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4">
                          <div className="space-y-1 flex-1">
                            <h3 className="font-medium">{event.name}</h3>
                            <p className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString()} • {event.venue}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event);
                                setActiveTab("event-details");
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="event-details" className="space-y-6">
              {selectedEvent ? (
                <div className="space-y-6">
                  <EventCustomization eventId={selectedEvent.id} />
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground text-center">Select an event from the events tab to view details</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ai-tools" className="space-y-6">
              <AIEventGenerator />
            </TabsContent>

            <TabsContent value="invoicing" className="space-y-6">
              <Invoicing />
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <PaymentConfiguration organizationId={organizationId} />
            </TabsContent>

            <TabsContent value="design" className="space-y-6">
              {selectedEvent ? (
                <EventCustomization eventId={selectedEvent.id} />
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground text-center">Select an event to customize its design</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="marketing" className="space-y-6">
              <MarketingTools selectedEvent={selectedEvent} />
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <BillingDashboard organizationId={organizationId} isLoading={false} />
            </TabsContent>

            <TabsContent value="integrations" className="space-y-6">
              <XeroIntegration organizationId={organizationId} />
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <SecurityDashboard />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <OrganizationSettings />
            </TabsContent>
          </Tabs>
          
          {/* AI Chatbot */}
          <AIChatbot context={{ organizationId }} />

          {/* Seat Map Designer Modal */}
          {showSeatMapDesigner && selectedEvent && (
            <SeatMapDesigner
              eventId={selectedEvent.id}
              eventName={selectedEvent.name}
              onClose={() => setShowSeatMapDesigner(false)}
            />
          )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default OrgDashboard;
