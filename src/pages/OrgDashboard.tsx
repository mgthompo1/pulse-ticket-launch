import React, { useState, useCallback, useRef } from "react";
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
import { Calendar, Users, Ticket, BarChart3, Monitor, LogOut, Menu, HelpCircle, DollarSign, ExternalLink, Clock, CheckCircle } from "lucide-react";
import OrganizationSettings from "@/components/OrganizationSettings";
import OrganizationOnboarding from "@/components/OrganizationOnboarding";

import { SecurityDashboard } from "@/components/SecurityDashboard";
import { MarketingTools } from "@/components/MarketingTools";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { AttractionAnalytics } from "@/components/AttractionAnalytics";
import Support from "@/pages/Support";
import { DashboardHelp } from "@/components/DashboardHelp";
import { OrganizationUserManagement } from "@/components/OrganizationUserManagement";
import AttractionManagement from "@/components/AttractionManagement";
import AttractionCustomization from "@/components/AttractionCustomization";
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
  system_type?: string;
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
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DashboardEvent | null>(null);
  const [selectedAttraction, setSelectedAttraction] = useState<any>(null);
  const [attractions, setAttractions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'editor' | 'viewer' | null>(null);
  
  // Simple loading guard to prevent duplicate organization loads
  const organizationLoaded = useRef(false);
  
  // Permission checking functions
  const canAccessAnalytics = () => userRole === 'owner' || userRole === 'admin' || userRole === 'editor';
  const canAccessBilling = () => userRole === 'owner' || userRole === 'admin';
  const canAccessUsers = () => userRole === 'owner' || userRole === 'admin';
  const canAccessSecurity = () => userRole === 'owner' || userRole === 'admin';
  const canAccessSettings = () => userRole === 'owner' || userRole === 'admin';
  const canAccessIntegrations = () => userRole === 'owner' || userRole === 'admin';
  
  // System type checking
  const isEventsMode = () => !organization?.system_type || organization?.system_type === 'EVENTS';
  


  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
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
  
  // Order data for custom answers
  const [, setOrderData] = useState<any[]>([]);

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
      
      // Prevent duplicate loads
      if (organizationLoaded.current) {
        console.log("Organization loading already initiated, skipping");
        return;
      }
      
      organizationLoaded.current = true;
      console.log("Loading organization for user:", user.id);

      // First, try to find an organization where the user is the owner
      let { data: orgs, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("user_id", user.id)
        .single();

      let userRole: 'owner' | 'admin' | 'editor' | 'viewer' = 'owner';
      
      // If user owns the organization, set the role in state
      if (!error && orgs) {
        setUserRole('owner');
      }

      // If no owned organization found, check if user is a member of any organization
      if (error && error.code === 'PGRST116') {
        console.log("No owned organization found, checking memberships...");
        
        const { data: membershipData, error: membershipError } = await supabase
          .from("organization_users")
          .select(`
            organization_id,
            role,
            organizations (*)
          `)
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          console.error("Error loading organization membership:", membershipError);
          
          // If no organization membership exists either, show onboarding
          if (membershipError.code === 'PGRST116') {
            setShowOnboarding(true);
          }
          return;
        }

        if (membershipData && (membershipData as any).organizations) {
          console.log("Organization membership found:", membershipData);
          orgs = (membershipData as any).organizations as any;
          // Store the user's role
          userRole = (membershipData as any).role;
          setUserRole((membershipData as any).role);
          console.log("User role set to:", (membershipData as any).role);
          error = null;
        }
      }

      if (error) {
        console.error("Error loading organization:", error);
        setShowOnboarding(true);
        return;
      }

      if (orgs) {
        console.log("=== ORGANIZATION LOADED DEBUG ===");
        console.log("Organization data:", orgs);
        console.log("Organization ID:", orgs.id);
        console.log("Organization name:", orgs.name);
        
        // Get organization data
        const org = orgs as Organization;
        
        setOrganizationId(org.id);
        setOrganization(org);
        
        // Load data based on system type
        if (isEventsMode()) {
          loadEvents(org.id);
        } else {
          loadAttractions(org.id);
        }
        
        // Load analytics based on role
        console.log("🔐 User role:", userRole);
        console.log("🔐 Can access analytics:", userRole === 'owner' || userRole === 'admin' || userRole === 'editor');
        console.log("🔐 Can access billing:", userRole === 'owner' || userRole === 'admin');
        console.log("🔐 Can access users:", userRole === 'owner' || userRole === 'admin');
        console.log("🔐 Can edit events:", userRole === 'owner' || userRole === 'admin' || userRole === 'editor');
        
        if (userRole === 'owner' || userRole === 'admin' || userRole === 'editor') {
          if (isEventsMode()) {
            loadAnalytics(org.id);
            loadAnalyticsData(org.id);
          } else {
            loadAttractionAnalytics(org.id);
            loadAttractionAnalyticsData(org.id);
          }
        }
      }
    };

    loadOrganization();
  }, [user]);

  const loadAttractions = useCallback(async (orgId: string) => {
    console.log("Loading attractions for org:", orgId);

    try {
      const { data, error } = await supabase
        .from("attractions")
        .select(`
          *,
          attraction_bookings (
            id,
            total_amount,
            booking_status
          )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading attractions:", error);
        throw error;
      }

      console.log("Loaded attractions:", data);
      
      // Calculate stats for each attraction
      const attractionsWithStats = data?.map(attraction => ({
        ...attraction,
        bookings_count: attraction.attraction_bookings?.length || 0,
        revenue: attraction.attraction_bookings?.reduce((sum: number, booking: any) => 
          booking.booking_status === 'confirmed' ? sum + parseFloat(booking.total_amount) : sum, 0
        ) || 0
      })) || [];

      setAttractions(attractionsWithStats);
    } catch (error) {
      console.error("Error loading attractions:", error);
    }
  }, []);

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

  const loadAttractionAnalytics = useCallback(async (orgId: string, attractionId?: string) => {
    console.log("Loading attraction analytics for org:", orgId, "attraction:", attractionId);

    try {
      let query = supabase
        .from("attraction_bookings")
        .select(`
          total_amount, 
          booking_status, 
          created_at,
          attractions!inner(organization_id, name, id)
        `)
        .eq("attractions.organization_id", orgId)
        .in("booking_status", ["confirmed", "completed"]);

      if (attractionId) {
        query = query.eq("attractions.id", attractionId);
      }

      const { data: bookings, error: bookingsError } = await query;

      console.log("=== LOAD ATTRACTION ANALYTICS QUERY DEBUG ===");
      console.log("Query for organization_id:", orgId);
      console.log("Attraction ID filter:", attractionId);
      console.log("Bookings found:", bookings?.length || 0);
      console.log("First 3 bookings:", bookings?.slice(0, 3));
      console.log("Query error:", bookingsError);

      if (bookingsError) throw bookingsError;

      const totalBookings = bookings?.length || 0;
      const totalRevenue = bookings?.reduce((sum, booking) => sum + (Number(booking.total_amount) || 0), 0) || 0;
      const estimatedPlatformFees = totalRevenue * 0.05; // 5% platform fee

      // Get attractions count
      const { data: attractions, error: attractionsError } = await supabase
        .from("attractions")
        .select("id")
        .eq("organization_id", orgId);

      if (attractionsError) throw attractionsError;

      console.log("=== ATTRACTION ANALYTICS CALCULATION DEBUG ===");
      console.log("Organization ID used for analytics:", orgId);
      console.log("Total bookings found:", totalBookings);
      console.log("Total revenue calculated:", totalRevenue);
      console.log("Bookings data:", bookings);

      setAnalytics({
        totalEvents: attractions?.length || 0,
        totalOrders: totalBookings,
        totalRevenue,
        estimatedPlatformFees
      });
    } catch (error) {
      console.error("Error loading attraction analytics:", error);
    }
  }, []);

  const loadAnalytics = useCallback(async (orgId: string) => {
    console.log("Loading analytics for org:", orgId);

    try {
      // Get all orders for this organization
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          total_amount, 
          status, 
          events!inner(organization_id, name)
        `)
        .eq("events.organization_id", orgId)
        .in("status", ["paid", "completed"]);

      console.log("=== LOAD ANALYTICS QUERY DEBUG ===");
      console.log("Query for organization_id:", orgId);
      console.log("Orders found by loadAnalytics:", orders?.length || 0);
      console.log("First 3 orders:", orders?.slice(0, 3));
      console.log("Query error:", ordersError);

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

      console.log("=== ANALYTICS CALCULATION DEBUG ===");
      console.log("Organization ID used for analytics:", orgId);
      console.log("Total orders found:", totalOrders);
      console.log("Total revenue calculated:", totalRevenue);
      console.log("Orders data:", orders);

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

  const loadAttractionAnalyticsData = useCallback(async (orgId: string, attractionId?: string) => {
    console.log("Loading attraction analytics data for org:", orgId, "attraction:", attractionId);
    
    // First, get all attractions for this organization
    let attractionQuery = supabase
      .from("attractions")
      .select("id, name, created_at, status")
      .eq("organization_id", orgId);
    
    if (attractionId) {
      attractionQuery = attractionQuery.eq("id", attractionId);
    }
    
    const { data: attractionData, error: attractionError } = await attractionQuery;
    
    if (attractionError) {
      console.error("Error fetching attractions:", attractionError);
      return;
    }
    
    console.log("Attractions found:", attractionData?.length || 0);
    
    if (!attractionData || attractionData.length === 0) {
      console.log("No attractions found for organization");
      setAnalyticsData({
        totalTickets: 0,
        salesData: [],
        eventTypesData: [],
        revenueData: []
      });
      return;
    }
    
    // Get all bookings for these attractions
    const attractionIds = attractionData.map(attraction => attraction.id);
    console.log("Attraction IDs to search:", attractionIds);
    
    const { data: bookingData } = await supabase
      .from("attraction_bookings")
      .select(`
        id, 
        total_amount, 
        created_at, 
        attraction_id,
        booking_status,
        attractions(name)
      `)
      .in("attraction_id", attractionIds)
      .in("booking_status", ["confirmed", "completed"]);

    console.log("Bookings found:", bookingData?.length || 0);

    if (!bookingData || bookingData.length === 0) {
      setAnalyticsData({
        totalTickets: 0,
        salesData: [],
        eventTypesData: [],
        revenueData: []
      });
      return;
    }

    // Process booking data for charts
    const totalTickets = bookingData.length;
    
    // Monthly sales data (last 6 months)
    const monthlySales = new Map();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    bookingData.forEach(booking => {
      const bookingDate = new Date(booking.created_at);
      if (bookingDate >= sixMonthsAgo) {
        const monthKey = bookingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        const current = monthlySales.get(monthKey) || { month: monthKey, sales: 0, tickets: 0 };
        current.sales += Number(booking.total_amount) || 0;
        current.tickets += 1;
        monthlySales.set(monthKey, current);
      }
    });

    // Revenue by attraction
    const attractionRevenue = new Map();
    bookingData.forEach(booking => {
      const attractionName = booking.attractions?.name || 'Unknown';
      const current = attractionRevenue.get(attractionName) || 0;
      attractionRevenue.set(attractionName, current + (Number(booking.total_amount) || 0));
    });

    // Weekly revenue data (last 4 weeks)
    const weeklyRevenue = new Map();
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    bookingData.forEach(booking => {
      const bookingDate = new Date(booking.created_at);
      if (bookingDate >= fourWeeksAgo) {
        const weekKey = `Week ${Math.ceil((new Date().getTime() - bookingDate.getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
        const current = weeklyRevenue.get(weekKey) || 0;
        weeklyRevenue.set(weekKey, current + (Number(booking.total_amount) || 0));
      }
    });

    setAnalyticsData({
      totalTickets,
      salesData: Array.from(monthlySales.values()),
      eventTypesData: Array.from(attractionRevenue.entries()).map(([name, value]) => ({
        name,
        value: Number(value),
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      })),
      revenueData: Array.from(weeklyRevenue.entries()).map(([day, revenue]) => ({
        day,
        revenue: Number(revenue)
      }))
    });
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
        custom_answers,
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
    
    // Set order data for custom answers display
    setOrderData(orderData || []);
    
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
    
    console.log("Setting analytics data with:", {
      totalTickets,
      salesData: monthlyRevenueData,
      eventTypesData,
      revenueData: weeklyRevenueData
    });
    
    setAnalyticsData({
      totalTickets,
      salesData: monthlyRevenueData, // Use monthly revenue data for performance trend
      eventTypesData,
      revenueData: weeklyRevenueData // Use weekly revenue data for weekly revenue chart
    });
    
    console.log("Analytics data set successfully");
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
      <div className="h-screen bg-background flex w-full" style={{ width: '100%', maxWidth: 'none' }}>
        {/* Sidebar */}
        <div className="flex-shrink-0">
          <AppSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedEvent={selectedEvent ? { id: selectedEvent.id, name: selectedEvent.name, event_date: selectedEvent.event_date, status: selectedEvent.status } : null}
          />
        </div>

        {/* Main content area with header and content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with minimal controls */}
          <header className="border-b border-gray-200/60 bg-white flex-shrink-0 h-[52px]" style={{ width: '100%', maxWidth: 'none' }}>
            <div className="px-4 h-full w-full flex items-center" style={{ width: '100%', maxWidth: 'none' }}>
              <div className="flex items-center justify-between gap-4 w-full" style={{ width: '100%' }}>
                {/* Mobile sidebar trigger - only shows on mobile */}
                <div className="flex items-center gap-2 md:hidden">
                  <MobileSidebarTrigger />
                </div>

                {/* Spacer for mobile, empty on desktop */}
                <div className="flex-1 md:flex-none"></div>

                <div className="flex items-center gap-2" style={{ marginLeft: 'auto', width: 'auto' }}>
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
          
          <main className="flex-1 min-w-0 flex-shrink-0 p-4 md:p-6 overflow-y-auto overflow-x-hidden bg-white">
            <div className="w-full" style={{ maxWidth: 'none', margin: '0', padding: '0', width: '100%', minWidth: '100%' }}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-8" style={{ width: '100%', maxWidth: 'none', minWidth: '100%' }}>
                <TabsContent value="overview" className="space-y-6">
                  {isEventsMode() ? (
                    // Events mode content
                    <div className="space-y-6">
                      {/* Overview content for events */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Dashboard Overview
                          </CardTitle>
                          <CardDescription>
                            Welcome to your events dashboard. Create and manage your events below.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
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

                            {canAccessAnalytics() && (
                              <>
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
                                    <DollarSign className="h-5 w-5 text-gray-900" />
                                  </CardHeader>
                                  <CardContent>
                                    <div className="font-manrope font-bold text-3xl text-gray-900 mb-2">${analytics.totalRevenue.toFixed(2)}</div>
                                    <p className="font-manrope text-sm text-gray-600">Total revenue</p>
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
                              </>
                            )}
                          </div>


                        </CardContent>
                      </Card>

                      {/* Analytics Charts */}
                      {canAccessAnalytics() && (
                        <AnalyticsCharts
                          salesData={analyticsData.salesData.map(item => ({ month: item.month, revenue: item.sales }))}
                          eventTypeData={analyticsData.eventTypesData}
                          revenueData={analyticsData.revenueData}
                          isLoading={false}
                        />
                      )}
                    </div>
                  ) : (
                    // Attractions mode content
                    <div className="space-y-6">
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

                    {canAccessAnalytics() && (
                      <>
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
                      </>
                    )}
                  </div>
                  {/* Charts temporarily disabled to resolve JSX structure issue */}



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
                    </div>
                  )}
                </TabsContent>

                {isEventsMode() ? (
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
                                  <Button
                                    variant="outline"
                                    size="default"
                                    onClick={() => window.open(`/widget/${event.id}`, '_blank')}
                                    className="font-manrope font-medium text-sm"
                                  >
                                    <Monitor className="h-4 w-4 mr-2" />
                                    Widget
                                  </Button>
                                  {event.status === 'published' && (
                                    <Button
                                      variant="outline"
                                      size="default"
                                      onClick={() => window.open(`/ticketflolive/${event.id}`, '_blank')}
                                      className="font-manrope font-medium text-sm"
                                    >
                                      <Monitor className="h-4 w-4 mr-2" />
                                      TicketFloLIVE
                                    </Button>
                                  )}
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
                ) : (
                  <TabsContent value="events" className="space-y-6">
                    <AttractionManagement 
                      organizationId={organizationId}
                      onAttractionSelect={(attraction) => {
                        setSelectedAttraction(attraction);
                        setActiveTab("event-details");
                      }}
                    />
                  </TabsContent>
                )}

                <TabsContent value="event-details" className="space-y-6">
                  {isEventsMode() ? (
                    selectedEvent ? (
                      <div className="space-y-6">
                        <EventCustomization eventId={selectedEvent.id} />
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-6">
                          <p className="text-muted-foreground text-center">Select an event from the events tab to view details</p>
                        </CardContent>
                      </Card>
                    )
                  ) : (
                    selectedAttraction ? (
                      <div className="space-y-6">
                        <AttractionCustomization attractionId={selectedAttraction.id} />
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-6">
                          <p className="text-muted-foreground text-center">Select an attraction from the attractions tab to view details</p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </TabsContent>

                {canAccessAnalytics() && (
                  <TabsContent value="analytics" className="space-y-6">
                    {isEventsMode() ? (
                      <EventAnalytics events={events} />
                    ) : (
                      <AttractionAnalytics attractions={attractions} />
                    )}
                  </TabsContent>
                )}

                <TabsContent value="payments" className="space-y-6">
                  <PaymentConfiguration organizationId={organizationId} />
                </TabsContent>

                <TabsContent value="marketing" className="space-y-6">
                  <MarketingTools selectedEvent={selectedEvent ? { id: selectedEvent.id, name: selectedEvent.name, status: selectedEvent.status, event_date: selectedEvent.event_date, description: undefined } : undefined} />
                </TabsContent>

                {canAccessBilling() && (
                  <TabsContent value="billing" className="space-y-6">
                    <BillingDashboard organizationId={organizationId} isLoading={false} />
                  </TabsContent>
                )}

                {canAccessUsers() && (
                  <TabsContent value="users" className="space-y-6">
                    <OrganizationUserManagement 
                      organizationId={organizationId} 
                      organizationName={organization?.name || 'Organization'} 
                      currentUserRole={userRole || undefined}
                    />
                  </TabsContent>
                )}

                <TabsContent value="support" className="space-y-6">
                  <Support />
                </TabsContent>

                {canAccessIntegrations() && (
                  <TabsContent value="integrations" className="space-y-6">
                    {selectedIntegration === 'xero' ? (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIntegration(null)}
                          >
                            ← Back to Apps
                          </Button>
                        </div>
                        <XeroIntegration organizationId={organizationId} />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-2xl font-bold mb-2">Apps & Integrations</h2>
                          <p className="text-muted-foreground">
                            Connect TicketFlo with your favorite tools to streamline your workflow
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Xero Integration */}
                          <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-1">
                                    <img src="/xero-logo.png" alt="Xero" className="w-full h-full object-contain" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">Xero</CardTitle>
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                      Accounting
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                              <CardDescription className="mb-4">
                                Sync your ticket sales, invoices, and customer data with Xero accounting software.
                              </CardDescription>
                              <Button
                                className="w-full"
                                onClick={() => setSelectedIntegration('xero')}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Connect to Xero
                              </Button>
                            </CardContent>
                          </Card>

                          {/* HubSpot Integration */}
                          <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg border border-gray-200 bg-[#FF7A59] flex items-center justify-center p-2">
                                    <svg viewBox="0 0 512 512" className="w-full h-full" fill="white">
                                      <path d="M267.4 211.6c-25.1 23.7-40.8 57.3-40.8 94.6 0 29.3 9.7 56.3 26 78L203.1 434c-4.4-1.6-9.1-2.5-14-2.5-10.8 0-20.9 4.2-28.5 11.8-7.6 7.6-11.8 17.8-11.8 28.6s4.2 20.9 11.8 28.5c7.6 7.6 17.8 11.6 28.5 11.6 10.8 0 20.9-3.9 28.6-11.6 7.6-7.6 11.8-17.8 11.8-28.5 0-4.2-.6-8.2-1.9-12.1l50-50.2c22 16.9 49.4 26.9 79.3 26.9 71.9 0 130-58.3 130-130.2 0-65.2-47.7-119.2-110.2-128.7V116c17.5-7.4 28.2-23.8 28.2-42.9 0-26.1-20.9-47.9-47-47.9S311.2 47 311.2 73.1c0 19.1 10.7 35.5 28.2 42.9v61.2c-15.2 2.1-29.6 6.7-42.7 13.6-27.6-20.9-117.5-85.7-168.9-124.8 1.2-4.4 2-9 2-13.8C129.8 23.4 106.3 0 77.4 0 48.6 0 25.2 23.4 25.2 52.2c0 28.9 23.4 52.3 52.2 52.3 9.8 0 18.9-2.9 26.8-7.6l163.2 114.7zm89.5 163.6c-38.1 0-69-30.9-69-69s30.9-69 69-69 69 30.9 69 69-30.9 69-69 69z"/>
                                    </svg>
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">HubSpot</CardTitle>
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                      CRM
                                    </Badge>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Coming Soon
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                              <CardDescription className="mb-4">
                                Connect your customer data and event attendees with HubSpot CRM for powerful marketing automation.
                              </CardDescription>
                              <Button className="w-full" variant="outline" disabled>
                                Coming Soon
                              </Button>
                            </CardContent>
                          </Card>

                          {/* Zapier Integration */}
                          <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-1">
                                    <img src="/zapier-logo.svg" alt="Zapier" className="w-full h-full object-contain" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">Zapier</CardTitle>
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                      Automation
                                    </Badge>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Coming Soon
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                              <CardDescription className="mb-4">
                                Automate workflows by connecting TicketFlo with 5,000+ apps through Zapier integrations.
                              </CardDescription>
                              <Button className="w-full" variant="outline" disabled>
                                Coming Soon
                              </Button>
                            </CardContent>
                          </Card>

                          {/* QuickBooks Integration */}
                          <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-1">
                                    <img src="/quickbooks-logo.png" alt="QuickBooks" className="w-full h-full object-contain" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">QuickBooks</CardTitle>
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                      Accounting
                                    </Badge>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Coming Soon
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                              <CardDescription className="mb-4">
                                Connect your sales and financial data with QuickBooks for seamless accounting management.
                              </CardDescription>
                              <Button className="w-full" variant="outline" disabled>
                                Coming Soon
                              </Button>
                            </CardContent>
                          </Card>

                          {/* NetSuite Integration */}
                          <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-1">
                                    <img src="/netsuite-logo.png" alt="NetSuite" className="w-full h-full object-contain" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">NetSuite</CardTitle>
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                      ERP
                                    </Badge>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Coming Soon
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                              <CardDescription className="mb-4">
                                Integrate with NetSuite ERP for enterprise-level financial management and reporting.
                              </CardDescription>
                              <Button className="w-full" variant="outline" disabled>
                                Coming Soon
                              </Button>
                            </CardContent>
                          </Card>

                          {/* Windcave Integration */}
                          <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-1">
                                    <img src="/windcave-logo.png" alt="Windcave" className="w-full h-full object-contain" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">Windcave</CardTitle>
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                      Payments
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                              <CardDescription className="mb-4">
                                Accept secure payments with Windcave's payment gateway. Sign up for an account to get started.
                              </CardDescription>
                              <Button
                                className="w-full"
                                onClick={() => window.open('https://sec.windcave.com/pxmi3/signup?promocode=acq', '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Sign Up
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                )}

                {canAccessSecurity() && (
                  <TabsContent value="security" className="space-y-6">
                    <SecurityDashboard />
                  </TabsContent>
                )}

                {canAccessSettings() && (
                  <TabsContent value="settings" className="space-y-6">
                    <OrganizationSettings />
                  </TabsContent>
                )}
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