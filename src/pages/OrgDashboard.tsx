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
  const [windcaveConfig, setWindcaveConfig] = useState({
    username: "",
    apiKey: "",
    endpoint: "UAT" as "SEC" | "UAT",
    enabled: false,
    applePayMerchantId: "",
    hitUsername: "",
    hitKey: "",
    stationId: ""
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
          stationId: (orgs as any).windcave_station_id || ""
        });
        
        // Load events for this organization
        loadEvents(orgs.id);
      }
    };

    loadOrganization();
  }, [user]);

  const loadEvents = async (orgId: string) => {
    const { data: eventsData, error } = await supabase
      .from("events")
      .select("*")
      .eq("organization_id", orgId)
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
        tickets: { sold: 0, total: event.capacity }, // Will be updated with real data
        revenue: "$0" // Will be updated with real data
      }));
      setEvents(formattedEvents);
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
          windcave_station_id: windcaveConfig.stationId
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
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Organization Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">Manage your events and ticketing platform</p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleCreateEventClick} className="gradient-primary hover-scale">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-10 lg:w-fit">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="event-details" className="flex items-center gap-2" disabled={!selectedEvent}>
              <Users className="w-4 h-4" />
              Event Details
            </TabsTrigger>
            <TabsTrigger value="ai-tools" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Tools
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="design" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Design
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

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
                     <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                       <div className="space-y-1">
                         <h3 className="font-medium">{event.name}</h3>
                         <p className="text-sm text-muted-foreground">{event.date} • {event.venue}</p>
                       </div>
                       <div className="flex items-center gap-4">
                         <div className="text-right">
                           <p className="text-sm font-medium">{event.tickets.sold}/{event.tickets.total} tickets</p>
                           <p className="text-sm text-muted-foreground">{event.revenue}</p>
                         </div>
                         <Badge variant={event.status === "published" ? "default" : "secondary"}>
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
                         >
                           <Users className="h-4 w-4 mr-2" />
                           Manage
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => window.open(`/ticket2live/${event.id}`, '_blank')}
                         >
                           <Monitor className="h-4 w-4 mr-2" />
                           Ticket2LIVE
                         </Button>
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
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tickets">Tickets</TabsTrigger>
                  <TabsTrigger value="customization">Customization</TabsTrigger>
                  <TabsTrigger value="attendees">Attendees</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

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
                        <div className="flex gap-2">
                          <Input 
                            value={`${window.location.origin}/widget/${selectedEvent.id}`} 
                            readOnly 
                            className="font-mono text-sm"
                          />
                          <Button variant="outline" onClick={() => window.open(`/widget/${selectedEvent.id}`, '_blank')}>
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Ticket Management</CardTitle>
                      <CardDescription>Configure ticket types and pricing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Ticket management interface will be here</p>
                    </CardContent>
                  </Card>
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
              <>
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
                  <CardContent className="space-y-6">
                    {/* Event Widget Section */}
                    <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Event Widget
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Share this link for customers to purchase tickets
                      </p>
                      <div className="flex gap-2 mb-3">
                        <Input 
                          value={`${window.location.origin}/widget/${selectedEvent.id}`} 
                          readOnly 
                          className="font-mono text-sm"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/widget/${selectedEvent.id}`);
                            toast({ title: "Copied!", description: "Widget URL copied to clipboard" });
                          }}
                        >
                          Copy
                        </Button>
                        <Button 
                          onClick={() => window.open(`/widget/${selectedEvent.id}`, '_blank')}
                          className="gradient-primary"
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          View Widget
                        </Button>
                      </div>
                    </div>
                    {/* Ticket Types Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Ticket Types</h3>
                      
                      {/* Existing Ticket Types */}
                      {ticketTypes.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-base font-medium mb-3">Current Ticket Types</h4>
                          <div className="grid gap-4">
                            {ticketTypes.map((ticketType) => (
                              <Card key={ticketType.id} className="border-l-4 border-l-primary">
                                <CardContent className="pt-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h5 className="font-medium">{ticketType.name}</h5>
                                      {ticketType.description && (
                                        <p className="text-sm text-muted-foreground mt-1">{ticketType.description}</p>
                                      )}
                                      <div className="flex items-center gap-4 mt-2">
                                        <span className="text-lg font-bold text-primary">
                                          ${ticketType.price}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          {ticketType.quantity_sold}/{ticketType.quantity_available} sold
                                        </span>
                                      </div>
                                      {(ticketType.sale_start_date || ticketType.sale_end_date) && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {ticketType.sale_start_date && `Sale starts: ${new Date(ticketType.sale_start_date).toLocaleDateString()}`}
                                          {ticketType.sale_start_date && ticketType.sale_end_date && " • "}
                                          {ticketType.sale_end_date && `Sale ends: ${new Date(ticketType.sale_end_date).toLocaleDateString()}`}
                                        </div>
                                      )}
                                    </div>
                                    <Button variant="outline" size="sm">
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Create New Ticket Type */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Create New Ticket Type</CardTitle>
                          <CardDescription>Set up pricing, quantities, and sale periods for your event tickets.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="ticket-name">Ticket Name *</Label>
                              <Input 
                                id="ticket-name" 
                                placeholder="e.g., General Admission, VIP, Early Bird" 
                                value={ticketTypeForm.name}
                                onChange={(e) => handleTicketTypeFormChange("name", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ticket-price">Price (USD) *</Label>
                              <Input 
                                id="ticket-price" 
                                type="number" 
                                step="0.01"
                                placeholder="29.99" 
                                value={ticketTypeForm.price}
                                onChange={(e) => handleTicketTypeFormChange("price", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ticket-quantity">Available Quantity *</Label>
                              <Input 
                                id="ticket-quantity" 
                                type="number" 
                                placeholder="100" 
                                value={ticketTypeForm.quantity}
                                onChange={(e) => handleTicketTypeFormChange("quantity", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ticket-description">Description (Optional)</Label>
                              <Input 
                                id="ticket-description" 
                                placeholder="Brief description of what's included" 
                                value={ticketTypeForm.description}
                                onChange={(e) => handleTicketTypeFormChange("description", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sale-start">Sale Start Date (Optional)</Label>
                              <Input 
                                id="sale-start" 
                                type="datetime-local" 
                                value={ticketTypeForm.saleStartDate}
                                onChange={(e) => handleTicketTypeFormChange("saleStartDate", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sale-end">Sale End Date (Optional)</Label>
                              <Input 
                                id="sale-end" 
                                type="datetime-local" 
                                value={ticketTypeForm.saleEndDate}
                                onChange={(e) => handleTicketTypeFormChange("saleEndDate", e.target.value)}
                              />
                            </div>
                          </div>
                          <Button 
                            onClick={handleCreateTicketType} 
                            disabled={isCreatingTicketType}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {isCreatingTicketType ? "Creating..." : "Create Ticket Type"}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Attendee Management */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Attendee Management</h3>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Guest List & Check-ins</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground mb-4">
                            View ticket sales, manage attendees, and handle event check-ins.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold">0</div>
                                  <p className="text-sm text-muted-foreground">Tickets Sold</p>
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold">0</div>
                                  <p className="text-sm text-muted-foreground">Checked In</p>
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold">$0</div>
                                  <p className="text-sm text-muted-foreground">Revenue</p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Event Logo Management */}
                    <div className="space-y-4">
                      <EventLogoUploader 
                        eventId={selectedEvent.id}
                        currentLogoUrl={selectedEvent.logo_url}
                        onLogoChange={(logoUrl) => {
                          setEvents(prevEvents => 
                            prevEvents.map(event => 
                              event.id === selectedEvent.id 
                                ? { ...event, logo_url: logoUrl }
                                : event
                            )
                          );
                          setSelectedEvent(prev => prev ? { ...prev, logo_url: logoUrl } : null);
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Ticketing Widget</h3>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Embed Ticket Sales</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-muted-foreground">
                            Generate an embed code to add ticket sales to your website.
                          </p>
                          <div className="bg-muted p-4 rounded-lg">
                            <code className="text-sm">
                              {`<iframe src="${window.location.origin}/widget/${selectedEvent.id}" width="100%" height="600" frameborder="0"></iframe>`}
                            </code>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(`<iframe src="${window.location.origin}/widget/${selectedEvent.id}" width="100%" height="600" frameborder="0"></iframe>`);
                                toast({ title: "Copied!", description: "Widget code copied to clipboard" });
                              }}
                            >
                              Copy Code
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => window.open(`/widget/${selectedEvent.id}`, '_blank')}
                            >
                              Preview Widget
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Customization Options */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Event Customization</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Checkout Customization</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground mb-4">
                              Customize the ticket purchase flow and checkout experience.
                            </p>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="collect-phone">Collect Phone Number</Label>
                                <input 
                                  type="checkbox" 
                                  id="collect-phone" 
                                  className="rounded" 
                                  defaultChecked={selectedEvent?.requires_approval || false}
                                  onChange={(e) => console.log('Collect phone:', e.target.checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label htmlFor="require-approval">Require Approval</Label>
                                <input 
                                  type="checkbox" 
                                  id="require-approval" 
                                  className="rounded"
                                  defaultChecked={selectedEvent?.requires_approval || false}
                                  onChange={(e) => console.log('Require approval:', e.target.checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label htmlFor="custom-fields">Custom Questions</Label>
                                <Dialog open={showCustomQuestionsDialog} onOpenChange={setShowCustomQuestionsDialog}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Add
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Custom Questions</DialogTitle>
                                      <DialogDescription>
                                        Add custom questions to collect additional information from ticket buyers.
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    <div className="space-y-4">
                                      {customQuestions.length > 0 && (
                                        <div className="space-y-2">
                                          <Label>Existing Questions</Label>
                                          {customQuestions.map((question, index) => (
                                            <div key={index} className="flex items-center justify-between bg-muted/20 p-2 rounded">
                                              <div>
                                                <p className="text-sm font-medium">{question.label}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {question.type} {question.required && "(Required)"}
                                                </p>
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  const updated = customQuestions.filter((_, i) => i !== index);
                                                  setCustomQuestions(updated);
                                                }}
                                              >
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      <div className="space-y-3">
                                        <div>
                                          <Label htmlFor="question-label">Question Label</Label>
                                          <Input
                                            id="question-label"
                                            placeholder="e.g., What's your dietary preference?"
                                            value={newQuestion.label}
                                            onChange={(e) => setNewQuestion(prev => ({ ...prev, label: e.target.value }))}
                                          />
                                        </div>
                                        
                                        <div>
                                          <Label htmlFor="question-type">Question Type</Label>
                                          <Select 
                                            value={newQuestion.type} 
                                            onValueChange={(value) => setNewQuestion(prev => ({ ...prev, type: value }))}
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="text">Text Input</SelectItem>
                                              <SelectItem value="textarea">Long Text</SelectItem>
                                              <SelectItem value="select">Dropdown</SelectItem>
                                              <SelectItem value="radio">Multiple Choice</SelectItem>
                                              <SelectItem value="checkbox">Checkbox</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        
                                        {(newQuestion.type === "select" || newQuestion.type === "radio") && (
                                          <div>
                                            <Label htmlFor="question-options">Options (one per line)</Label>
                                            <Textarea
                                              id="question-options"
                                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                                              value={newQuestion.options}
                                              onChange={(e) => setNewQuestion(prev => ({ ...prev, options: e.target.value }))}
                                            />
                                          </div>
                                        )}
                                        
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            id="question-required"
                                            checked={newQuestion.required}
                                            onCheckedChange={(checked) => setNewQuestion(prev => ({ ...prev, required: checked }))}
                                          />
                                          <Label htmlFor="question-required">Required</Label>
                                        </div>
                                        
                                        <Button
                                          onClick={() => {
                                            if (newQuestion.label.trim()) {
                                              setCustomQuestions(prev => [...prev, { ...newQuestion }]);
                                              setNewQuestion({ label: "", type: "text", required: false, options: "" });
                                              toast({ title: "Question Added", description: "Custom question has been added successfully." });
                                            }
                                          }}
                                          className="w-full"
                                        >
                                          Add Question
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                            <Dialog open={showAdvancedSettingsDialog} onOpenChange={setShowAdvancedSettingsDialog}>
                              <DialogTrigger asChild>
                                <Button 
                                  className="w-full mt-4" 
                                  variant="outline"
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Advanced Settings
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Advanced Checkout Settings</DialogTitle>
                                  <DialogDescription>
                                    Configure advanced options for your event checkout process.
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <Label htmlFor="collect-phone-adv">Collect Phone Number</Label>
                                      <p className="text-xs text-muted-foreground">Require customers to provide their phone number</p>
                                    </div>
                                    <Switch
                                      id="collect-phone-adv"
                                      checked={advancedSettings.collectPhone}
                                      onCheckedChange={(checked) => setAdvancedSettings(prev => ({ ...prev, collectPhone: checked }))}
                                    />
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <Label htmlFor="require-approval-adv">Require Approval</Label>
                                      <p className="text-xs text-muted-foreground">Manually approve each ticket purchase</p>
                                    </div>
                                    <Switch
                                      id="require-approval-adv"
                                      checked={advancedSettings.requireApproval}
                                      onCheckedChange={(checked) => setAdvancedSettings(prev => ({ ...prev, requireApproval: checked }))}
                                    />
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <Label htmlFor="email-notifications">Email Notifications</Label>
                                      <p className="text-xs text-muted-foreground">Send confirmation emails to customers</p>
                                    </div>
                                    <Switch
                                      id="email-notifications"
                                      checked={advancedSettings.emailNotifications}
                                      onCheckedChange={(checked) => setAdvancedSettings(prev => ({ ...prev, emailNotifications: checked }))}
                                    />
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <Label htmlFor="reminder-emails">Reminder Emails</Label>
                                      <p className="text-xs text-muted-foreground">Send event reminder emails</p>
                                    </div>
                                    <Switch
                                      id="reminder-emails"
                                      checked={advancedSettings.reminderEmails}
                                      onCheckedChange={(checked) => setAdvancedSettings(prev => ({ ...prev, reminderEmails: checked }))}
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor="success-message">Custom Success Message</Label>
                                    <Textarea
                                      id="success-message"
                                      placeholder="Thank you for your purchase! We'll see you at the event."
                                      value={advancedSettings.customSuccessMessage}
                                      onChange={(e) => setAdvancedSettings(prev => ({ ...prev, customSuccessMessage: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                
                                <DialogFooter>
                                  <Button
                                    onClick={() => {
                                      // Here you would save the settings to your database
                                      toast({ title: "Settings Saved", description: "Advanced checkout settings have been updated." });
                                      setShowAdvancedSettingsDialog(false);
                                    }}
                                  >
                                    Save Settings
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Seat Map & Venue Layout</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground mb-4">
                              Create custom seating arrangements for your venue. This feature allows for assigned seating and better event organization.
                            </p>
                            <div className="bg-muted/20 border border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
                              <Palette className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mb-3">Advanced Feature</p>
                              <p className="text-xs text-muted-foreground">
                                Seat mapping will be available in a future update. For now, use general admission tickets.
                              </p>
                            </div>
                            <Button 
                              onClick={() => setShowSeatMapDesigner(true)}
                              className="w-full mt-4"
                            >
                              <Palette className="w-4 h-4 mr-2" />
                              Design Seat Map
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
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
                      <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="space-y-1">
                          <h3 className="font-medium">{event.name}</h3>
                          <p className="text-sm text-muted-foreground">{event.date} • {event.venue}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={event.status === "published" ? "default" : "secondary"}>
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
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Manage Event
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
                <>
                  <Card className="gradient-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Stripe Connect Setup
                      </CardTitle>
                      <CardDescription>
                        Each organization needs its own Stripe account to receive payments directly
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-blue-900">How Stripe Connect Works:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Your organization gets its own Stripe account</li>
                          <li>• Payments go directly to your account</li>
                          <li>• You control your own payouts and fees</li>
                          <li>• Complete financial independence</li>
                        </ul>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Stripe Account</span>
                        <Badge variant={stripeConnected ? "default" : "secondary"}>
                          {stripeConnected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Onboarding Status</span>
                        <Badge variant={stripeOnboardingComplete ? "default" : "secondary"}>
                          {stripeOnboardingComplete ? "Complete" : "Incomplete"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {!stripeConnected ? (
                          <div className="space-y-2">
                            <Button onClick={handleStripeConnect} className="w-full gradient-primary">
                              Create Stripe Connect Account
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              This will create a new Stripe account for your organization
                            </p>
                          </div>
                        ) : !stripeOnboardingComplete ? (
                          <div className="space-y-2">
                            <Button onClick={handleStripeConnect} className="w-full gradient-primary">
                              Complete Stripe Onboarding
                            </Button>
                            <Button onClick={checkStripeStatus} variant="outline" className="w-full">
                              Check Status
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Complete your bank details and business information
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Badge variant="default" className="w-full justify-center py-2">
                              ✓ Ready to Accept Payments
                            </Badge>
                            <Button onClick={checkStripeStatus} variant="outline" className="w-full">
                              Refresh Status
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Your Stripe account is fully set up and ready
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="gradient-card">
                    <CardHeader>
                      <CardTitle>Stripe Payment Processing</CardTitle>
                      <CardDescription>
                        How payments work with your Stripe account
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-green-900">Benefits:</h4>
                        <ul className="text-sm text-green-800 space-y-1">
                          <li>• Direct deposits to your bank account</li>
                          <li>• Full access to Stripe dashboard</li>
                          <li>• Your own dispute management</li>
                          <li>• Complete transaction history</li>
                        </ul>
                      </div>

                      {stripeOnboardingComplete && (
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                          <h4 className="font-medium">Platform Fees</h4>
                          <p className="text-sm text-muted-foreground">
                            1.00% + $0.50 per ticket sold
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Platform fees are automatically deducted from each transaction
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <h4 className="font-medium">Supported Payment Methods:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Credit & Debit Cards</li>
                          <li>• Digital Wallets (Apple Pay, Google Pay)</li>
                          <li>• Bank Transfers (ACH)</li>
                          <li>• Buy Now, Pay Later options</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </>
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