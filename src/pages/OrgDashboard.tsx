import { useState } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AIEventGenerator from "@/components/AIEventGenerator";
import AIChatbot from "@/components/AIChatbot";
import { Calendar, Users, Ticket, Settings, BarChart3, Mail, Palette, Globe, Plus, Edit, Trash2, CreditCard, Sparkles, MessageSquare, Bell, Monitor, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OrgDashboard = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>("");
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
          <TabsList className="grid w-full grid-cols-9 lg:w-fit">
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
            <TabsTrigger value="embed" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Embed
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Marketing
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

                    {/* Widget Integration */}
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
                                <input type="checkbox" id="collect-phone" className="rounded" />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label htmlFor="require-approval">Require Approval</Label>
                                <input type="checkbox" id="require-approval" className="rounded" />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label htmlFor="custom-fields">Custom Questions</Label>
                                <Button variant="outline" size="sm">
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add
                                </Button>
                              </div>
                            </div>
                            <Button className="w-full mt-4" variant="outline">
                              <Settings className="w-4 h-4 mr-2" />
                              Advanced Settings
                            </Button>
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
                            <Button variant="outline" disabled className="w-full mt-4">
                              <Palette className="w-4 h-4 mr-2" />
                              Design Seat Map (Coming Soon)
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Stripe Connect Setup
                </CardTitle>
                <CardDescription>Connect your Stripe account to start accepting payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!stripeConnected ? (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      Connect your Stripe account to start accepting payments for your events.
                    </p>
                    <Button onClick={handleStripeConnect} className="gradient-primary">
                      Connect Stripe Account
                    </Button>
                  </div>
                ) : !stripeOnboardingComplete ? (
                  <div className="text-center space-y-4">
                    <Badge variant="outline" className="mb-2">
                      Setup In Progress
                    </Badge>
                    <p className="text-muted-foreground">
                      Your Stripe account is connected but setup is not complete.
                    </p>
                    <Button onClick={checkStripeStatus} variant="outline">
                      Check Status
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Badge className="mb-2">
                      ✓ Connected
                    </Badge>
                    <p className="text-green-600">
                      Your Stripe account is fully set up and ready to accept payments!
                    </p>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <h4 className="font-medium">Platform Fees</h4>
                      <p className="text-sm text-muted-foreground">
                        1.00% + $0.50 per ticket sold
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Platform fees are automatically deducted from each transaction
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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

          {/* Embed Tab */}
          <TabsContent value="embed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Embed Your Ticketing Widget</CardTitle>
                <CardDescription>Add ticketing to your website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    &lt;iframe src="https://ticket2.com/widget/your-org-id" width="100%" height="600"&gt;&lt;/iframe&gt;
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Widget URL</Label>
                  <div className="flex gap-2">
                    <Input value="https://ticket2.com/widget/your-org-id" readOnly />
                    <Button variant="outline">Copy</Button>
                  </div>
                </div>
                <Button className="gradient-primary">Generate New Widget</Button>
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
      </div>
    </div>
  );
};

export default OrgDashboard;