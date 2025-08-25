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
import { Calendar, Users, Ticket, BarChart3, Monitor, LogOut, Menu, HelpCircle } from "lucide-react";
import OrganizationSettings from "@/components/OrganizationSettings";
import OrganizationOnboarding from "@/components/OrganizationOnboarding";

import { SecurityDashboard } from "@/components/SecurityDashboard";
import { MarketingTools } from "@/components/MarketingTools";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import Support from "@/pages/Support";
import { DashboardHelp } from "@/components/DashboardHelp";
import { OrganizationUserManagement } from "@/components/OrganizationUserManagement";
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

type EventTypeDatum = { name: string; value: number; color: string }; // Total revenue by event
type RevenuePoint = { day: string; revenue: number }; // Weekly revenue by event

type AnalyticsState = {
  totalTickets: number;
  salesData: { month: string; sales: number; tickets: number }[];
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
      size="default"
      onClick={toggleSidebar}
      className="h-9 w-9 p-0 font-manrope font-medium"
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
  const [organization, setOrganization] = useState<Organization | null>(null);
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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

  // Listen for help requests from child components
  React.useEffect(() => {
    const handleHelpRequest = (event: CustomEvent) => {
      if (event.detail?.tab) {
        setActiveTab(event.detail.tab);
        setShowHelp(true);
      }
    };

    window.addEventListener('openDashboardHelp', handleHelpRequest as EventListener);

    return () => {
      window.removeEventListener('openDashboardHelp', handleHelpRequest as EventListener);
    };
  }, []);

  // Debug layout issues
  React.useEffect(() => {
    console.log('=== Dashboard Layout Debug ===');
    console.log('Screen width:', window.innerWidth);
    console.log('Document width:', document.documentElement.clientWidth);
    console.log('Body width:', document.body.clientWidth);
    
    // Check for any elements that might be causing the right-side space
    const mainElement = document.querySelector('main');
    if (mainElement) {
      console.log('Main element width:', mainElement.clientWidth);
      console.log('Main element offsetWidth:', mainElement.offsetWidth);
      console.log('Main element getBoundingClientRect:', mainElement.getBoundingClientRect());
    }
  }, []);

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
        setOrganization(org);
        
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
        events(name),
        order_items(
          quantity,
          ticket_types(name)
        )
      `)
      .in("event_id", eventIds)
      .in("status", ["paid", "completed"]);
    
    console.log("Orders found:", orderData?.length || 0);
    console.log("Sample order data:", orderData?.[0]);
    
    // Get ticket data - tickets are related to orders, orders are related to events
    const { data: ticketData } = await supabase
      .from("tickets")
      .select(`
        id, 
        status,
        order_items!inner(
          orders!inner(
            events!inner(organization_id, name)
          )
        )
      `)
      .eq("order_items.orders.events.organization_id", orgId);
    
    console.log("Tickets found:", ticketData?.length || 0);
    
    // Process the data for analytics
    const totalTickets = ticketData?.length || 0;
    
    // 1. Weekly Revenue by Event (last 7 days)
    const weeklyRevenueByEvent = new Map<string, number>();
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    if (orderData) {
      orderData.forEach(order => {
        const orderDate = new Date(order.created_at);
        if (orderDate >= last7Days) {
          const eventName = order.events?.name || 'Unknown Event';
          const currentRevenue = weeklyRevenueByEvent.get(eventName) || 0;
          weeklyRevenueByEvent.set(eventName, currentRevenue + (Number(order.total_amount) || 0));
        }
      });
    }
    
    // Convert weekly revenue to array format and sort by revenue
    const weeklyRevenueData = Array.from(weeklyRevenueByEvent.entries())
      .map(([eventName, revenue]) => ({
        day: eventName,
        revenue
      }))
      .sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending
    
    // 2. Monthly Revenue by Event (last 30 days)
    const monthlyRevenueByEvent = new Map<string, number>();
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    if (orderData) {
      orderData.forEach(order => {
        const orderDate = new Date(order.created_at);
        if (orderDate >= last30Days) {
          const eventName = order.events?.name || 'Unknown Event';
          const currentRevenue = monthlyRevenueByEvent.get(eventName) || 0;
          monthlyRevenueByEvent.set(eventName, currentRevenue + (Number(order.total_amount) || 0));
        }
      });
    }
    
    // Convert monthly revenue to array format and sort by revenue
    const monthlyRevenueData = Array.from(monthlyRevenueByEvent.entries())
      .map(([eventName, revenue]) => ({
        month: eventName,
        sales: revenue,
        tickets: 0 // placeholder for tickets count
      }))
      .sort((a, b) => b.sales - a.sales); // Sort by revenue descending
    
    // 3. Total Revenue by Event (all time)
    const totalRevenueByEvent = new Map<string, number>();
    
    if (orderData) {
      orderData.forEach(order => {
        const eventName = order.events?.name || 'Unknown Event';
        const currentRevenue = totalRevenueByEvent.get(eventName) || 0;
        totalRevenueByEvent.set(eventName, currentRevenue + (Number(order.total_amount) || 0));
      });
    }
    
    // Convert total revenue to array format for pie chart
    const colors = [
      '#ff4d00', // Primary Orange
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Yellow
      '#8b5cf6', // Purple
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#84cc16', // Lime
      '#ec4899', // Pink
      '#f97316'  // Orange
    ];
    
    const eventTypesData: EventTypeDatum[] = Array.from(totalRevenueByEvent.entries())
      .map(([eventName, revenue], index) => ({
        name: eventName,
        value: revenue,
        color: colors[index % colors.length] // Use consistent colors
      }))
      .sort((a, b) => b.value - a.value); // Sort by revenue descending
    
    console.log("Final analytics data:", {
      totalTickets,
      weeklyRevenueData: weeklyRevenueData.length,
      monthlyRevenueData: monthlyRevenueData.length,
      eventTypesData: eventTypesData.length
    });
    
    setAnalyticsData({
      totalTickets,
      salesData: monthlyRevenueData, // Use monthly revenue data for performance trend
      eventTypesData,
      revenueData: weeklyRevenueData // Use weekly revenue data for weekly revenue chart
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
      <div className="h-screen bg-background flex flex-col w-full" style={{ width: '100%', maxWidth: 'none' }}>
        {/* Header with minimal controls */}
        <header className="border-b border-gray-200/60 bg-white flex-shrink-0 w-full" style={{ width: '100%', maxWidth: 'none' }}>
          <div className="px-4 py-3 w-full" style={{ width: '100%', maxWidth: 'none' }}>
            <div className="flex items-center justify-between gap-4 w-full" style={{ width: '100%' }}>
              {/* Mobile sidebar trigger - only shows on mobile */}
              <div className="flex items-center gap-2 md:hidden">
                <MobileSidebarTrigger />
              </div>
              
              {/* Dashboard Title */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200/60">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="font-manrope font-semibold text-base text-gray-900">
                    Dashboard
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-auto" style={{ marginLeft: 'auto', width: 'auto' }}>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowHelp(true)}
                  className="font-manrope font-medium text-sm"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="font-manrope font-medium text-sm"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Sidebar and content below header - takes remaining space */}
        <div className="flex flex-1 min-h-0 w-full" style={{ maxWidth: 'none', width: '100%', minWidth: '100%' }}>
          <div className="flex-shrink-0">
            <AppSidebar 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              selectedEvent={selectedEvent ? { id: selectedEvent.id, name: selectedEvent.name, event_date: selectedEvent.event_date, status: selectedEvent.status } : null} 
            />
          </div>
          
          <main className="flex-1 min-w-0 flex-shrink-0 p-4 md:p-6 overflow-y-auto overflow-x-hidden bg-white">
            <div className="w-full" style={{ maxWidth: 'none', margin: '0', padding: '0', width: '100%', minWidth: '100%' }}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-8" style={{ width: '100%', maxWidth: 'none', minWidth: '100%' }}>
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 w-full">
                    <Card className="gradient-card hover-scale animate-in fade-in-0 border-gray-200/60 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="font-manrope font-semibold text-base text-gray-900">Total Events</CardTitle>
                        <Calendar className="h-5 w-5 text-gray-900" />
                      </CardHeader>
                      <CardContent>
                        <div className="font-manrope font-bold text-3xl text-gray-900 mb-2">{events.length}</div>
                        <p className="font-manrope text-sm text-gray-600">Active events</p>
                      </CardContent>
                    </Card>

                    <Card className="gradient-card hover-scale animate-in fade-in-0 border-gray-200/60 shadow-sm" style={{ animationDelay: '100ms' }}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="font-manrope font-semibold text-base text-gray-900">Tickets Sold</CardTitle>
                        <Ticket className="h-5 w-5 text-gray-900" />
                      </CardHeader>
                      <CardContent>
                        <div className="font-manrope font-bold text-3xl text-gray-900 mb-2">{analytics.totalOrders}</div>
                        <p className="font-manrope text-sm text-gray-600">Total orders placed</p>
                      </CardContent>
                    </Card>

                    <Card className="gradient-card hover-scale animate-in fade-in-0 border-gray-200/60 shadow-sm" style={{ animationDelay: '200ms' }}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="font-manrope font-semibold text-base text-gray-900">Revenue</CardTitle>
                        <BarChart3 className="h-5 w-5 text-gray-900" />
                      </CardHeader>
                      <CardContent>
                        <div className="font-manrope font-bold text-3xl text-gray-900 mb-2">${analytics.totalRevenue.toFixed(2)}</div>
                        <p className="font-manrope text-sm text-gray-600">Total revenue generated</p>
                      </CardContent>
                    </Card>

                    <Card className="gradient-card hover-scale animate-in fade-in-0 border-gray-200/60 shadow-sm" style={{ animationDelay: '300ms' }}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="font-manrope font-semibold text-base text-gray-900">Platform Fees</CardTitle>
                        <Users className="h-5 w-5 text-gray-900" />
                      </CardHeader>
                      <CardContent>
                        <div className="font-manrope font-bold text-3xl text-gray-900 mb-2">${analytics.estimatedPlatformFees.toFixed(2)}</div>
                        <p className="font-manrope text-sm text-gray-600">Estimated fees</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Add Analytics Charts */}
                  <AnalyticsCharts 
                    salesData={analyticsData.salesData.map(item => ({ month: item.month, revenue: item.sales }))}
                    eventTypeData={analyticsData.eventTypesData}
                    revenueData={analyticsData.revenueData}
                    isLoading={false}
                  />

                  <Card className="border-gray-200/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-manrope font-semibold text-lg text-gray-900">Recent Events</CardTitle>
                      <CardDescription className="font-manrope text-sm text-gray-600">Your latest event performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {events.map((event) => (
                          <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-gray-200/60 rounded-lg hover:bg-gray-50/50 transition-colors gap-3">
                            <div className="space-y-1 flex-1">
                              <h3 className="font-manrope font-medium text-sm text-gray-900">{event.name}</h3>
                              <p className="font-manrope text-xs text-gray-600">{new Date(event.event_date).toLocaleDateString()} • {event.venue}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                              <div className="text-left sm:text-right">
                                <p className="font-manrope font-medium text-xs text-gray-900">{event.tickets_sold}/{event.capacity} tickets</p>
                                <p className="font-manrope text-xs text-gray-600">${event.revenue}</p>
                              </div>
                              <Badge variant={event.status === "published" ? "default" : "secondary"} className="w-fit font-manrope font-medium text-xs">
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
                                  className="flex-1 sm:flex-none hover-scale font-manrope font-medium text-xs"
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">Manage</span>
                                  <span className="sm:hidden">Manage</span>
                                </Button>
                                {event.status === 'published' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`/ticketflolive/${event.id}`, '_blank')}
                                    className="flex-1 sm:flex-none hover-scale font-manrope font-medium text-xs"
                                  >
                                    <Monitor className="h-3 w-3 mr-1" />
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
                  <Card className="border-gray-200/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-manrope font-semibold text-lg text-gray-900">Your Events</CardTitle>
                      <CardDescription className="font-manrope text-sm text-gray-600">Manage your existing events</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {events.length === 0 ? (
                        <p className="font-manrope text-muted-foreground text-center py-8">No events created yet. Create your first event below!</p>
                      ) : (
                        <div className="space-y-3 w-full">
                          {events.map((event) => (
                            <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200/60 rounded-lg hover:bg-gray-50/50 transition-colors gap-4 w-full" style={{ width: '100%' }}>
                              <div className="space-y-2 flex-1">
                                <h3 className="font-manrope font-semibold text-base text-gray-900">{event.name}</h3>
                                <p className="font-manrope text-sm text-gray-600">{new Date(event.event_date).toLocaleDateString()} • {event.venue}</p>
                                <Badge 
                                  variant={event.status === "published" ? "default" : "secondary"} 
                                  className="w-fit font-manrope font-medium text-sm"
                                >
                                  {event.status}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="default"
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setActiveTab("event-details");
                                  }}
                                  className="font-manrope font-medium text-sm"
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Manage
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-manrope font-semibold text-lg text-gray-900">Create New Event</CardTitle>
                      <CardDescription className="font-manrope text-sm text-gray-600">Start selling tickets for your next event</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                        <div className="space-y-2">
                          <Label htmlFor="event-name" className="font-manrope font-medium text-sm text-gray-700">Event Name *</Label>
                          <Input
                            id="event-name"
                            value={eventForm.name}
                            onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter event name"
                            className="font-manrope text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event-date" className="font-manrope font-medium text-sm text-gray-700">Event Date *</Label>
                          <Input
                            id="event-date"
                            type="datetime-local"
                            value={eventForm.date}
                            onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                            className="font-manrope text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event-venue" className="font-manrope font-medium text-sm text-gray-700">Venue *</Label>
                          <Input
                            id="event-venue"
                            value={eventForm.venue}
                            onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                            placeholder="Enter venue name"
                            className="font-manrope text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event-capacity" className="font-manrope font-medium text-sm text-gray-700">Capacity *</Label>
                          <Input
                            id="event-capacity"
                            type="number"
                            value={eventForm.capacity}
                            onChange={(e) => setEventForm(prev => ({ ...prev, capacity: e.target.value }))}
                            placeholder="Maximum attendees"
                            className="font-manrope text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-description" className="font-manrope font-medium text-sm text-gray-700">Description</Label>
                        <Textarea
                          id="event-description"
                          value={eventForm.description}
                          onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Event description"
                          rows={4}
                          className="font-manrope text-sm"
                        />
                      </div>
                      <Button 
                        onClick={handleCreateEvent} 
                        disabled={isCreatingEvent}
                        className="w-full md:w-auto font-manrope font-medium text-sm"
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

                <TabsContent value="users" className="space-y-6">
                  <OrganizationUserManagement 
                    organizationId={organizationId} 
                    organizationName={organization?.name || 'Organization'} 
                  />
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

      {/* Help Modal */}
      <DashboardHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </SidebarProvider>
  );
};

export default OrgDashboard;