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
import { Calendar, Users, Ticket, Settings, BarChart3, Mail, Palette, Globe, Plus, Edit, Trash2, CreditCard, Sparkles, MessageSquare, Bell, Monitor } from "lucide-react";

const OrgDashboard = () => {
  const [events, setEvents] = useState([
    {
      id: "1",
      name: "Tech Conference 2024", 
      date: "2024-03-15",
      venue: "Convention Center",
      tickets: { sold: 245, total: 500 },
      revenue: "$12,250",
      status: "active"
    },
    {
      id: "2", 
      name: "Music Festival",
      date: "2024-04-20",
      venue: "Central Park",
      tickets: { sold: 1200, total: 2000 },
      revenue: "$60,000",
      status: "active"
    }
  ]);

  const [activeTab, setActiveTab] = useState("overview");
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  // Event form state
  const [eventForm, setEventForm] = useState({
    name: "",
    date: "",
    venue: "",
    capacity: "",
    description: ""
  });
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Load organization and check Stripe status
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
      }
    };

    loadOrganization();
  }, [user]);

  const handleStripeConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { organizationId }
      });

      if (error) throw error;

      window.open(data.url, "_blank");
      toast({
        title: "Stripe Connect",
        description: "Complete your Stripe setup in the new window."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect Stripe account",
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

      // Add to local events state (for UI update)
      const newEvent = {
        id: data.id,
        name: data.name,
        date: data.event_date,
        venue: data.venue,
        tickets: { sold: 0, total: data.capacity },
        revenue: "$0",
        status: "draft"
      };
      setEvents(prev => [...prev, newEvent]);

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

  const handleEventFormChange = (field: string, value: string) => {
    setEventForm(prev => ({
      ...prev,
      [field]: value
    }));
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
            <Button onClick={handleCreateEventClick} className="gradient-primary hover-scale">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-8 lg:w-fit">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Events
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
                         <Badge variant={event.status === "active" ? "default" : "secondary"}>
                           {event.status}
                         </Badge>
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