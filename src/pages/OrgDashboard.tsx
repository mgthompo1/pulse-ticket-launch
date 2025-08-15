import React, { useState, useEffect, useCallback } from "react";
import XeroIntegration from "@/components/XeroIntegration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { EventAnalytics } from "@/components/EventAnalytics";
import AIChatbot from "@/components/AIChatbot";
import BillingDashboard from "@/components/BillingDashboard";
import { SeatMapDesigner } from "@/components/SeatMapDesigner";
import EventCustomization from "@/components/EventCustomization";
import { PaymentConfiguration } from "@/components/PaymentConfiguration";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Calendar, Users, Ticket, BarChart3, Edit, Monitor, LogOut, Menu, Sun, Moon } from "lucide-react";
import OrganizationSettings from "@/components/OrganizationSettings";
import OrganizationOnboarding from "@/components/OrganizationOnboarding";
import Invoicing from "./Invoicing";
import { SecurityDashboard } from "@/components/SecurityDashboard";
import { MarketingTools } from "@/components/MarketingTools";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { useNavigate } from "react-router-dom";

// Types
type DashboardEvent = {
  id: string;
  name: string;
  date: string;
  venue: string | null;
  capacity: number;
  description: string | null;
  status: string;
  test_mode: boolean;
  tickets: { sold: number; total: number };
  revenue: string;
};

type SalesPoint = { month: string; sales: number; tickets: number };
type EventTypeDatum = { name: string; value: number; color: string };
type RevenuePoint = { day: string; revenue: number };

type AnalyticsState = {
  salesData: SalesPoint[];
  eventTypeData: EventTypeDatum[];
  revenueData: RevenuePoint[];
  isLoading: boolean;
};

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
  const { themePreset } = useTheme();
const [events, setEvents] = useState<DashboardEvent[]>([]);
const [selectedEvent, setSelectedEvent] = useState<DashboardEvent | null>(null);

const [activeTab, setActiveTab] = useState("overview");
const [organizationId, setOrganizationId] = useState<string>("");
const [showOnboarding, setShowOnboarding] = useState(false);
const [testMode, setTestMode] = useState<boolean>(true);
const [testModeAnalytics, setTestModeAnalytics] = useState({
  totalEvents: 0,
  totalOrders: 0,
  totalRevenue: 0,
  estimatedPlatformFees: 0
});

// Analytics data for charts
const [analyticsData, setAnalyticsData] = useState<AnalyticsState>({
  salesData: [],
  eventTypeData: [],
  revenueData: [],
  isLoading: true
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
  const [showSeatMapDesigner, setShowSeatMapDesigner] = useState(false);

  



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
        
        // If no organization exists, show onboarding
        if (error.code === 'PGRST116') {
          setShowOnboarding(true);
        }
        return;
      }

if (orgs) {
  console.log("Organization loaded:", orgs);
  setOrganizationId(orgs.id);
  const orgTestMode = (orgs as { test_mode?: boolean }).test_mode ?? true;
  setTestMode(orgTestMode);
  // Load events and analytics for this organization with correct test mode
  loadEvents(orgs.id, orgTestMode);
  loadTestModeAnalytics(orgs.id, orgTestMode);
  loadAnalyticsData(orgs.id, orgTestMode);
}
    };

    loadOrganization();
  }, [user]);

  const loadEvents = useCallback(async (orgId: string, mode?: boolean) => {
    const currentTestMode = mode !== undefined ? mode : testMode;
    console.log("Loading events for org:", orgId, "test_mode:", currentTestMode);
    
    const { data: eventsData, error } = await supabase
      .from("events")
      .select("*")
      .eq("organization_id", orgId)
      .eq("test_mode", currentTestMode)
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
  }, [testMode]);

  const loadTestModeAnalytics = useCallback(async (orgId: string, mode?: boolean) => {
    const currentTestMode = mode !== undefined ? mode : testMode;
    console.log("Loading analytics for org:", orgId, "test_mode:", currentTestMode);
    
    const { data: analyticsData, error } = await supabase
      .from("test_mode_analytics")
      .select("*")
      .eq("organization_id", orgId)
      .eq("test_mode", currentTestMode)
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
  }, [testMode]);

  const loadAnalyticsData = useCallback(async (orgId: string, mode?: boolean) => {
    const currentTestMode = mode !== undefined ? mode : testMode;
    console.log("Loading analytics data for org:", orgId, "test_mode:", currentTestMode);
    
    setAnalyticsData(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Load monthly sales data
      const { data: monthlyData, error: monthlyError } = await supabase
        .from("orders")
        .select(`
          created_at,
          total_amount,
          ticket_types!inner(
            quantity_sold,
            event_id
          ),
          events!inner(
            organization_id
          )
        `)
        .eq("events.organization_id", orgId)
        .eq("test_mode", currentTestMode)
        .gte("created_at", new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString());

      if (monthlyError) {
        console.error("Error loading monthly data:", monthlyError);
      }

      // Process monthly data
      if (monthlyData) {
        const monthlyStats = monthlyData.reduce((acc, order) => {
          const month = new Date(order.created_at).toISOString().slice(0, 7);
          if (!acc[month]) {
            acc[month] = { revenue: 0, orders: 0 };
          }
          acc[month].revenue += order.total_amount;
          acc[month].orders += 1;
          return acc;
        }, {} as Record<string, { revenue: number; orders: number }>);

        setAnalyticsData(prev => ({
          ...prev,
          monthlyData: monthlyStats,
          isLoading: false
        }));
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
      setAnalyticsData(prev => ({ ...prev, isLoading: false }));
    }
  }, [testMode]);

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
      
      // Reload events and analytics for the new mode with explicit test mode
      loadEvents(organizationId, newTestMode);
      loadTestModeAnalytics(organizationId, newTestMode);
      loadAnalyticsData(organizationId, newTestMode);

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

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Reload organization data by triggering the useEffect
    if (user) {
      // Force a reload by updating the user dependency
      window.location.reload();
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
      const { error } = await supabase
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

      // Reload events with current test mode
      loadEvents(organizationId, testMode);
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

  // Show onboarding if no organization exists
  if (showOnboarding) {
    return <OrganizationOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <SidebarProvider>
      <div className="h-screen bg-background flex flex-col dashboard-layout">
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
        <div className="flex flex-1 min-h-0 w-full">
<AppSidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            selectedEvent={selectedEvent ? { id: selectedEvent.id, name: selectedEvent.name, event_date: selectedEvent.date, status: selectedEvent.status } : null} 
          />
          
          <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
            <div className="w-full dashboard-content">
<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-8">
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="gradient-card hover-scale animate-in fade-in-0">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{events.length}</div>
                    <p className="text-xs text-muted-foreground">Active events</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card hover-scale animate-in fade-in-0" style={{ animationDelay: '100ms' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{testModeAnalytics.totalOrders}</div>
                    <p className="text-xs text-muted-foreground">Total orders placed</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card hover-scale animate-in fade-in-0" style={{ animationDelay: '200ms' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${testModeAnalytics.totalRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Total revenue generated</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card hover-scale animate-in fade-in-0" style={{ animationDelay: '300ms' }}>
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
<AnalyticsCharts 
  salesData={analyticsData.salesData}
  eventTypeData={analyticsData.eventTypeData}
  revenueData={analyticsData.revenueData}
  isLoading={analyticsData.isLoading}
/>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Events</CardTitle>
                  <CardDescription>Your latest event performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {events.map((event) => (
                       <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors hover-lift animate-in fade-in-0 gap-4">
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
                               className="flex-1 sm:flex-none hover-scale"
                             >
                               <Users className="h-4 w-4 mr-2" />
                               <span className="hidden sm:inline">Manage</span>
                               <span className="sm:hidden">Manage</span>
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => window.open(`/ticketflolive/${event.id}`, '_blank')}
                               className="flex-1 sm:flex-none hover-scale"
                             >
                               <Monitor className="h-4 w-4 mr-2" />
                               <span className="hidden sm:inline">TicketFloLIVE</span>
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
              {/* Events List - Now at the top */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Events</CardTitle>
                  <CardDescription>Manage your existing events</CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No events created yet. Create your first event below!</p>
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

            <TabsContent value="analytics" className="space-y-6">
              <EventAnalytics events={events} testMode={testMode} />
            </TabsContent>

            <TabsContent value="invoicing" className="space-y-6">
              <Invoicing />
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <PaymentConfiguration organizationId={organizationId} />
            </TabsContent>

            <TabsContent value="design" className="space-y-6">
              {selectedEvent ? (
                <SeatMapDesigner
                  eventId={selectedEvent.id}
                  eventName={selectedEvent.name}
                  onClose={() => setShowSeatMapDesigner(false)}
                />
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground text-center">Select an event to design its seat map and layout</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="marketing" className="space-y-6">
<MarketingTools selectedEvent={selectedEvent ? { id: selectedEvent.id, name: selectedEvent.name, status: selectedEvent.status, event_date: selectedEvent.date, description: (selectedEvent.description ?? undefined) } : undefined} />
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
      </div>
    </SidebarProvider>
  );
};

export default OrgDashboard;
