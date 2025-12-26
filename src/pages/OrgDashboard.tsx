import React, { useState, useCallback, useRef, useEffect } from "react";
import XeroIntegration from "@/components/XeroIntegration";
import HubSpotIntegration from "@/components/apps/HubSpotIntegration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizations } from "@/hooks/useOrganizations";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { TrendIndicator } from "@/components/TrendIndicator";
import { MiniSparkline } from "@/components/MiniSparkline";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { TimeRangeFilter, TimeRange } from "@/components/TimeRangeFilter";
import { calculateDateRange, calculatePreviousPeriod, formatEventDateRange } from "@/lib/dateUtils";

import { EventAnalytics } from "@/components/EventAnalytics";
import AIChatbot from "@/components/AIChatbot";
import BillingDashboard from "@/components/BillingDashboard";
import { SeatMapDesigner } from "@/components/SeatMapDesigner";
import EventCustomization from "@/components/EventCustomization";
import { EventTemplatesManager } from "@/components/EventTemplatesManager";
import { PaymentConfiguration } from "@/components/PaymentConfiguration";
import { PayoutsAndFees } from "@/components/PayoutsAndFees";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Calendar, Users, Ticket, BarChart3, Monitor, LogOut, Menu, HelpCircle, DollarSign, ExternalLink, Clock, CheckCircle, Search, ChevronDown, ChevronUp, FileText, ShoppingCart } from "lucide-react";
import OrganizationSettings from "@/components/OrganizationSettings";
import OrganizationOnboarding from "@/components/OrganizationOnboarding";

import { SecurityDashboard } from "@/components/SecurityDashboard";
import { MarketingTools } from "@/components/MarketingTools";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { AttractionAnalytics } from "@/components/AttractionAnalytics";
import { DashboardWidgets } from "@/components/DashboardWidgets";
import { AttractionsDashboardWidgets } from "@/components/AttractionsDashboardWidgets";
import { CustomizeDashboard } from "@/components/CustomizeDashboard";
import { CustomizeAttractionsDashboard } from "@/components/CustomizeAttractionsDashboard";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { useAttractionsDashboardConfig } from "@/hooks/useAttractionsDashboardConfig";
import { RecentSalesCard } from "@/components/RecentSalesCard";
import Support from "@/pages/Support";
import { DashboardHelp } from "@/components/DashboardHelp";
import { OrganizationUserManagement } from "@/components/OrganizationUserManagement";
import AttractionManagement from "@/components/AttractionManagement";
import { AttractionEditorV3 } from "@/components/attractions/admin/AttractionEditorV3";
import GroupsManagement from "@/components/GroupsManagement";
import CustomersCRM from "@/pages/CustomersCRM";
import IssuingPage from "@/pages/IssuingPage";
import Playbooks from "@/pages/Playbooks";
import { useNavigate } from "react-router-dom";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { FloatingOnboardingWidget } from "@/components/FloatingOnboardingWidget";
import { useOnboarding } from "@/hooks/useOnboarding";


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
  event_end_date?: string | null;
};

type EventTypeDatum = { name: string; value: number; color: string }; // Total revenue by event
type RevenuePoint = { day: string; revenue: number }; // Weekly revenue by event

type AnalyticsState = {
  totalTickets: number;
  salesData: { month: string; sales: number; tickets: number }[];
  eventTypesData: EventTypeDatum[];
  revenueData: RevenuePoint[];
  // Time-series data for "Revenue Over Time" chart
  revenueTimeSeries: { date: string; revenue: number }[];
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
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [eventCustomizationTab, setEventCustomizationTab] = useState<string | undefined>(undefined);
  const [eventCustomizationSubTab, setEventCustomizationSubTab] = useState<string | undefined>(undefined);

  // Use the organizations hook for multi-organization support
  const {
    organizations,
    currentOrganization,
    loading: orgLoading,
    showOnboarding: showOrgOnboarding,
    switchOrganization,
    reloadOrganizations,
  } = useOrganizations();
  
  // Permission checking functions based on current organization role
  const canAccessAnalytics = () => {
    const role = currentOrganization?.role;
    return role === 'owner' || role === 'admin' || role === 'editor';
  };
  const canAccessBilling = () => {
    const role = currentOrganization?.role;
    return role === 'owner' || role === 'admin';
  };
  const canAccessUsers = () => {
    const role = currentOrganization?.role;
    return role === 'owner' || role === 'admin';
  };
  const canAccessSecurity = () => {
    const role = currentOrganization?.role;
    return role === 'owner' || role === 'admin';
  };
  const canAccessSettings = () => {
    const role = currentOrganization?.role;
    return role === 'owner' || role === 'admin';
  };
  const canAccessIntegrations = () => {
    const role = currentOrganization?.role;
    return role === 'owner' || role === 'admin';
  };
  const canAccessGroups = () => {
    const role = currentOrganization?.role;
    return (role === 'owner' || role === 'admin') && currentOrganization?.groups_enabled === true;
  };

  const canAccessCRM = () => {
    const role = currentOrganization?.role;
    return (role === 'owner' || role === 'admin') && currentOrganization?.crm_enabled === true;
  };

  const canAccessIssuing = () => {
    const role = currentOrganization?.role;
    return (role === 'owner' || role === 'admin') && currentOrganization?.issuing_enabled === true;
  };

  const canAccessPlaybooks = () => {
    const role = currentOrganization?.role;
    return (role === 'owner' || role === 'admin') && currentOrganization?.playbooks_enabled === true;
  };

  // System type checking
  const isEventsMode = () => !currentOrganization?.system_type || currentOrganization?.system_type === 'EVENTS';
  


  const [showHelp, setShowHelp] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [hubspotConnected, setHubspotConnected] = useState(false);

  // Onboarding state - pass organizationId to ensure it uses the same org context
  const { showWizard: shouldShowWizard, refreshOnboardingState, checklistItems } = useOnboarding({
    organizationId: currentOrganization?.id
  });

  // Dashboard customization config
  const {
    config: dashboardConfig,
    enabledWidgets,
    updateWidgetEnabled,
    updateWidgetChartType,
    reorderWidgets,
    resetToDefaults: resetDashboardDefaults,
    saveConfig: saveDashboardConfig,
    isSaving: isSavingDashboard,
    isLoading: isLoadingDashboardConfig,
  } = useDashboardConfig({ organizationId: currentOrganization?.id || null });

  // Attractions dashboard customization config
  const {
    config: attractionDashboardConfig,
    enabledWidgets: attractionEnabledWidgets,
    updateWidgetEnabled: updateAttractionWidgetEnabled,
    updateWidgetChartType: updateAttractionWidgetChartType,
    reorderWidgets: reorderAttractionWidgets,
    resetToDefaults: resetAttractionDashboardDefaults,
    saveConfig: saveAttractionDashboardConfig,
    isSaving: isSavingAttractionDashboard,
    isLoading: isLoadingAttractionDashboardConfig,
  } = useAttractionsDashboardConfig({ organizationId: currentOrganization?.id || null });

  // Show onboarding wizard when needed
  useEffect(() => {
    if (shouldShowWizard && currentOrganization && isEventsMode()) {
      setShowOnboardingWizard(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isEventsMode is stable
  }, [shouldShowWizard, currentOrganization]);

  // Check HubSpot connection status
  useEffect(() => {
    const checkHubspotConnection = async () => {
      if (!currentOrganization?.id) return;
      try {
        const { data } = await supabase
          .from('hubspot_connections')
          .select('id, connection_status')
          .eq('organization_id', currentOrganization.id)
          .maybeSingle();
        setHubspotConnected(data?.connection_status === 'connected');
      } catch (err) {
        console.error('Error checking HubSpot connection:', err);
      }
    };
    checkHubspotConnection();
  }, [currentOrganization?.id, selectedIntegration]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    totalOrders: 0,
    totalRevenue: 0,
    estimatedPlatformFees: 0,
    trends: {
      orders: 0,
      revenue: 0,
      events: 0,
      fees: 0
    }
  });

  // Analytics data for charts
  const [analyticsData, setAnalyticsData] = useState<AnalyticsState>({
    totalTickets: 0,
    salesData: [],
    eventTypesData: [],
    revenueData: [],
    revenueTimeSeries: []
  });
  
  // Order data for custom answers and recent sales
  const [orderData, setOrderData] = useState<any[]>([]);

  // Widget tracking analytics
  const [widgetAnalytics, setWidgetAnalytics] = useState({
    deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
    visitorLocations: [] as Array<{ country: string; count: number }>,
    conversionFunnel: [] as Array<{ step: string; count: number; rate: number }>,
    ticketsByType: [] as Array<{ name: string; count: number }>,
  });

  // Attraction widget analytics data
  const [attractionWidgetData, setAttractionWidgetData] = useState({
    totalBookings: 0,
    totalGuests: 0,
    avgBookingValue: 0,
    checkinRate: 0,
    revenueByAttraction: [] as Array<{ name: string; revenue: number }>,
    revenueOverTime: [] as Array<{ date: string; revenue: number }>,
    weeklyRevenue: [] as Array<{ day: string; revenue: number }>,
    bookingsOverTime: [] as Array<{ date: string; bookings: number }>,
    bookingsByAttraction: [] as Array<{ name: string; bookings: number }>,
    partySizeDistribution: [] as Array<{ size: string; count: number }>,
    capacityUtilization: [] as Array<{ name: string; used: number; capacity: number }>,
    popularTimeSlots: [] as Array<{ time: string; bookings: number }>,
    revenueTrend: 0,
    bookingsTrend: 0,
  });

  // Group analytics data
  const [groupAnalytics, setGroupAnalytics] = useState({
    groupSalesByGroup: [] as Array<{ name: string; revenue: number; ticketsSold: number; discounts: number }>,
    outstandingInvoices: [] as Array<{ id: string; groupName: string; invoiceNumber: string; amountOwed: number; dueDate: string | null; status: string }>,
  });

  // New Dashboard Enhancement States
  const [revenueGoal, setRevenueGoal] = useState({ current: 0, goal: 100000 });
  const [liveActivities, setLiveActivities] = useState<Array<{ id: string; type: string; message: string; timestamp: Date; amount?: number; eventName?: string }>>([]);
  const [quickActions, setQuickActions] = useState<Array<{ id: string; type: string; count: number; label: string; description?: string; priority: string }>>([]);
  const [salesHeatmapData, setSalesHeatmapData] = useState<Array<{ day: string; hour: number; value: number }>>([]);
  const [aiInsights, setAIInsights] = useState<Array<{ id: string; type: string; title: string; description: string; metric?: string; metricChange?: number; actionLabel?: string }>>([]);

  // Populate liveActivities from orderData (which has complete customer info)
  React.useEffect(() => {
    if (orderData && orderData.length > 0) {
      const activities = orderData
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map((order: any) => {
          const ticketCount = order.order_items?.reduce((sum: number, item: any) =>
            item.item_type === 'ticket' ? sum + (item.quantity || 0) : sum, 0) || 0;
          const customerName = order.customer_name || 'Customer';

          return {
            id: order.id,
            type: 'sale',
            message: `${customerName} purchased ${ticketCount} ticket${ticketCount !== 1 ? 's' : ''} for ${order.events?.name || 'Event'}`,
            timestamp: new Date(order.created_at),
            amount: Number(order.total_amount) || 0,
            eventName: order.events?.name,
          };
        });
      setLiveActivities(activities);
    }
  }, [orderData]);

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

  // Listen for tab change requests from Playbooks and other components
  React.useEffect(() => {
    const handleTabChange = async (event: CustomEvent) => {
      if (event.detail?.tab) {
        setActiveTab(event.detail.tab);

        // If navigating to event-details, handle sub-tab selection
        if (event.detail.tab === 'event-details') {
          // Set the EventCustomization tab and sub-tab if provided
          if (event.detail.eventTab) {
            setEventCustomizationTab(event.detail.eventTab);
          }
          if (event.detail.eventSubTab) {
            setEventCustomizationSubTab(event.detail.eventSubTab);
          }

          // If an eventId is provided, load and select that event
          if (event.detail?.eventId) {
            try {
              const { data: eventData, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', event.detail.eventId)
                .single();

              if (!error && eventData) {
                setSelectedEvent({
                  id: eventData.id,
                  name: eventData.name,
                  status: eventData.status,
                  venue: eventData.venue,
                  capacity: eventData.capacity || 0,
                  tickets_sold: 0,
                  revenue: 0,
                  created_at: eventData.created_at,
                  event_date: eventData.event_date,
                  event_end_date: eventData.event_end_date,
                });
              }
            } catch (err) {
              console.error('Error loading event:', err);
            }
          }
        }
      }
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);

    return () => {
      window.removeEventListener('changeTab', handleTabChange as EventListener);
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
    endDate: "",
    venue: "",
    capacity: "",
    description: ""
  });
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showSeatMapDesigner, setShowSeatMapDesigner] = useState(false);

  // Load data when organization changes
  React.useEffect(() => {
    if (!currentOrganization) {
      return;
    }

    console.log("=== ORGANIZATION SELECTED ===");
    console.log("Organization:", currentOrganization.name);
    console.log("Organization ID:", currentOrganization.id);
    console.log("User role:", currentOrganization.role);

    // Load data based on system type
    if (isEventsMode()) {
      loadEvents(currentOrganization.id);
    } else {
      loadAttractions(currentOrganization.id);
    }

    // Load analytics based on role
    if (canAccessAnalytics()) {
      if (isEventsMode()) {
        loadAnalytics(currentOrganization.id, timeRange);
        loadAnalyticsData(currentOrganization.id);
        loadWidgetAnalytics(currentOrganization.id);
        // Load group analytics if groups are enabled
        if (currentOrganization.groups_enabled) {
          loadGroupAnalytics(currentOrganization.id);
        }
      } else {
        loadAttractionAnalytics(currentOrganization.id, timeRange);
        loadAttractionAnalyticsData(currentOrganization.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load functions are stable, pass orgId as arg
  }, [currentOrganization?.id, timeRange]);

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
        event_date: event.event_date,
        event_end_date: event.event_end_date || null
      }));

      setEvents(mappedEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  }, []);

  const loadAttractionAnalytics = useCallback(async (orgId: string, range: TimeRange = '30d', attractionId?: string) => {
    console.log("Loading attraction analytics for org:", orgId, "range:", range, "attraction:", attractionId);
    setIsLoadingAnalytics(true);

    try {
      const { startDate, endDate } = calculateDateRange(range);
      const previousPeriod = calculatePreviousPeriod(range);

      // Current period bookings
      let query = supabase
        .from("attraction_bookings")
        .select(`
          total_amount,
          booking_status,
          created_at,
          attractions!inner(organization_id, name, id)
        `)
        .eq("attractions.organization_id", orgId)
        .in("booking_status", ["confirmed", "completed"])
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

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

      // Previous period bookings for trend calculation
      let previousQuery = supabase
        .from("attraction_bookings")
        .select(`
          total_amount,
          booking_status,
          attractions!inner(organization_id)
        `)
        .eq("attractions.organization_id", orgId)
        .in("booking_status", ["confirmed", "completed"])
        .gte("created_at", previousPeriod.startDate.toISOString())
        .lte("created_at", previousPeriod.endDate.toISOString());

      if (attractionId) {
        previousQuery = previousQuery.eq("attractions.id", attractionId);
      }

      const { data: previousBookings, error: previousError } = await previousQuery;

      if (previousError) console.error("Error loading previous period bookings:", previousError);

      const totalBookings = bookings?.length || 0;
      const totalRevenue = bookings?.reduce((sum, booking) => sum + (Number(booking.total_amount) || 0), 0) || 0;
      const estimatedPlatformFees = totalRevenue * 0.05; // 5% platform fee

      // Previous period metrics
      const previousBookingsCount = previousBookings?.length || 0;
      const previousRevenue = previousBookings?.reduce((sum, booking) => sum + (Number(booking.total_amount) || 0), 0) || 0;
      const previousFees = previousRevenue * 0.05;

      // Calculate trends
      const bookingsTrend = previousBookingsCount > 0
        ? Math.round(((totalBookings - previousBookingsCount) / previousBookingsCount) * 100)
        : 0;
      const revenueTrend = previousRevenue > 0
        ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
        : 0;
      const feesTrend = previousFees > 0
        ? Math.round(((estimatedPlatformFees - previousFees) / previousFees) * 100)
        : 0;

      // Get attractions count
      const { data: attractions, error: attractionsError } = await supabase
        .from("attractions")
        .select("id")
        .eq("organization_id", orgId);

      if (attractionsError) throw attractionsError;

      console.log("=== ATTRACTION ANALYTICS CALCULATION DEBUG ===");
      console.log("Organization ID used for analytics:", orgId);
      console.log("Total bookings found:", totalBookings);
      console.log("Previous bookings:", previousBookingsCount);
      console.log("Total revenue calculated:", totalRevenue);
      console.log("Previous revenue:", previousRevenue);
      console.log("Trends:", { bookingsTrend, revenueTrend, feesTrend });

      setAnalytics({
        totalEvents: attractions?.length || 0,
        totalOrders: totalBookings,
        totalRevenue,
        estimatedPlatformFees,
        trends: {
          orders: bookingsTrend,
          revenue: revenueTrend,
          events: 0,
          fees: feesTrend
        }
      });
    } catch (error) {
      console.error("Error loading attraction analytics:", error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (orgId: string, range: TimeRange = '30d') => {
    console.log("Loading analytics for org:", orgId, "range:", range);
    setIsLoadingAnalytics(true);

    try {
      const { startDate, endDate } = calculateDateRange(range);
      const previousPeriod = calculatePreviousPeriod(range);

      // Get current period orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          total_amount,
          status,
          created_at,
          events!inner(organization_id, name)
        `)
        .eq("events.organization_id", orgId)
        .in("status", ["paid", "completed"])
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      console.log("=== LOAD ANALYTICS QUERY DEBUG ===");
      console.log("Query for organization_id:", orgId);
      console.log("Date range:", startDate.toISOString(), "to", endDate.toISOString());
      console.log("Orders found by loadAnalytics:", orders?.length || 0);
      console.log("Query error:", ordersError);

      if (ordersError) throw ordersError;

      // Get previous period orders for trend calculation
      const { data: previousOrders, error: previousError } = await supabase
        .from("orders")
        .select(`
          total_amount,
          status,
          events!inner(organization_id)
        `)
        .eq("events.organization_id", orgId)
        .in("status", ["paid", "completed"])
        .gte("created_at", previousPeriod.startDate.toISOString())
        .lte("created_at", previousPeriod.endDate.toISOString());

      if (previousError) console.error("Error loading previous period:", previousError);

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;
      const estimatedPlatformFees = totalRevenue * 0.05; // 5% platform fee

      // Previous period metrics
      const previousOrdersCount = previousOrders?.length || 0;
      const previousRevenue = previousOrders?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;
      const previousFees = previousRevenue * 0.05;

      // Calculate trends (percentage change)
      const ordersTrend = previousOrdersCount > 0
        ? Math.round(((totalOrders - previousOrdersCount) / previousOrdersCount) * 100)
        : 0;
      const revenueTrend = previousRevenue > 0
        ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
        : 0;
      const feesTrend = previousFees > 0
        ? Math.round(((estimatedPlatformFees - previousFees) / previousFees) * 100)
        : 0;

      // Get events count
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id")
        .eq("organization_id", orgId);

      if (eventsError) throw eventsError;

      console.log("=== ANALYTICS CALCULATION DEBUG ===");
      console.log("Organization ID used for analytics:", orgId);
      console.log("Total orders found:", totalOrders);
      console.log("Previous orders:", previousOrdersCount);
      console.log("Total revenue calculated:", totalRevenue);
      console.log("Previous revenue:", previousRevenue);
      console.log("Trends:", { ordersTrend, revenueTrend, feesTrend });

      setAnalytics({
        totalEvents: events?.length || 0,
        totalOrders,
        totalRevenue,
        estimatedPlatformFees,
        trends: {
          orders: ordersTrend,
          revenue: revenueTrend,
          events: 0, // Events don't change by period typically
          fees: feesTrend
        }
      });

      // Update revenue goal progress
      setRevenueGoal(prev => ({ ...prev, current: totalRevenue }));

      // Generate quick actions based on analytics
      const actions: QuickAction[] = [];

      // Check for abandoned carts (mock data for now - would come from cart_sessions table)
      const abandonedCartCount = Math.floor(Math.random() * 8); // Replace with real data
      if (abandonedCartCount > 0) {
        actions.push({
          id: 'abandoned_carts',
          type: 'abandoned_carts',
          count: abandonedCartCount,
          label: 'Abandoned Carts',
          description: 'Potential revenue to recover',
          priority: abandonedCartCount > 5 ? 'high' : 'medium',
        });
      }

      // Check for low inventory events
      const lowInventoryEvents = events?.filter((e: { capacity?: number; tickets_sold?: number }) =>
        e.capacity && e.capacity > 0 &&
        ((e.capacity - (e.tickets_sold || 0)) / e.capacity) < 0.1
      )?.length || 0;
      if (lowInventoryEvents > 0) {
        actions.push({
          id: 'low_inventory',
          type: 'low_inventory',
          count: lowInventoryEvents,
          label: 'Low Inventory',
          description: 'Events nearly sold out',
          priority: 'medium',
        });
      }

      setQuickActions(actions);

      // Note: liveActivities are populated from orderData via useEffect for complete data

      // Generate sales heatmap data from orders
      const heatmapMap = new Map<string, number>();
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      orders?.forEach((order: any) => {
        const date = new Date(order.created_at);
        const dayIndex = date.getDay();
        const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1];
        const hour = date.getHours();
        const key = `${dayName}-${hour}`;
        heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
      });
      const heatmapData = Array.from(heatmapMap.entries()).map(([key, value]) => {
        const [day, hour] = key.split('-');
        return { day, hour: parseInt(hour), value };
      });
      setSalesHeatmapData(heatmapData);

      // Generate AI insights based on analytics
      const insights: Insight[] = [];

      if (revenueTrend > 15) {
        insights.push({
          id: 'revenue-growth',
          type: 'trend',
          title: 'Strong Revenue Growth',
          description: `Revenue is up ${revenueTrend}% compared to last period. Your marketing efforts are paying off!`,
          metric: `+$${(totalRevenue - previousRevenue).toLocaleString()}`,
          metricChange: revenueTrend,
        });
      } else if (revenueTrend < -10) {
        insights.push({
          id: 'revenue-decline',
          type: 'warning',
          title: 'Revenue Needs Attention',
          description: `Revenue is down ${Math.abs(revenueTrend)}% compared to last period. Consider running a promotional campaign.`,
          actionLabel: 'Create Promo Code',
          onAction: () => setActiveTab('event-details'),
        });
      }

      if (abandonedCartCount > 3) {
        insights.push({
          id: 'cart-recovery',
          type: 'opportunity',
          title: `${abandonedCartCount} Abandoned Carts`,
          description: 'Send recovery emails to convert these potential customers. Average recovery rate is 15%.',
          metric: `~$${(abandonedCartCount * (totalOrders > 0 ? totalRevenue / totalOrders : 50) * 0.15).toFixed(0)}`,
          actionLabel: 'Send Recovery Emails',
        });
      }

      if (totalOrders > 10 && (totalRevenue / totalOrders) > 100) {
        insights.push({
          id: 'high-aov',
          type: 'suggestion',
          title: 'High Average Order Value',
          description: `Your AOV of $${(totalRevenue / totalOrders).toFixed(2)} is strong. Consider bundle offers to increase it further.`,
        });
      }

      setAIInsights(insights);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoadingAnalytics(false);
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

    // Process data for attraction widgets
    const totalRevenue = bookingData.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    const avgBookingValue = totalTickets > 0 ? totalRevenue / totalTickets : 0;

    // Bookings by attraction
    const attractionBookings = new Map<string, number>();
    bookingData.forEach(booking => {
      const name = booking.attractions?.name || 'Unknown';
      attractionBookings.set(name, (attractionBookings.get(name) || 0) + 1);
    });

    // Revenue over time (daily for last 30 days)
    const revenueByDate = new Map<string, number>();
    const bookingsByDate = new Map<string, number>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    bookingData.forEach(booking => {
      const bookingDate = new Date(booking.created_at);
      if (bookingDate >= thirtyDaysAgo) {
        const dateKey = bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        revenueByDate.set(dateKey, (revenueByDate.get(dateKey) || 0) + (Number(booking.total_amount) || 0));
        bookingsByDate.set(dateKey, (bookingsByDate.get(dateKey) || 0) + 1);
      }
    });

    // Weekly revenue by day name
    const weeklyRevenueByDay = new Map<string, number>();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    bookingData.forEach(booking => {
      const bookingDate = new Date(booking.created_at);
      if (bookingDate >= sevenDaysAgo) {
        const dayName = bookingDate.toLocaleDateString('en-US', { weekday: 'short' });
        weeklyRevenueByDay.set(dayName, (weeklyRevenueByDay.get(dayName) || 0) + (Number(booking.total_amount) || 0));
      }
    });

    // Set attraction widget data
    setAttractionWidgetData({
      totalBookings: totalTickets,
      totalGuests: totalTickets, // Assuming 1 booking = 1 guest for now
      avgBookingValue,
      checkinRate: 0, // Will need additional data to calculate
      revenueByAttraction: Array.from(attractionRevenue.entries()).map(([name, revenue]) => ({
        name,
        revenue: Number(revenue)
      })),
      revenueOverTime: Array.from(revenueByDate.entries()).map(([date, revenue]) => ({
        date,
        revenue
      })),
      weeklyRevenue: Array.from(weeklyRevenueByDay.entries()).map(([day, revenue]) => ({
        day,
        revenue
      })),
      bookingsOverTime: Array.from(bookingsByDate.entries()).map(([date, bookings]) => ({
        date,
        bookings
      })),
      bookingsByAttraction: Array.from(attractionBookings.entries()).map(([name, bookings]) => ({
        name,
        bookings
      })),
      partySizeDistribution: [], // Will need party_size data
      capacityUtilization: attractionData.map(a => ({
        name: a.name,
        used: attractionBookings.get(a.name) || 0,
        capacity: 100 // Default capacity, would need real data
      })),
      popularTimeSlots: [], // Will need time slot data
      revenueTrend: 0,
      bookingsTrend: 0,
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
        revenueData: [],
        revenueTimeSeries: []
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
        customer_name,
        customer_email,
        events(name),
        order_items(
          quantity,
          item_type,
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
    
    // 4. Revenue Time Series (daily for last 30 days)
    const revenueByDate = new Map<string, number>();
    const now = new Date();

    // Initialize all dates in the last 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      revenueByDate.set(dateKey, 0);
    }

    // Fill in actual revenue data
    if (orderData) {
      orderData.forEach(order => {
        const orderDate = new Date(order.created_at);
        const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 29 && daysDiff >= 0) {
          const dateKey = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const currentRevenue = revenueByDate.get(dateKey) || 0;
          revenueByDate.set(dateKey, currentRevenue + (Number(order.total_amount) || 0));
        }
      });
    }

    // Convert to array format
    const revenueTimeSeries = Array.from(revenueByDate.entries())
      .map(([date, revenue]) => ({ date, revenue }));

    console.log("Final analytics data:", {
      totalTickets,
      weeklyRevenueData: weeklyRevenueData.length,
      monthlyRevenueData: monthlyRevenueData.length,
      eventTypesData: eventTypesData.length,
      revenueTimeSeries: revenueTimeSeries.length
    });

    console.log("Setting analytics data with:", {
      totalTickets,
      salesData: monthlyRevenueData,
      eventTypesData,
      revenueData: weeklyRevenueData,
      revenueTimeSeries
    });

    setAnalyticsData({
      totalTickets,
      salesData: monthlyRevenueData, // Use monthly revenue data for performance trend
      eventTypesData,
      revenueData: weeklyRevenueData, // Use weekly revenue data for weekly revenue chart
      revenueTimeSeries // Use time series for "Revenue Over Time" chart
    });
    
    console.log("Analytics data set successfully");
  }, []);

  // Load widget tracking analytics (device breakdown, locations, funnel)
  const loadWidgetAnalytics = useCallback(async (orgId: string) => {
    console.log("Loading widget analytics for org:", orgId);

    try {
      // Get all events for this org to filter widget sessions
      const { data: eventData } = await supabase
        .from("events")
        .select("id")
        .eq("organization_id", orgId);

      if (!eventData || eventData.length === 0) {
        console.log("No events found for widget analytics");
        return;
      }

      const eventIds = eventData.map(e => e.id);

      // Get widget sessions data (same table as WidgetFunnelAnalytics uses)
      const { data: sessions, error: sessionError } = await supabase
        .from("widget_sessions")
        .select("*")
        .in("event_id", eventIds);

      if (sessionError) {
        console.error("Error loading widget sessions:", sessionError);
        return;
      }

      if (!sessions || sessions.length === 0) {
        console.log("No widget session data found");
        return;
      }

      console.log("Found widget sessions:", sessions.length);

      // Calculate device breakdown
      const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
      sessions.forEach(session => {
        const device = session.device_type?.toLowerCase() || 'desktop';
        if (device === 'mobile') {
          deviceCounts.mobile++;
        } else if (device === 'tablet') {
          deviceCounts.tablet++;
        } else {
          deviceCounts.desktop++;
        }
      });

      // Calculate visitor locations
      const locationCounts = new Map<string, number>();
      sessions.forEach(session => {
        const country = session.country || 'Unknown';
        if (country && country !== 'Unknown') {
          locationCounts.set(country, (locationCounts.get(country) || 0) + 1);
        }
      });
      const visitorLocations = Array.from(locationCounts.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate conversion funnel (matching WidgetFunnelAnalytics)
      const widgetLoaded = sessions.filter(s => s.widget_loaded_at).length;
      const ticketSelected = sessions.filter(s => s.ticket_selected_at).length;
      const checkoutStarted = sessions.filter(s => s.checkout_started_at).length;
      const purchaseCompleted = sessions.filter(s => s.purchase_completed_at).length;

      const conversionFunnel = [
        { step: "Widget Views", count: widgetLoaded, rate: 100 },
        { step: "Ticket Selected", count: ticketSelected, rate: widgetLoaded > 0 ? (ticketSelected / widgetLoaded) * 100 : 0 },
        { step: "Checkout Started", count: checkoutStarted, rate: widgetLoaded > 0 ? (checkoutStarted / widgetLoaded) * 100 : 0 },
        { step: "Purchase Completed", count: purchaseCompleted, rate: widgetLoaded > 0 ? (purchaseCompleted / widgetLoaded) * 100 : 0 },
      ];

      // Get tickets by type from order items
      const { data: orderItemData } = await supabase
        .from("order_items")
        .select(`
          quantity,
          ticket_types(name),
          orders!inner(events!inner(organization_id))
        `)
        .eq("orders.events.organization_id", orgId)
        .eq("item_type", "ticket");

      const ticketTypeCounts = new Map<string, number>();
      orderItemData?.forEach(item => {
        const typeName = (item.ticket_types as any)?.name || 'General';
        ticketTypeCounts.set(typeName, (ticketTypeCounts.get(typeName) || 0) + (item.quantity || 0));
      });
      const ticketsByType = Array.from(ticketTypeCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setWidgetAnalytics({
        deviceBreakdown: deviceCounts,
        visitorLocations,
        conversionFunnel,
        ticketsByType,
      });

      console.log("Widget analytics loaded:", { deviceCounts, visitorLocations: visitorLocations.length, conversionFunnel, ticketsByType });
    } catch (error) {
      console.error("Error loading widget analytics:", error);
    }
  }, []);

  // Load group analytics data (sales by group, outstanding invoices)
  const loadGroupAnalytics = useCallback(async (orgId: string) => {
    console.log("Loading group analytics for org:", orgId);

    try {
      // Get groups with their sales data
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          group_ticket_allocations (
            allocated_quantity,
            used_quantity
          ),
          group_ticket_sales (
            paid_price,
            discount_amount
          )
        `)
        .eq("organization_id", orgId);

      if (groupsError) {
        console.error("Error loading groups:", groupsError);
      }

      // Process group sales data
      const groupSalesByGroup = (groupsData || []).map((group: any) => {
        const sales = group.group_ticket_sales || [];
        const allocations = group.group_ticket_allocations || [];
        return {
          name: group.name,
          revenue: sales.reduce((sum: number, s: any) => sum + (s.paid_price || 0), 0),
          ticketsSold: allocations.reduce((sum: number, a: any) => sum + (a.used_quantity || 0), 0),
          discounts: sales.reduce((sum: number, s: any) => sum + (s.discount_amount || 0), 0),
        };
      }).filter((g: any) => g.revenue > 0 || g.ticketsSold > 0 || g.discounts > 0)
        .sort((a: any, b: any) => b.revenue - a.revenue);

      // Get outstanding invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("group_invoices")
        .select(`
          id,
          invoice_number,
          amount_owed,
          amount_paid,
          due_date,
          status,
          groups!inner (
            name,
            organization_id
          )
        `)
        .eq("groups.organization_id", orgId)
        .in("status", ["draft", "sent", "pending", "partial", "overdue"]);

      if (invoicesError) {
        console.error("Error loading invoices:", invoicesError);
      }

      // Process outstanding invoices
      const outstandingInvoices = (invoicesData || [])
        .filter((inv: any) => (inv.amount_owed - inv.amount_paid) > 0)
        .map((inv: any) => ({
          id: inv.id,
          groupName: inv.groups?.name || 'Unknown Group',
          invoiceNumber: inv.invoice_number,
          amountOwed: inv.amount_owed - inv.amount_paid,
          dueDate: inv.due_date,
          status: inv.status,
        }))
        .sort((a: any, b: any) => b.amountOwed - a.amountOwed);

      setGroupAnalytics({
        groupSalesByGroup,
        outstandingInvoices,
      });

      console.log("Group analytics loaded:", { groupSalesByGroup: groupSalesByGroup.length, outstandingInvoices: outstandingInvoices.length });
    } catch (error) {
      console.error("Error loading group analytics:", error);
    }
  }, []);

  const handleOnboardingComplete = async () => {
    // Reload organizations to include the newly created one
    await reloadOrganizations();

    // Force a page refresh to ensure the dashboard loads with the new organization
    window.location.reload();
  };


  const handleCreateEvent = async () => {
    if (!currentOrganization?.id || !eventForm.name || !eventForm.date || !eventForm.venue || !eventForm.capacity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (eventForm.endDate) {
      const startDate = new Date(eventForm.date);
      const endDate = new Date(eventForm.endDate);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        toast({
          title: "Error",
          description: "Please provide valid start and end dates",
          variant: "destructive"
        });
        return;
      }

      if (endDate < startDate) {
        toast({
          title: "Error",
          description: "End date must be on or after the start date",
          variant: "destructive"
        });
        return;
      }
    }

    setIsCreatingEvent(true);
    try {
      const { error } = await supabase
        .from("events")
        .insert({
          name: eventForm.name,
          event_date: eventForm.date,
          event_end_date: eventForm.endDate || null,
          venue: eventForm.venue,
          capacity: parseInt(eventForm.capacity),
          description: eventForm.description,
          organization_id: currentOrganization.id,
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
        endDate: "",
        venue: "",
        capacity: "",
        description: ""
      });

      // Reload events
      loadEvents(currentOrganization.id);
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
  if (showOrgOnboarding) {
    return <OrganizationOnboarding onComplete={handleOnboardingComplete} />;
  }

  // Show loading while organizations are being fetched
  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen bg-background flex flex-col w-full" style={{ width: '100%', maxWidth: 'none' }}>
        {/* Full-width Header with backdrop blur */}
        <header className="sticky top-0 z-40 bg-background border-b border-border flex-shrink-0 h-[52px]" style={{ width: '100%', maxWidth: 'none' }}>
          <div className="px-4 h-full w-full flex items-center justify-between" style={{ width: '100%', maxWidth: 'none' }}>
            {/* Left side - Organization switcher */}
            <div className="flex items-center gap-3">
              {/* Mobile sidebar trigger */}
              <div className="md:hidden">
                <MobileSidebarTrigger />
              </div>

              {/* Organization switcher with logo */}
              <div className="hidden md:block">
                <OrganizationSwitcher
                  organizations={organizations}
                  currentOrganization={currentOrganization}
                  onOrganizationChange={switchOrganization}
                />
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              {/* Create New Event CTA */}
              {isEventsMode() && (
                <Button
                  onClick={() => setActiveTab("events")}
                  className="bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 font-manrope font-semibold text-sm px-3 sm:px-4 py-2 h-9"
                >
                  <Calendar className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Create New Event</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              )}

              <button
                onClick={() => setShowHelp(true)}
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted font-manrope text-foreground"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <span className="hidden md:inline">Help</span>
              </button>
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted font-manrope text-foreground"
              >
                Exit
              </button>
            </div>
          </div>
        </header>

        {/* Content area with sidebar and main content */}
        <div className="flex-1 flex w-full overflow-hidden">
          {/* Sidebar */}
          <div className="flex-shrink-0">
            <AppSidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedEvent={selectedEvent ? { id: selectedEvent.id, name: selectedEvent.name, event_date: selectedEvent.event_date, event_end_date: selectedEvent.event_end_date, status: selectedEvent.status } : null}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
          
          <main className="flex-1 min-w-0 flex-shrink-0 p-4 md:p-6 overflow-y-auto overflow-x-hidden bg-muted/20 dark:bg-background">
            <div className="w-full" style={{ maxWidth: 'none', margin: '0', padding: '0', width: '100%', minWidth: '100%' }}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-8" style={{ width: '100%', maxWidth: 'none', minWidth: '100%' }}>
                <TabsContent value="overview" className="space-y-6">
                  {isLoadingAnalytics ? (
                    <DashboardSkeleton />
                  ) : isEventsMode() ? (
                    // Events mode content
                    <div className="space-y-6">
                      {/* Overview content for events */}
                      <Card>
                        <CardHeader>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Dashboard Overview
                              </CardTitle>
                              <CardDescription>
                                Welcome to your events dashboard. Create and manage your events below.
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <CustomizeDashboard
                                config={dashboardConfig}
                                onUpdateEnabled={updateWidgetEnabled}
                                onUpdateChartType={updateWidgetChartType}
                                onResetDefaults={resetDashboardDefaults}
                                onSave={saveDashboardConfig}
                                isSaving={isSavingDashboard}
                              />
                              <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 w-full">
                            <Card className="gradient-card hover-scale animate-in fade-in-0 border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="font-manrope font-semibold text-sm text-foreground">Total Events</CardTitle>
                                <Calendar className="h-5 w-5 text-blue-600" />
                              </CardHeader>
                              <CardContent>
                                <div>
                                  <div className="font-manrope font-bold text-3xl text-foreground tabular-nums mb-1">{events.length}</div>
                                  <p className="font-manrope text-xs text-muted-foreground">Active events</p>
                                </div>
                              </CardContent>
                            </Card>

                            {canAccessAnalytics() && (
                              <>
                                <Card className="gradient-card hover-scale animate-in fade-in-0 border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl" style={{ animationDelay: '100ms' }}>
                                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                    <CardTitle className="font-manrope font-semibold text-sm text-foreground">Tickets Sold</CardTitle>
                                    <Ticket className="h-5 w-5 text-blue-600" />
                                  </CardHeader>
                                  <CardContent>
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <div className="font-manrope font-bold text-3xl text-foreground tabular-nums mb-1">{analytics.totalOrders}</div>
                                        <p className="font-manrope text-xs text-muted-foreground">Total orders</p>
                                        <TrendIndicator value={analytics.trends.orders} period={`vs prev ${timeRange}`} />
                                      </div>
                                      <MiniSparkline data={[{value: 45}, {value: 52}, {value: 48}, {value: 65}, {value: 58}, {value: 70}, {value: analytics.totalOrders}]} color="#3b82f6" />
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card className="gradient-card hover-scale animate-in fade-in-0 border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl" style={{ animationDelay: '200ms' }}>
                                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                    <CardTitle className="font-manrope font-semibold text-sm text-foreground">Revenue</CardTitle>
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                  </CardHeader>
                                  <CardContent>
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <div className="font-manrope font-bold text-3xl text-foreground tabular-nums mb-1">${analytics.totalRevenue.toFixed(2)}</div>
                                        <p className="font-manrope text-xs text-muted-foreground">Total revenue</p>
                                        <TrendIndicator value={analytics.trends.revenue} period={`vs prev ${timeRange}`} />
                                      </div>
                                      <MiniSparkline data={[{value: analytics.totalRevenue * 0.7}, {value: analytics.totalRevenue * 0.75}, {value: analytics.totalRevenue * 0.8}, {value: analytics.totalRevenue * 0.85}, {value: analytics.totalRevenue * 0.9}, {value: analytics.totalRevenue * 0.95}, {value: analytics.totalRevenue}]} color="#10b981" />
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card className="gradient-card hover-scale animate-in fade-in-0 border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl" style={{ animationDelay: '300ms' }}>
                                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                    <CardTitle className="font-manrope font-semibold text-sm text-foreground">Avg Order Value</CardTitle>
                                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                                  </CardHeader>
                                  <CardContent>
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <div className="font-manrope font-bold text-3xl text-foreground tabular-nums mb-1">
                                          ${analytics.totalOrders > 0 ? (analytics.totalRevenue / analytics.totalOrders).toFixed(2) : '0.00'}
                                        </div>
                                        <p className="font-manrope text-xs text-muted-foreground">Per order</p>
                                      </div>
                                      <MiniSparkline data={[{value: 42}, {value: 48}, {value: 45}, {value: 52}, {value: 49}, {value: 55}, {value: analytics.totalOrders > 0 ? analytics.totalRevenue / analytics.totalOrders : 0}]} color="#8b5cf6" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </>
                            )}
                          </div>


                        </CardContent>
                      </Card>

                      {/* Contextual Alert Cards - Actionable Insights */}
                      {canAccessAnalytics() && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {/* Outstanding Invoices Alert */}
                          {groupAnalytics.outstandingInvoices.length > 0 && (
                            <Card className="border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/5 rounded-2xl">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2 text-orange-900 dark:text-orange-100">
                                  <FileText className="h-4 w-4 text-orange-500" />
                                  Pending Invoices
                                </CardTitle>
                                <CardDescription className="text-xs text-orange-800 dark:text-orange-200/80">
                                  {groupAnalytics.outstandingInvoices.length} invoice{groupAnalytics.outstandingInvoices.length > 1 ? 's' : ''} • ${groupAnalytics.outstandingInvoices.reduce((sum, inv) => sum + inv.amountOwed, 0).toLocaleString()}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <Button variant="outline" size="sm" className="border-orange-300 text-orange-800 hover:bg-orange-100 dark:border-orange-400 dark:text-orange-100 dark:hover:bg-orange-500/10" onClick={() => setActiveTab("groups")}>
                                  Review invoices
                                </Button>
                              </CardContent>
                            </Card>
                          )}

                          {/* Events Near Capacity Alert */}
                          {events.filter(e => e.capacity > 0 && (e.tickets_sold / e.capacity) >= 0.85).length > 0 && (
                            <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/5 rounded-2xl">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                  Events Selling Well
                                </CardTitle>
                                <CardDescription className="text-xs text-emerald-800 dark:text-emerald-200/80">
                                  {events.filter(e => e.capacity > 0 && (e.tickets_sold / e.capacity) >= 0.85).length} event{events.filter(e => e.capacity > 0 && (e.tickets_sold / e.capacity) >= 0.85).length > 1 ? 's' : ''} at 85%+ capacity
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0 text-sm text-emerald-900 dark:text-emerald-100">
                                Consider adding more dates or increasing capacity.
                              </CardContent>
                            </Card>
                          )}

                          {/* Revenue Trend Alert */}
                          {analytics.trends.revenue !== 0 && (
                            <Card className={`rounded-2xl ${analytics.trends.revenue > 0
                              ? 'border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/5'
                              : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5'}`}>
                              <CardHeader className="pb-2">
                                <CardTitle className={`text-sm flex items-center gap-2 ${analytics.trends.revenue > 0 ? 'text-blue-900 dark:text-blue-100' : 'text-amber-900 dark:text-amber-100'}`}>
                                  <BarChart3 className={`h-4 w-4 ${analytics.trends.revenue > 0 ? 'text-blue-500' : 'text-amber-500'}`} />
                                  Revenue {analytics.trends.revenue > 0 ? 'Growing' : 'Trend'}
                                </CardTitle>
                                <CardDescription className={`text-xs ${analytics.trends.revenue > 0 ? 'text-blue-800 dark:text-blue-200/80' : 'text-amber-800 dark:text-amber-200/80'}`}>
                                  {analytics.trends.revenue > 0 ? '+' : ''}{analytics.trends.revenue}% vs previous {timeRange}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className={`pt-0 text-sm ${analytics.trends.revenue > 0 ? 'text-blue-900 dark:text-blue-100' : 'text-amber-900 dark:text-amber-100'}`}>
                                {analytics.trends.revenue > 0
                                  ? 'Great momentum! Keep up the marketing efforts.'
                                  : 'Consider boosting promotions or reviewing pricing.'}
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}

                      {/* Customizable Dashboard Widgets */}
                      {canAccessAnalytics() && (
                        <>
                          <DashboardWidgets
                            enabledWidgets={enabledWidgets}
                            onReorder={(fromIndex, toIndex) => {
                              reorderWidgets(fromIndex, toIndex);
                              // Auto-save after reorder
                              setTimeout(() => saveDashboardConfig(), 100);
                            }}
                            totalRevenue={analytics.totalRevenue}
                            totalTickets={analytics.totalOrders}
                            totalOrders={analytics.totalOrders}
                            avgOrderValue={analytics.totalOrders > 0 ? analytics.totalRevenue / analytics.totalOrders : 0}
                            avgOrderByEvent={(() => {
                              // Calculate average order value per event
                              const eventOrderData = new Map<string, { total: number; count: number }>();
                              orderData.forEach(order => {
                                const eventName = order.events?.name || 'Unknown Event';
                                const current = eventOrderData.get(eventName) || { total: 0, count: 0 };
                                eventOrderData.set(eventName, {
                                  total: current.total + (Number(order.total_amount) || 0),
                                  count: current.count + 1
                                });
                              });
                              return Array.from(eventOrderData.entries())
                                .map(([name, data]) => ({
                                  name,
                                  avgValue: data.count > 0 ? data.total / data.count : 0,
                                  orderCount: data.count
                                }))
                                .sort((a, b) => b.avgValue - a.avgValue);
                            })()}
                            checkinRate={0} // TODO: Calculate from ticket check-ins
                            revenueByEvent={analyticsData.eventTypesData.map(e => ({ name: e.name, revenue: e.value }))}
                            revenueOverTime={analyticsData.revenueTimeSeries}
                            weeklyRevenue={analyticsData.revenueData}
                            ticketsByType={widgetAnalytics.ticketsByType}
                            ordersOverTime={analyticsData.salesData.map(d => ({ date: d.month, orders: d.tickets || 0 }))}
                            deviceBreakdown={widgetAnalytics.deviceBreakdown}
                            visitorLocations={widgetAnalytics.visitorLocations}
                            conversionFunnel={widgetAnalytics.conversionFunnel}
                            upcomingEvents={events
                              .filter(e => new Date(e.event_date) > new Date())
                              .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
                              .slice(0, 5)
                              .map(e => ({
                                id: e.id,
                                name: e.name,
                                date: e.event_date,
                                ticketsSold: e.tickets_sold,
                                capacity: e.capacity
                              }))}
                            eventCapacity={events.slice(0, 5).map(e => ({
                              name: e.name,
                              sold: e.tickets_sold,
                              capacity: e.capacity
                            }))}
                            groupSalesByGroup={groupAnalytics.groupSalesByGroup}
                            outstandingInvoices={groupAnalytics.outstandingInvoices}
                            isLoading={isLoadingAnalytics || isLoadingDashboardConfig}
                            timeRange={timeRange}
                            // Insights widget props
                            revenueGoal={revenueGoal}
                            revenueTrend={analytics.trends.revenue}
                            liveActivities={liveActivities}
                            salesHeatmapData={salesHeatmapData}
                            aiInsights={aiInsights}
                            quickActions={quickActions}
                            onRefreshActivities={() => currentOrganization && loadAnalytics(currentOrganization.id, timeRange)}
                            onDismissInsight={(id) => setAIInsights(prev => prev.filter(i => i.id !== id))}
                          />

                          {/* Recent Sales Card */}
                          <RecentSalesCard
                            sales={orderData
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .slice(0, 5)
                              .map(order => ({
                                id: order.id,
                                event_name: order.events?.name || 'Unknown Event',
                                customer_name: order.customer_name || 'Unknown Customer',
                                customer_email: order.customer_email || '',
                                total_amount: Number(order.total_amount) || 0,
                                created_at: order.created_at,
                                ticket_count: order.order_items?.reduce((sum: number, item: any) =>
                                  item.item_type === 'ticket' ? sum + (item.quantity || 0) : sum, 0) || 0
                              }))}
                            isLoading={isLoadingAnalytics}
                            timeRange={timeRange}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    // Attractions mode content
                    <div className="space-y-6">
                      {/* Dashboard Controls for Attractions */}
                      <div className="flex justify-end gap-2">
                        <CustomizeAttractionsDashboard
                          config={attractionDashboardConfig}
                          onUpdateEnabled={updateAttractionWidgetEnabled}
                          onUpdateChartType={updateAttractionWidgetChartType}
                          onResetDefaults={resetAttractionDashboardDefaults}
                          onSave={saveAttractionDashboardConfig}
                          isSaving={isSavingAttractionDashboard}
                        />
                        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 w-full">
                    <Card className="gradient-card hover-scale animate-in fade-in-0 border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="font-manrope font-semibold text-sm text-foreground">Total Attractions</CardTitle>
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div>
                          <div className="font-manrope font-bold text-3xl text-foreground tabular-nums mb-1">{attractions.length}</div>
                          <p className="font-manrope text-xs text-muted-foreground">Active attractions</p>
                        </div>
                      </CardContent>
                    </Card>

                    {canAccessAnalytics() && (
                      <>
                        <Card className="gradient-card hover-scale animate-in fade-in-0 border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl" style={{ animationDelay: '100ms' }}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="font-manrope font-semibold text-sm text-foreground">Bookings</CardTitle>
                        <Ticket className="h-5 w-5 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-manrope font-bold text-3xl text-foreground tabular-nums mb-1">{analytics.totalOrders}</div>
                            <p className="font-manrope text-xs text-muted-foreground">Total bookings</p>
                            <TrendIndicator value={analytics.trends.orders} period={`vs prev ${timeRange}`} />
                          </div>
                          <MiniSparkline data={[{value: 30}, {value: 35}, {value: 32}, {value: 42}, {value: 38}, {value: 45}, {value: analytics.totalOrders}]} color="#3b82f6" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="gradient-card hover-scale animate-in fade-in-0 border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl" style={{ animationDelay: '200ms' }}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="font-manrope font-semibold text-sm text-foreground">Revenue</CardTitle>
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-manrope font-bold text-3xl text-foreground tabular-nums mb-1">${analytics.totalRevenue.toFixed(2)}</div>
                            <p className="font-manrope text-xs text-muted-foreground">Total revenue</p>
                            <TrendIndicator value={analytics.trends.revenue} period={`vs prev ${timeRange}`} />
                          </div>
                          <MiniSparkline data={[{value: analytics.totalRevenue * 0.65}, {value: analytics.totalRevenue * 0.72}, {value: analytics.totalRevenue * 0.78}, {value: analytics.totalRevenue * 0.85}, {value: analytics.totalRevenue * 0.91}, {value: analytics.totalRevenue * 0.96}, {value: analytics.totalRevenue}]} color="#10b981" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="gradient-card hover-scale animate-in fade-in-0 border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl" style={{ animationDelay: '300ms' }}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="font-manrope font-semibold text-sm text-foreground">Platform Fees</CardTitle>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div>
                          <div className="font-manrope font-bold text-3xl text-foreground tabular-nums mb-1">${analytics.estimatedPlatformFees.toFixed(2)}</div>
                          <p className="font-manrope text-xs text-muted-foreground">Estimated fees</p>
                        </div>
                      </CardContent>
                    </Card>
                      </>
                    )}
                  </div>

                  {/* Attraction Dashboard Widgets */}
                  {canAccessAnalytics() && (
                    <AttractionsDashboardWidgets
                      enabledWidgets={attractionEnabledWidgets}
                      onReorder={(fromIndex, toIndex) => {
                        reorderAttractionWidgets(fromIndex, toIndex);
                        setTimeout(() => saveAttractionDashboardConfig(), 100);
                      }}
                      totalRevenue={analytics.totalRevenue}
                      totalBookings={attractionWidgetData.totalBookings}
                      totalGuests={attractionWidgetData.totalGuests}
                      avgBookingValue={attractionWidgetData.avgBookingValue}
                      checkinRate={attractionWidgetData.checkinRate}
                      revenueByAttraction={attractionWidgetData.revenueByAttraction}
                      revenueOverTime={attractionWidgetData.revenueOverTime}
                      weeklyRevenue={attractionWidgetData.weeklyRevenue}
                      bookingsOverTime={attractionWidgetData.bookingsOverTime}
                      bookingsByAttraction={attractionWidgetData.bookingsByAttraction}
                      partySizeDistribution={attractionWidgetData.partySizeDistribution}
                      capacityUtilization={attractionWidgetData.capacityUtilization}
                      popularTimeSlots={attractionWidgetData.popularTimeSlots}
                      isLoading={isLoadingAnalytics || isLoadingAttractionDashboardConfig}
                      timeRange={timeRange}
                      revenueTrend={attractionWidgetData.revenueTrend}
                      bookingsTrend={attractionWidgetData.bookingsTrend}
                    />
                  )}

                  <Card className="border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-manrope font-semibold text-lg text-foreground">Recent Attractions</CardTitle>
                      <CardDescription className="font-manrope text-sm text-muted-foreground">Your latest attraction performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {events.map((event) => (
                          <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-border rounded-xl hover:bg-muted/50 transition-colors gap-3">
                            <div className="space-y-1 flex-1">
                              <h3 className="font-manrope font-medium text-sm text-foreground">{event.name}</h3>
                              <p className="font-manrope text-xs text-muted-foreground">
                                {formatEventDateRange(event.event_date, event.event_end_date, { dateStyle: 'medium' })}
                                {event.venue ? ` • ${event.venue}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                              <div className="text-left sm:text-right">
                                <p className="font-manrope font-medium text-xs text-foreground tabular-nums">{event.tickets_sold}/{event.capacity} tickets</p>
                                <p className="font-manrope text-xs text-muted-foreground tabular-nums">${event.revenue}</p>
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
                    <Card className="border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-manrope font-semibold text-lg text-foreground">Your Events</CardTitle>
                        <CardDescription className="font-manrope text-sm text-muted-foreground">Manage your existing events</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {events.length === 0 ? (
                          <p className="font-manrope text-muted-foreground text-center py-8">No events created yet. Create your first event below!</p>
                        ) : (
                          <div className="space-y-3 w-full">
                            {events.map((event) => (
                              <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors gap-4 w-full" style={{ width: '100%' }}>
                                <div className="space-y-2 flex-1">
                                  <h3 className="font-manrope font-semibold text-base text-foreground">{event.name}</h3>
                                  <p className="font-manrope text-sm text-muted-foreground">
                                    {formatEventDateRange(event.event_date, event.event_end_date, { dateStyle: 'medium' })}
                                    {event.venue ? ` • ${event.venue}` : ''}
                                  </p>
                                  <Badge 
                                    variant={event.status === "published" ? "default" : "secondary"} 
                                    className="w-fit font-manrope font-medium text-sm"
                                  >
                                    {event.status}
                                  </Badge>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                  <Button
                                    variant="outline"
                                    size="default"
                                    onClick={() => {
                                      setSelectedEvent(event);
                                      setActiveTab("event-details");
                                    }}
                                    className="font-manrope font-medium text-sm w-full sm:w-auto"
                                  >
                                    <Users className="h-4 w-4 mr-2" />
                                    Manage
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="default"
                                    onClick={() => window.open(`/widget/${event.id}`, '_blank')}
                                    className="font-manrope font-medium text-sm w-full sm:w-auto"
                                  >
                                    <Monitor className="h-4 w-4 mr-2" />
                                    Widget
                                  </Button>
                                  {event.status === 'published' && (
                                    <Button
                                      variant="outline"
                                      size="default"
                                      onClick={() => window.open(`/ticketflolive/${event.id}`, '_blank')}
                                      className="font-manrope font-medium text-sm w-full sm:w-auto"
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

                    <Card className="border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-manrope font-semibold text-lg text-foreground">Create New Event</CardTitle>
                        <CardDescription className="font-manrope text-sm text-muted-foreground">Start selling tickets for your next event</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
                          <div className="space-y-2">
                            <Label htmlFor="event-name" className="font-manrope font-medium text-sm text-foreground">Event Name *</Label>
                            <Input
                              id="event-name"
                              value={eventForm.name}
                              onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter event name"
                              className="font-manrope text-sm"
                            />
                          </div>
                          <div>
                            <DateTimePicker
                              id="event-date"
                              label="Start Date & Time *"
                              value={eventForm.date}
                              onChange={(date) => setEventForm(prev => ({ ...prev, date }))}
                              placeholder="Select event start date and time"
                            />
                          </div>
                          <div>
                            <DateTimePicker
                              id="event-end-date"
                              label="End Date & Time (optional)"
                              value={eventForm.endDate || null}
                              onChange={(date) => setEventForm(prev => ({ ...prev, endDate: date || "" }))}
                              placeholder="Select event end date and time"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="event-venue" className="font-manrope font-medium text-sm text-foreground">Venue *</Label>
                            <Input
                              id="event-venue"
                              value={eventForm.venue}
                              onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                              placeholder="Enter venue name"
                              className="font-manrope text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="event-capacity" className="font-manrope font-medium text-sm text-foreground">Capacity *</Label>
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
                          <Label htmlFor="event-description" className="font-manrope font-medium text-sm text-foreground">Description</Label>
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

                    {/* Event Templates - Collapsible */}
                    <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen}>
                      <Card className={`border-border shadow-sm hover:shadow-md transition-all rounded-2xl ${!templatesOpen ? 'border-dashed border-2 hover:border-primary/50' : ''}`}>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-2xl select-none">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${templatesOpen ? 'bg-primary/10' : 'bg-muted'}`}>
                                  <FileText className={`h-5 w-5 ${templatesOpen ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                  <CardTitle className="font-manrope font-semibold text-lg text-foreground">Event Templates</CardTitle>
                                  <CardDescription className="font-manrope text-sm text-muted-foreground">
                                    {templatesOpen ? 'Save and reuse event configurations' : 'Click to expand and manage templates'}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className={`p-2 rounded-full transition-colors ${templatesOpen ? 'bg-primary/10' : 'bg-muted hover:bg-muted/80'}`}>
                                {templatesOpen ? (
                                  <ChevronUp className="h-5 w-5 text-primary" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <EventTemplatesManager organizationId={currentOrganization?.id || ''} />
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </TabsContent>
                ) : (
                  <TabsContent value="events" className="space-y-6">
                    <AttractionManagement 
                      organizationId={currentOrganization?.id || ''}
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
                        <EventCustomization
                          eventId={selectedEvent.id}
                          initialTab={eventCustomizationTab}
                          initialSubTab={eventCustomizationSubTab}
                        />
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
                        <AttractionEditorV3 attractionId={selectedAttraction.id} />
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
                  <PaymentConfiguration organizationId={currentOrganization?.id || ''} />
                </TabsContent>

                <TabsContent value="marketing" className="space-y-6">
                  <MarketingTools selectedEvent={selectedEvent ? { id: selectedEvent.id, name: selectedEvent.name, status: selectedEvent.status, event_date: selectedEvent.event_date, event_end_date: selectedEvent.event_end_date, description: undefined } : undefined} />
                </TabsContent>

                {canAccessBilling() && (
                  <TabsContent value="billing" className="space-y-6">
                    <BillingDashboard organizationId={currentOrganization?.id || ''} isLoading={false} />
                  </TabsContent>
                )}

                {canAccessUsers() && (
                  <TabsContent value="users" className="space-y-6">
                    <OrganizationUserManagement
                      organizationId={currentOrganization?.id || ''}
                      organizationName={currentOrganization?.name || 'Organization'}
                      currentUserRole={currentOrganization?.role || undefined}
                    />
                  </TabsContent>
                )}

                {canAccessGroups() && (
                  <TabsContent value="groups" className="space-y-6">
                    <GroupsManagement />
                  </TabsContent>
                )}

                {canAccessCRM() && (
                  <TabsContent value="customers" className="space-y-6">
                    <CustomersCRM />
                  </TabsContent>
                )}

                {canAccessIssuing() && (
                  <TabsContent value="issuing" className="space-y-6">
                    <IssuingPage />
                  </TabsContent>
                )}

                {canAccessPlaybooks() && (
                  <TabsContent value="playbooks" className="space-y-6">
                    <Playbooks />
                  </TabsContent>
                )}

                {/* Membership management is now in Customers page */}

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
                        <XeroIntegration organizationId={currentOrganization?.id || ''} />
                      </div>
                    ) : selectedIntegration === 'hubspot' ? (
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
                        <HubSpotIntegration organizationId={currentOrganization?.id || ''} />
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
                                  <div className="w-12 h-12 rounded-lg border border-border bg-background flex items-center justify-center p-1">
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
                          <Card className={`hover:shadow-lg transition-shadow duration-200 flex flex-col ${hubspotConnected ? 'ring-2 ring-green-500/50' : ''}`}>
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
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="secondary" className="text-xs">
                                        CRM
                                      </Badge>
                                      {hubspotConnected && (
                                        <Badge variant="default" className="text-xs bg-green-500">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Connected
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                              <CardDescription className="mb-4">
                                Sync your customer data and event attendees with HubSpot CRM for powerful marketing automation.
                              </CardDescription>
                              <Button
                                className="w-full"
                                variant={hubspotConnected ? "outline" : "default"}
                                onClick={() => setSelectedIntegration('hubspot')}
                              >
                                {hubspotConnected ? (
                                  <><CheckCircle className="h-4 w-4 mr-2" /> Manage Integration</>
                                ) : (
                                  <><ExternalLink className="h-4 w-4 mr-2" /> Connect to HubSpot</>
                                )}
                              </Button>
                            </CardContent>
                          </Card>

                          {/* Zapier Integration */}
                          <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg border border-border bg-background flex items-center justify-center p-1">
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
                                  <div className="w-12 h-12 rounded-lg border border-border bg-background flex items-center justify-center p-1">
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
                                  <div className="w-12 h-12 rounded-lg border border-border bg-background flex items-center justify-center p-1">
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
                                  <div className="w-12 h-12 rounded-lg border border-border bg-background flex items-center justify-center p-1">
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
              <AIChatbot context={{ organizationId: currentOrganization?.id }} />

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
      </div>

      {/* Help Modal */}
      <DashboardHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showOnboardingWizard}
        onClose={() => setShowOnboardingWizard(false)}
        onComplete={() => {
          refreshOnboardingState();
          if (currentOrganization?.id) {
            loadEvents(currentOrganization.id);
          }
        }}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      {/* Floating Onboarding Widget - shows when wizard is closed but onboarding not complete */}
      {shouldShowWizard && !showOnboardingWizard && isEventsMode() && (
        <FloatingOnboardingWidget
          checklistItems={checklistItems}
          organizationId={currentOrganization?.id}
          onNavigate={(tab) => setActiveTab(tab)}
          onOpenWizard={() => setShowOnboardingWizard(true)}
        />
      )}
    </SidebarProvider>
  );
};

export default OrgDashboard;