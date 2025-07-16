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
import AttendeeManagement from "@/components/AttendeeManagement";
import { Calendar, Users, Ticket, Settings, BarChart3, Mail, Palette, Globe, Plus, Edit, Trash2, CreditCard, Sparkles, MessageSquare, Bell, Monitor, LogOut, X, Link } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OrgDashboard = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "windcave">("stripe");
  const [testMode, setTestMode] = useState<boolean>(true);
  const [testModeAnalytics, setTestModeAnalytics] = useState({
    totalEvents: 0,
    totalOrders: 0,
    totalRevenue: 0,
    estimatedPlatformFees: 0
  });
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

  const handleSaveStripeKey = async () => {
    if (!organizationId || !stripeSecretKey) return;

    try {
      const { error } = await supabase
        .from("organizations")
        .update({ 
          stripe_account_id: stripeSecretKey,
          stripe_onboarding_complete: true 
        })
        .eq("id", organizationId);

      if (error) {
        console.error("Error saving Stripe key:", error);
        toast({
          title: "Error",
          description: "Failed to save Stripe key",
          variant: "destructive"
        });
        return;
      }

      setStripeConnected(true);
      setStripeOnboardingComplete(true);
      
      toast({
        title: "Success",
        description: "Stripe account connected successfully!",
      });
    } catch (error) {
      console.error("Error saving Stripe key:", error);
      toast({
        title: "Error",
        description: "Failed to connect Stripe account",
        variant: "destructive"
      });
    }
  };

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

  const handleStripeConnect = async () => {
    try {
      console.log("Starting Stripe Connect process...");
      console.log("Organization ID:", organizationId);
      
      if (!organizationId) {
        toast({
          title: "Error",
          description: "No organization found. Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }

      console.log("Calling create-connect-account function...");
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { organizationId }
      });

      console.log("Function response:", { data, error });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      if (!data?.url) {
        throw new Error("No URL returned from Stripe Connect");
      }

      console.log("Opening Stripe Connect URL:", data.url);
      window.open(data.url, "_blank");
      
      toast({
        title: "Stripe Connect",
        description: "Complete your Stripe setup in the new window."
      });
    } catch (error) {
      console.error("Stripe Connect error:", error);
      
      const errorMessage = error?.message || error?.details || "Failed to connect Stripe account";
      
      toast({
        title: "Error",
        description: `Stripe Connect failed: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  const checkStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-connect-status", {
        body: { organizationId }
      });

      if (error) throw error;

      setStripeConnected(data.connected);
      setStripeOnboardingComplete(data.onboarding_complete);
      
      if (data.onboarding_complete) {
        toast({
          title: "Success",
          description: "Stripe account is fully connected!"
        });
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error);
    }
  };

  const handleWindcaveConfig = async () => {
    try {
      if (!organizationId) {
        toast({
          title: "Error",
          description: "No organization found. Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }

      if (!windcaveConfig.username || !windcaveConfig.apiKey) {
        toast({
          title: "Error",
          description: "Please provide both Windcave username and API key.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from("organizations")
        .update({
          windcave_username: windcaveConfig.username,
          windcave_api_key: windcaveConfig.apiKey,
          windcave_endpoint: windcaveConfig.endpoint,
          windcave_enabled: true,
          payment_provider: "windcave",
          apple_pay_merchant_id: windcaveConfig.applePayMerchantId,
          windcave_hit_username: windcaveConfig.hitUsername,
          windcave_hit_key: windcaveConfig.hitKey,
          windcave_station_id: windcaveConfig.stationId,
          currency: windcaveConfig.currency
        })
        .eq("id", organizationId);

      if (error) throw error;

      setPaymentProvider("windcave");
      setWindcaveConfig(prev => ({ ...prev, enabled: true }));

      toast({
        title: "Success",
        description: "Windcave configuration saved successfully!"
      });
    } catch (error) {
      console.error("Error saving Windcave config:", error);
      toast({
        title: "Error",
        description: "Failed to save Windcave configuration",
        variant: "destructive"
      });
    }
  };

  const handlePaymentProviderChange = async (provider: "stripe" | "windcave") => {
    try {
      if (!organizationId) return;

      const { error } = await supabase
        .from("organizations")
        .update({ payment_provider: provider })
        .eq("id", organizationId);

      if (error) throw error;

      setPaymentProvider(provider);
      toast({
        title: "Success",
        description: `Payment provider switched to ${provider === "stripe" ? "Stripe" : "Windcave"}`
      });
    } catch (error) {
      console.error("Error switching payment provider:", error);
      toast({
        title: "Error",
        description: "Failed to switch payment provider",
        variant: "destructive"
      });
    }
  };

  const handleCreateEvent = async () => {
    setIsCreatingEvent(true);
    
    try {
      // Check if organization is loaded
      if (!organizationId) {
        toast({
          title: "Error",
          description: "Organization not loaded. Please refresh the page.",
          variant: "destructive"
        });
        return;
      }

      if (!eventForm.name || !eventForm.date || !eventForm.venue || !eventForm.capacity) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      console.log("Creating event with data:", {
        name: eventForm.name,
        event_date: eventForm.date,
        venue: eventForm.venue,
        capacity: parseInt(eventForm.capacity),
        description: eventForm.description,
        organization_id: organizationId,
        status: "draft"
      });

      const { data, error } = await supabase
        .from("events")
        .insert([
          {
            name: eventForm.name,
            event_date: eventForm.date,
            venue: eventForm.venue,
            capacity: parseInt(eventForm.capacity),
            description: eventForm.description || null,
            organization_id: organizationId,
            test_mode: testMode,
            status: "draft"
          }
        ])
        .select()
        .single();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Event created successfully:", data);

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

      // Reload events to get the updated list
      if (organizationId) {
        loadEvents(organizationId);
      }

    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: `Failed to create event: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handlePublishEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "published" })
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event published successfully! Others can now access the widget."
      });

      // Reload events to update the UI
      if (organizationId) {
        loadEvents(organizationId);
      }
    } catch (error) {
      console.error("Error publishing event:", error);
      toast({
        title: "Error",
        description: "Failed to publish event",
        variant: "destructive"
      });
    }
  };

  const handleUnpublishEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "draft" })
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event unpublished successfully! Widget is now private."
      });

      // Reload events to update the UI
      if (organizationId) {
        loadEvents(organizationId);
      }
    } catch (error) {
      console.error("Error unpublishing event:", error);
      toast({
        title: "Error",
        description: "Failed to unpublish event",
        variant: "destructive"
      });
    }
  };

  const copyWidgetUrl = (eventId: string) => {
    const widgetUrl = `${window.location.origin}/widget/${eventId}`;
    navigator.clipboard.writeText(widgetUrl);
    toast({
      title: "Success",
      description: "Widget URL copied to clipboard!"
    });
  };

  const handleCreateEventClick = () => {
    setActiveTab("events");
  };

  const handleCreateTicketType = async () => {
    if (!selectedEvent) {
      toast({
        title: "Error",
        description: "No event selected",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingTicketType(true);
    
    try {
      if (!ticketTypeForm.name || !ticketTypeForm.price || !ticketTypeForm.quantity) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from("ticket_types")
        .insert([
          {
            event_id: selectedEvent.id,
            name: ticketTypeForm.name,
            description: ticketTypeForm.description || null,
            price: parseFloat(ticketTypeForm.price),
            quantity_available: parseInt(ticketTypeForm.quantity),
            sale_start_date: ticketTypeForm.saleStartDate || null,
            sale_end_date: ticketTypeForm.saleEndDate || null
          }
        ])
        .select()
        .single();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Ticket type created successfully!"
      });

      // Reset form
      setTicketTypeForm({
        name: "",
        description: "",
        price: "",
        quantity: "",
        saleStartDate: "",
        saleEndDate: ""
      });

      // Reload ticket types
      loadTicketTypes(selectedEvent.id);

    } catch (error) {
      console.error("Error creating ticket type:", error);
      toast({
        title: "Error",
        description: `Failed to create ticket type: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsCreatingTicketType(false);
    }
  };

  const handleEditTicketType = (ticketType: any) => {
    setEditingTicketType(ticketType);
    setEditTicketTypeForm({
      name: ticketType.name,
      description: ticketType.description || "",
      price: ticketType.price.toString(),
      quantity: ticketType.quantity_available.toString(),
      saleStartDate: ticketType.sale_start_date || "",
      saleEndDate: ticketType.sale_end_date || ""
    });
  };

  const handleUpdateTicketType = async () => {
    if (!editingTicketType) return;

    setIsUpdatingTicketType(true);
    
    try {
      if (!editTicketTypeForm.name || !editTicketTypeForm.price || !editTicketTypeForm.quantity) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from("ticket_types")
        .update({
          name: editTicketTypeForm.name,
          description: editTicketTypeForm.description || null,
          price: parseFloat(editTicketTypeForm.price),
          quantity_available: parseInt(editTicketTypeForm.quantity),
          sale_start_date: editTicketTypeForm.saleStartDate || null,
          sale_end_date: editTicketTypeForm.saleEndDate || null
        })
        .eq("id", editingTicketType.id);

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Ticket type updated successfully!"
      });

      // Reset form and close dialog
      setEditingTicketType(null);
      setEditTicketTypeForm({
        name: "",
        description: "",
        price: "",
        quantity: "",
        saleStartDate: "",
        saleEndDate: ""
      });

      // Reload ticket types
      if (selectedEvent) {
        loadTicketTypes(selectedEvent.id);
      }

    } catch (error) {
      console.error("Error updating ticket type:", error);
      toast({
        title: "Error",
        description: `Failed to update ticket type: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingTicketType(false);
    }
  };

  const handleEditTicketTypeFormChange = (field: string, value: string) => {
    setEditTicketTypeForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTicketTypeFormChange = (field: string, value: string) => {
    setTicketTypeForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEventFormChange = (field: string, value: string) => {
    setEventForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out."
      });
      
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Organization Dashboard
              </h1>
              <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">Manage your events and ticketing platform</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button onClick={handleCreateEventClick} className="gradient-primary hover-scale flex-1 sm:flex-none" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Create Event</span>
                <span className="sm:hidden">Create</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="flex items-center gap-2 flex-1 sm:flex-none"
                size="sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-8">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-4 md:grid-cols-9 h-auto p-1 bg-muted rounded-lg">
              <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-xs md:text-sm">
                <BarChart3 className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-xs md:text-sm">
                <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline md:inline">Events</span>
              </TabsTrigger>
              <TabsTrigger value="event-details" className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-xs md:text-sm" disabled={!selectedEvent}>
                <Users className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">Details</span>
              </TabsTrigger>
              <TabsTrigger value="ai-tools" className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-xs md:text-sm">
                <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline md:inline">AI</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-xs md:text-sm">
                <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="design" className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-xs md:text-sm">
                <Palette className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">Design</span>
              </TabsTrigger>
              <TabsTrigger value="marketing" className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-xs md:text-sm">
                <Mail className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">Marketing</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-xs md:text-sm">
                <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-xs md:text-sm">
                <Link className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">Apps</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-xs md:text-sm">
                <Settings className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <div className="text-2xl font-bold">1,445</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card className="gradient-card hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$72,250</div>
                  <p className="text-xs text-muted-foreground">+8% from last month</p>
                </CardContent>
              </Card>

              <Card className="gradient-card hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">68%</div>
                  <p className="text-xs text-muted-foreground">+5% from last month</p>
                </CardContent>
              </Card>
            </div>

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
                               // Load ticket types when selecting an event
                               loadTicketTypes(event.id);
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

          {/* Event Details Tab */}
          <TabsContent value="event-details" className="space-y-6">
            {selectedEvent ? (
              <Tabs defaultValue="overview" className="space-y-4">
                <div className="overflow-x-auto">
                  <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg">
                    <TabsTrigger value="overview" className="px-3 py-2 text-xs md:text-sm whitespace-nowrap">Overview</TabsTrigger>
                    <TabsTrigger value="tickets" className="px-3 py-2 text-xs md:text-sm whitespace-nowrap">Tickets</TabsTrigger>
                    <TabsTrigger value="customization" className="px-3 py-2 text-xs md:text-sm whitespace-nowrap">Customization</TabsTrigger>
                    <TabsTrigger value="attendees" className="px-3 py-2 text-xs md:text-sm whitespace-nowrap">Attendees</TabsTrigger>
                    <TabsTrigger value="analytics" className="px-3 py-2 text-xs md:text-sm whitespace-nowrap">Analytics</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{selectedEvent.name} - Management</span>
                        <Badge variant={selectedEvent.status === "published" ? "default" : "secondary"}>
                          {selectedEvent.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {selectedEvent.date} • {selectedEvent.venue} • Capacity: {selectedEvent.capacity}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <Globe className="w-5 h-5" />
                          Event Widget
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input 
                            value={`${window.location.origin}/widget/${selectedEvent.id}`} 
                            readOnly 
                            className="font-mono text-sm flex-1"
                          />
                          <Button variant="outline" onClick={() => window.open(`/widget/${selectedEvent.id}`, '_blank')} className="w-full sm:w-auto">
                            View Widget
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="customization">
                  <EventCustomization eventId={selectedEvent.id} />
                </TabsContent>

                <TabsContent value="attendees">
                  <AttendeeManagement eventId={selectedEvent.id} />
                </TabsContent>

                <TabsContent value="tickets">
                  <div className="space-y-6">
                    {/* Create Ticket Type */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Create Ticket Type</CardTitle>
                        <CardDescription>Add new ticket types for your event</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="ticket-name">Ticket Name</Label>
                            <Input 
                              id="ticket-name" 
                              placeholder="e.g., General Admission" 
                              value={ticketTypeForm.name}
                              onChange={(e) => handleTicketTypeFormChange("name", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ticket-price">Price ($)</Label>
                            <Input 
                              id="ticket-price" 
                              type="number" 
                              step="0.01"
                              placeholder="0.00" 
                              value={ticketTypeForm.price}
                              onChange={(e) => handleTicketTypeFormChange("price", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ticket-quantity">Available Quantity</Label>
                            <Input 
                              id="ticket-quantity" 
                              type="number" 
                              placeholder="100" 
                              value={ticketTypeForm.quantity}
                              onChange={(e) => handleTicketTypeFormChange("quantity", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sale-start">Sale Start Date</Label>
                            <Input 
                              id="sale-start" 
                              type="datetime-local" 
                              value={ticketTypeForm.saleStartDate}
                              onChange={(e) => handleTicketTypeFormChange("saleStartDate", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="ticket-description">Description (Optional)</Label>
                            <Textarea 
                              id="ticket-description" 
                              placeholder="Description of this ticket type..." 
                              value={ticketTypeForm.description}
                              onChange={(e) => handleTicketTypeFormChange("description", e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                        <Button 
                          onClick={handleCreateTicketType} 
                          disabled={isCreatingTicketType || !ticketTypeForm.name || !ticketTypeForm.price || !ticketTypeForm.quantity}
                          className="w-full gradient-primary"
                        >
                          {isCreatingTicketType ? "Creating..." : "Create Ticket Type"}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Existing Ticket Types */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Existing Ticket Types</CardTitle>
                        <CardDescription>Manage your current ticket types</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {ticketTypes.length > 0 ? (
                          <div className="space-y-4">
                            {ticketTypes.map((ticketType: any) => (
                              <div key={ticketType.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1 flex-1">
                                  <h3 className="font-medium">{ticketType.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    ${ticketType.price} • {ticketType.quantity_sold}/{ticketType.quantity_available} sold
                                  </p>
                                  {ticketType.description && (
                                    <p className="text-sm text-muted-foreground">{ticketType.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                  <Badge variant={ticketType.quantity_sold < ticketType.quantity_available ? "default" : "secondary"}>
                                    {ticketType.quantity_sold < ticketType.quantity_available ? "Available" : "Sold Out"}
                                  </Badge>
                                  <Button variant="outline" size="sm" onClick={() => handleEditTicketType(ticketType)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No ticket types created yet</p>
                            <p className="text-sm text-muted-foreground">Create your first ticket type above</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Edit Ticket Type Dialog */}
                    <Dialog open={!!editingTicketType} onOpenChange={(open) => !open && setEditingTicketType(null)}>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Edit Ticket Type</DialogTitle>
                          <DialogDescription>
                            Update the details for this ticket type
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-ticket-name">Ticket Name</Label>
                              <Input 
                                id="edit-ticket-name" 
                                placeholder="e.g., General Admission" 
                                value={editTicketTypeForm.name}
                                onChange={(e) => handleEditTicketTypeFormChange("name", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-ticket-price">Price ($)</Label>
                              <Input 
                                id="edit-ticket-price" 
                                type="number" 
                                step="0.01"
                                placeholder="0.00" 
                                value={editTicketTypeForm.price}
                                onChange={(e) => handleEditTicketTypeFormChange("price", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-ticket-quantity">Available Quantity</Label>
                              <Input 
                                id="edit-ticket-quantity" 
                                type="number" 
                                placeholder="100" 
                                value={editTicketTypeForm.quantity}
                                onChange={(e) => handleEditTicketTypeFormChange("quantity", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-sale-start">Sale Start Date</Label>
                              <Input 
                                id="edit-sale-start" 
                                type="datetime-local" 
                                value={editTicketTypeForm.saleStartDate}
                                onChange={(e) => handleEditTicketTypeFormChange("saleStartDate", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="edit-ticket-description">Description (Optional)</Label>
                              <Textarea 
                                id="edit-ticket-description" 
                                placeholder="Description of this ticket type..." 
                                value={editTicketTypeForm.description}
                                onChange={(e) => handleEditTicketTypeFormChange("description", e.target.value)}
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingTicketType(null)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleUpdateTicketType} 
                            disabled={isUpdatingTicketType || !editTicketTypeForm.name || !editTicketTypeForm.price || !editTicketTypeForm.quantity}
                            className="gradient-primary"
                          >
                            {isUpdatingTicketType ? "Updating..." : "Update Ticket Type"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>

                <TabsContent value="analytics">
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Analytics</CardTitle>
                      <CardDescription>View detailed event performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Analytics dashboard will be here</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-muted-foreground">Select an event from the Events tab to manage its details.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Event</CardTitle>
                <CardDescription>Set up your ticketed event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-name">Event Name</Label>
                    <Input 
                      id="event-name" 
                      placeholder="Enter event name" 
                      value={eventForm.name}
                      onChange={(e) => handleEventFormChange("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-date">Event Date</Label>
                    <Input 
                      id="event-date" 
                      type="date" 
                      value={eventForm.date}
                      onChange={(e) => handleEventFormChange("date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue</Label>
                    <Input 
                      id="venue" 
                      placeholder="Event location" 
                      value={eventForm.venue}
                      onChange={(e) => handleEventFormChange("venue", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input 
                      id="capacity" 
                      type="number" 
                      placeholder="Max attendees" 
                      value={eventForm.capacity}
                      onChange={(e) => handleEventFormChange("capacity", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Event description" 
                    rows={3} 
                    value={eventForm.description}
                    onChange={(e) => handleEventFormChange("description", e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCreateEvent} 
                  disabled={isCreatingEvent}
                  className="gradient-primary"
                >
                  {isCreatingEvent ? "Creating..." : "Create Event"}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Events List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Events</CardTitle>
                <CardDescription>Manage and view details for your existing events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No events created yet. Create your first event above!</p>
                  ) : (
                    events.map((event) => (
                       <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4">
                         <div className="space-y-1 flex-1">
                           <h3 className="font-medium">{event.name}</h3>
                           <p className="text-sm text-muted-foreground">{event.date} • {event.venue}</p>
                         </div>
                         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                           <Badge variant={event.status === "published" ? "default" : "secondary"} className="w-fit">
                             {event.status}
                           </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event);
                                setActiveTab("event-details");
                                // Load ticket types when selecting an event
                                loadTicketTypes(event.id);
                              }}
                              className="w-full sm:w-auto"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">Manage Event</span>
                              <span className="sm:hidden">Manage</span>
                            </Button>
                            {event.status === "draft" ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handlePublishEvent(event.id)}
                                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                              >
                                <Globe className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">Publish</span>
                                <span className="sm:hidden">Publish</span>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnpublishEvent(event.id)}
                                className="w-full sm:w-auto"
                              >
                                <Globe className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">Unpublish</span>
                                <span className="sm:hidden">Unpublish</span>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyWidgetUrl(event.id)}
                              className="w-full sm:w-auto"
                            >
                              <Link className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Share</span>
                              <span className="sm:hidden">Share</span>
                            </Button>
                         </div>
                       </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Tools Tab */}
          <TabsContent value="ai-tools" className="space-y-6">
            <AIEventGenerator />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            {/* Payment Provider Selection */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Choose Payment Provider
                </CardTitle>
                <CardDescription>
                  Select which payment gateway to use for processing ticket sales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentProvider === "stripe" 
                        ? "border-primary bg-primary/5" 
                        : "border-muted hover:border-primary/50"
                    }`}
                    onClick={() => handlePaymentProviderChange("stripe")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#635BFF] rounded-lg flex items-center justify-center text-white font-bold">S</div>
                      <div>
                        <h3 className="font-medium">Stripe Connect</h3>
                        <p className="text-sm text-muted-foreground">Global payment processing</p>
                      </div>
                      {paymentProvider === "stripe" && (
                        <Badge className="ml-auto">Active</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentProvider === "windcave" 
                        ? "border-primary bg-primary/5" 
                        : "border-muted hover:border-primary/50"
                    }`}
                    onClick={() => handlePaymentProviderChange("windcave")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00A6FB] rounded-lg flex items-center justify-center text-white font-bold">W</div>
                      <div>
                        <h3 className="font-medium">Windcave</h3>
                        <p className="text-sm text-muted-foreground">ANZ/New Zealand focused</p>
                      </div>
                      {paymentProvider === "windcave" && (
                        <Badge className="ml-auto">Active</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stripe Configuration */}
              {paymentProvider === "stripe" && (
                <Card className="gradient-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Connect Your Stripe Account
                    </CardTitle>
                    <CardDescription>
                      Enter your Stripe API key to start accepting payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                      <h4 className="font-medium text-blue-900">How it works:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Use your existing Stripe account</li>
                        <li>• Payments go directly to your account</li>
                        <li>• Simple API key setup</li>
                        <li>• Full control over your payments</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="stripe-secret-key">Stripe Secret Key</Label>
                        <Input
                          id="stripe-secret-key"
                          type="password"
                          placeholder="sk_live_... or sk_test_..."
                          value={stripeSecretKey}
                          onChange={(e) => setStripeSecretKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Find this in your Stripe Dashboard under Developers → API Keys
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handleSaveStripeKey}
                        disabled={!stripeSecretKey || stripeSecretKey.length < 10}
                        className="w-full gradient-primary"
                      >
                        Connect Stripe Account
                      </Button>
                      
                      {stripeConnected && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-green-900 mb-2">✓ Stripe Account Connected</h4>
                          <p className="text-sm text-green-800">
                            Your Stripe account is connected and ready to process payments.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Windcave Configuration */}
              {paymentProvider === "windcave" && (
                <>
                  <Card className="gradient-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Windcave API Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure your Windcave API credentials for payment processing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-blue-900">About Windcave:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Leading payment processor in ANZ region</li>
                          <li>• Direct bank settlement in NZD/AUD</li>
                          <li>• PCI compliant drop-in payment forms</li>
                          <li>• Support for local payment methods</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="windcave-username">API Username</Label>
                          <Input
                            id="windcave-username"
                            type="text"
                            placeholder="Enter your Windcave API username"
                            value={windcaveConfig.username}
                            onChange={(e) => setWindcaveConfig(prev => ({ ...prev, username: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="windcave-api-key">API Key</Label>
                          <Input
                            id="windcave-api-key"
                            type="password"
                            placeholder="Enter your Windcave API key"
                            value={windcaveConfig.apiKey}
                            onChange={(e) => setWindcaveConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="windcave-endpoint">Environment</Label>
                          <Select
                            value={windcaveConfig.endpoint}
                            onValueChange={(value: "SEC" | "UAT") => 
                              setWindcaveConfig(prev => ({ ...prev, endpoint: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UAT">UAT (Testing)</SelectItem>
                              <SelectItem value="SEC">SEC (Production)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Use UAT for testing, SEC for live transactions
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="apple-pay-merchant-id">Apple Pay Merchant ID (Optional)</Label>
                          <Input
                            id="apple-pay-merchant-id"
                            type="text"
                            placeholder="merchant.com.yourcompany.app"
                            value={windcaveConfig.applePayMerchantId}
                            onChange={(e) => setWindcaveConfig(prev => ({ ...prev, applePayMerchantId: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Required for Apple Pay support. Register your domain at Apple Developer.
                          </p>
                        </div>

                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            HIT Terminal Configuration (Optional)
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Configure Windcave HIT terminal for in-person transactions
                          </p>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="windcave-hit-username">HIT Terminal Username</Label>
                              <Input
                                id="windcave-hit-username"
                                type="text"
                                placeholder="Enter your HIT terminal username"
                                value={windcaveConfig.hitUsername}
                                onChange={(e) => setWindcaveConfig(prev => ({ ...prev, hitUsername: e.target.value }))}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="windcave-hit-key">HIT Terminal Key</Label>
                              <Input
                                id="windcave-hit-key"
                                type="password"
                                placeholder="Enter your HIT terminal key"
                                value={windcaveConfig.hitKey}
                                onChange={(e) => setWindcaveConfig(prev => ({ ...prev, hitKey: e.target.value }))}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="windcave-station-id">Station ID (Device Serial Number)</Label>
                              <Input
                                id="windcave-station-id"
                                type="text"
                                placeholder="Enter the terminal device serial number"
                                value={windcaveConfig.stationId}
                                onChange={(e) => setWindcaveConfig(prev => ({ ...prev, stationId: e.target.value }))}
                              />
                              <p className="text-xs text-muted-foreground">
                                The serial number of your Windcave HIT terminal device
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="windcave-currency">Terminal Currency</Label>
                              <Select
                                value={windcaveConfig.currency}
                                onValueChange={(value) => 
                                  setWindcaveConfig(prev => ({ ...prev, currency: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NZD">New Zealand Dollar (NZD)</SelectItem>
                                  <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                                  <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                  <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Currency that the terminal will process transactions in
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span>Configuration Status</span>
                          <Badge variant={windcaveConfig.enabled ? "default" : "secondary"}>
                            {windcaveConfig.enabled ? "Configured" : "Not Configured"}
                          </Badge>
                        </div>

                        <Button onClick={handleWindcaveConfig} className="w-full gradient-primary">
                          Save Windcave Configuration
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="gradient-card">
                    <CardHeader>
                      <CardTitle>Windcave Payment Processing</CardTitle>
                      <CardDescription>
                        Features and benefits of Windcave integration
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-green-900">Benefits:</h4>
                        <ul className="text-sm text-green-800 space-y-1">
                          <li>• Direct settlement to your bank account</li>
                          <li>• Competitive ANZ region rates</li>
                          <li>• PCI compliant hosted payment pages</li>
                          <li>• Local customer support</li>
                        </ul>
                      </div>

                      {windcaveConfig.enabled && (
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                          <h4 className="font-medium">Current Environment</h4>
                          <p className="text-sm text-muted-foreground">
                            {windcaveConfig.endpoint === "UAT" ? "Testing (UAT)" : "Production (SEC)"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {windcaveConfig.endpoint === "UAT" 
                              ? "Switch to SEC when ready to go live"
                              : "Live environment - real transactions will be processed"
                            }
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <h4 className="font-medium">Supported Payment Methods:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Visa, Mastercard, American Express</li>
                          <li>• Apple Pay, Google Pay</li>
                          <li>• EFTPOS (New Zealand)</li>
                          <li>• Local bank cards</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customize Your Ticketing Page</CardTitle>
                <CardDescription>Brand your ticketing experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary border cursor-pointer"></div>
                        <div className="w-8 h-8 rounded-full bg-blue-500 border cursor-pointer"></div>
                        <div className="w-8 h-8 rounded-full bg-green-500 border cursor-pointer"></div>
                        <div className="w-8 h-8 rounded-full bg-purple-500 border cursor-pointer"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logo">Logo Upload</Label>
                      <Input id="logo" type="file" accept="image/*" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-css">Custom CSS</Label>
                      <Textarea id="custom-css" placeholder="Add custom styles" rows={4} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium">Preview</h3>
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="space-y-4">
                        <div className="h-20 bg-gradient-to-r from-primary to-secondary rounded"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 bg-primary rounded flex-1"></div>
                          <div className="h-8 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Button className="gradient-primary">Save Design</Button>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Marketing Tab */}
          <TabsContent value="marketing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Campaigns</CardTitle>
                <CardDescription>Engage your audience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input id="campaign-name" placeholder="Enter campaign name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input id="subject" placeholder="Email subject" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-content">Email Content</Label>
                  <Textarea id="email-content" placeholder="Email message" rows={6} />
                </div>
                <Button className="gradient-primary">Send Campaign</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <BillingDashboard 
              organizationId={organizationId} 
              isLoading={!organizationId}
            />
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
                <p className="text-muted-foreground">
                  Connect your event management system with external services
                </p>
              </div>
              
              <XeroIntegration organizationId={organizationId} />
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {!organizationId ? (
              <Card>
                <CardHeader>
                  <CardTitle>Create Organization</CardTitle>
                  <CardDescription>Create your organization to start managing events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input id="org-name" placeholder="Your organization name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Contact Email</Label>
                    <Input id="contact-email" type="email" placeholder="contact@yourorg.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input id="website" placeholder="https://yourwebsite.com" />
                  </div>
                  <Button 
                    onClick={async () => {
                      const name = (document.getElementById('org-name') as HTMLInputElement).value;
                      const email = (document.getElementById('contact-email') as HTMLInputElement).value;
                      const website = (document.getElementById('website') as HTMLInputElement).value;
                      
                      if (!name || !email) {
                        toast({
                          title: "Error",
                          description: "Please fill in organization name and email",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      try {
                        const { data, error } = await supabase
                          .from("organizations")
                          .insert([{
                            name,
                            email,
                            website: website || null,
                            user_id: user.id
                          }])
                          .select()
                          .single();
                          
                        if (error) throw error;
                        
                        setOrganizationId(data.id);
                        toast({
                          title: "Success",
                          description: "Organization created successfully!"
                        });
                      } catch (error) {
                        console.error("Error creating organization:", error);
                        toast({
                          title: "Error",
                          description: `Failed to create organization: ${error.message}`,
                          variant: "destructive"
                        });
                      }
                    }}
                    className="gradient-primary"
                  >
                    Create Organization
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Settings</CardTitle>
                    <CardDescription>Manage your account preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name-edit">Organization Name</Label>
                      <Input id="org-name-edit" placeholder="Your organization name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email-edit">Contact Email</Label>
                      <Input id="contact-email-edit" type="email" placeholder="contact@yourorg.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website-edit">Website</Label>
                      <Input id="website-edit" placeholder="https://yourwebsite.com" />
                    </div>
                    <Button className="gradient-primary">Save Settings</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Platform Settings</CardTitle>
                    <CardDescription>Configure how your platform operates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Test Mode</Label>
                        <div className="text-[0.8rem] text-muted-foreground">
                          When enabled, no real payments are processed and events are marked as test events
                        </div>
                      </div>
                      <Switch
                        checked={testMode}
                        onCheckedChange={handleToggleTestMode}
                      />
                    </div>
                    
                    {testMode && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Monitor className="h-5 w-5 text-orange-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-orange-800">
                              Test Mode Active
                            </h3>
                            <div className="mt-2 text-sm text-orange-700">
                              <p>
                                You are currently in test mode. No real payments will be processed and all events will be marked as test events.
                                Switch to live mode when you're ready to accept real payments.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
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
    </div>
  );
};

export default OrgDashboard;
