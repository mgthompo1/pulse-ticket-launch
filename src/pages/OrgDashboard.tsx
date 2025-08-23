import React, { useState, useCallback } from "react";
import XeroIntegration from "@/components/XeroIntegration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { EventAnalytics } from "@/components/EventAnalytics";
import AIChatbot from "@/components/AIChatbot";
import BillingDashboard from "@/components/BillingDashboard";
import { SeatMapDesigner } from "@/components/SeatMapDesigner";
import EventCustomization from "@/components/EventCustomization";
import { PaymentConfiguration } from "@/components/PaymentConfiguration";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Calendar, Users, Ticket, BarChart3, Edit, Monitor, LogOut, Menu } from "lucide-react";
import OrganizationSettings from "@/components/OrganizationSettings";
import OrganizationOnboarding from "@/components/OrganizationOnboarding";

import { SecurityDashboard } from "@/components/SecurityDashboard";
import { MarketingTools } from "@/components/MarketingTools";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import Support from "@/pages/Support";
import { useNavigate } from "react-router-dom";

// Types
type DashboardEvent = {
  id: string;
  name: string;
  status: string;
  venue: string | null;
  capacity: number;
  tickets_sold: number;
  revenue: number;
  created_at: string;
  event_date: string;
};

type SalesPoint = { month: string; sales: number; tickets: number };
type EventTypeDatum = { name: string; value: number; color: string };
type RevenuePoint = { day: string; revenue: number };

type AnalyticsState = {
  totalTickets: number;
  salesData: SalesPoint[];
  eventTypesData: EventTypeDatum[];
  revenueData: RevenuePoint[];
};

interface Organization {
  id: string;
  name: string;
  user_id: string;
}

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
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DashboardEvent | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [organizationId, setOrganizationId] = useState<string>("");
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    totalOrders: 0,
    totalRevenue: 0,
    estimatedPlatformFees: 0
  });

  // Analytics data for charts
  const [analyticsData, setAnalyticsData] = useState<AnalyticsState>({
    totalTickets: 0,
    salesData: [],
    eventTypesData: [],
    revenueData: []
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
        // Get organization data
        const org = orgs as Organization;
        
        setOrganizationId(org.id);
        
        loadEvents(org.id);
        loadAnalytics(org.id);
        loadAnalyticsData(org.id);
      }
    };

    loadOrganization();
  }, [user]);

  const loadEvents = useCallback(async (orgId: string) => {
    console.log("Loading events for org:", orgId);

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading events:", error);
        throw error;
      }

      console.log("Loaded events:", data);
      
      const mappedEvents: DashboardEvent[] = data.map((event) => ({
        id: event.id,
        name: event.name,
        status: event.status,
        venue: event.venue,
        capacity: event.capacity,
        tickets_sold: 0, // Will be calculated from orders
        revenue: 0, // Will be calculated from orders
        created_at: event.created_at,
        event_date: event.event_date
      }));

      setEvents(mappedEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  }, []);

  const loadAnalytics = useCallback(async (orgId: string) => {
    console.log("Loading analytics for org:", orgId);

    try {
      // Get all orders for this organization
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, status, events(organization_id)")
        .eq("events.organization_id", orgId)
        .in("status", ["paid", "completed"]);

      if (ordersError) throw ordersError;

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;
      const estimatedPlatformFees = totalRevenue * 0.05; // 5% platform fee

      // Get events count
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id")
        .eq("organization_id", orgId);

      if (eventsError) throw eventsError;

      setAnalytics({
        totalEvents: events?.length || 0,
        totalOrders,
        totalRevenue,
        estimatedPlatformFees
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  }, []);

  const loadAnalyticsData = useCallback(async (orgId: string) => {
    console.log("Loading analytics data for org:", orgId);
    
    // First, get all events for this organization
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, name, created_at, status")
      .eq("organization_id", orgId);
    
    if (eventError) {
      console.error("Error fetching events:", eventError);
      return;
    }
    
    console.log("Events found:", eventData?.length || 0);
    
    if (!eventData || eventData.length === 0) {
      console.log("No events found for organization");
      setAnalyticsData({
        totalTickets: 0,
        salesData: [],
        eventTypesData: [],
        revenueData: []
      });
      return;
    }
    
    // Get all orders for these events
    const eventIds = eventData.map(event => event.id);
    console.log("Event IDs to search:", eventIds);
    
    const { data: orderData } = await supabase
      .from("orders")
      .select(`
        id, 
        total_amount, 
        created_at, 
        event_id,
        status,
        order_items(
          quantity,
          ticket_types(name)
        )
      `)
      .in("event_id", eventIds);
    
    console.log("Orders found:", orderData?.length || 0);
    console.log("Sample order data:", orderData?.[0]);
    
    // Get ticket data
    const { data: ticketData } = await supabase
      .from("tickets")
      .select(`
        id, 
        status,
        events(organization_id, name)
      `)
      .eq("events.organization_id", orgId);
    
    console.log("Tickets found:", ticketData?.length || 0);
    
    // Process the data for analytics
    const totalTickets = ticketData?.length || 0;
    
    // Process sales data by month (last 6 months)
    const salesByMonth = new Map<string, number>();
    const revenueByMonth = new Map<string, number>();
    
    if (orderData) {
      orderData.forEach(order => {
        if (order.status === 'completed' || order.status === 'paid') {
          const date = new Date(order.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          // Sum up quantities from order items
          const totalQuantity = order.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          
          salesByMonth.set(monthKey, (salesByMonth.get(monthKey) || 0) + totalQuantity);
          revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + (Number(order.total_amount) || 0));
        }
      });
    }
    
    // Convert to array format for charts
    const salesData: SalesPoint[] = Array.from(salesByMonth.entries()).map(([month, tickets]) => ({
      month,
      sales: tickets,
      tickets
    }));
    
    const revenueData: RevenuePoint[] = Array.from(revenueByMonth.entries()).map(([month, revenue]) => ({
      day: month,
      revenue
    }));
    
    // Process event types data
    const eventTypeCount = new Map<string, number>();
    if (eventData) {
      eventData.forEach(event => {
        const status = event.status || 'draft';
        eventTypeCount.set(status, (eventTypeCount.get(status) || 0) + 1);
      });
    }
    
    const eventTypesData: EventTypeDatum[] = Array.from(eventTypeCount.entries()).map(([name, value]) => ({
      name,
      value,
      color: name === 'published' ? '#22c55e' : '#6b7280'
    }));
    
    console.log("Final analytics data:", {
      totalTickets,
      salesData: salesData.length,
      eventTypesData: eventTypesData.length,
      revenueData: revenueData.length
    });
    
    setAnalyticsData({
      totalTickets,
      salesData,
      eventTypesData,
      revenueData
    });
  }, []);

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
          status: 'draft'
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
            selectedEvent={selectedEvent ? { id: selectedEvent.id, name: selectedEvent.name, event_date: selectedEvent.event_date, status: selectedEvent.status } : null} 
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
                        <div className="text-2xl font-bold">{analytics.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">Total orders placed</p>
                      </CardContent>
                    </Card>

                    <Card className="gradient-card hover-scale animate-in fade-in-0" style={{ animationDelay: '200ms' }}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Total revenue generated</p>
                      </CardContent>
                    </Card>

                    <Card className="gradient-card hover-scale animate-in fade-in-0" style={{ animationDelay: '300ms' }}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">${analytics.estimatedPlatformFees.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Estimated fees</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Add Analytics Charts */}
                  <AnalyticsCharts 
                    salesData={analyticsData.salesData}
                    eventTypeData={analyticsData.eventTypesData}
                    revenueData={analyticsData.revenueData}
                    isLoading={false}
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
                              <p className="text-sm text-muted-foreground">{new Date(event.event_date).toLocaleDateString()} • {event.venue}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                              <div className="text-left sm:text-right">
                                <p className="text-sm font-medium">{event.tickets_sold}/{event.capacity} tickets</p>
                                <p className="text-sm text-muted-foreground">${event.revenue}</p>
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
                                {event.status === 'published' && (
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
                                )}
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
                                <p className="text-sm text-muted-foreground">{new Date(event.event_date).toLocaleDateString()} • {event.venue}</p>
                                <Badge variant={event.status === "published" ? "default" : "secondary"} className="w-fit">
                                  {event.status}
                                </Badge>
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
                  <EventAnalytics events={events} />
                </TabsContent>

                <TabsContent value="payments" className="space-y-6">
                  <PaymentConfiguration organizationId={organizationId} />
                </TabsContent>

                <TabsContent value="marketing" className="space-y-6">
                  <MarketingTools selectedEvent={selectedEvent ? { id: selectedEvent.id, name: selectedEvent.name, status: selectedEvent.status, event_date: selectedEvent.event_date, description: undefined } : undefined} />
                </TabsContent>

                <TabsContent value="billing" className="space-y-6">
                  <BillingDashboard organizationId={organizationId} isLoading={false} />
                </TabsContent>

                <TabsContent value="support" className="space-y-6">
                  <Support />
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