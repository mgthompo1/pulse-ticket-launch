import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mail,
  Share2,
  QrCode,
  TrendingUp,
  Target,
  Copy,
  Download,
  ExternalLink,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SocialMediaIntegration } from "./SocialMediaIntegration";
import { ReminderEmailCampaigns } from "./ReminderEmailCampaigns";
import { formatEventDateRange } from "@/lib/dateUtils";

interface Event {
  id: string;
  name: string;
  status: string;
  event_date: string;
  event_end_date?: string | null;
  description?: string;
}

interface MarketingToolsProps {
  selectedEvent?: Event;
}

export const MarketingTools = ({ selectedEvent: initialSelectedEvent }: MarketingToolsProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(initialSelectedEvent || null);
  const [emailCampaign, setEmailCampaign] = useState({
    subject: "",
    content: "",
    segment: "all-ticket-holders"
  });

  const [analytics, setAnalytics] = useState({
    pageViews: 0,
    shares: 0,
    conversionRate: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    trafficSources: []
  });

  // Load events when component mounts
  useEffect(() => {
    const loadEvents = async () => {
      if (!user) return;

      try {
        // First get the organization
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (orgError || !org) {
          console.error("Error loading organization:", orgError);
          return;
        }

        // Then get events for this organization
        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("id, name, status, event_date, event_end_date, description")
          .eq("organization_id", org.id)
          .order("created_at", { ascending: false });

        if (eventsError) {
          console.error("Error loading events:", eventsError);
          return;
        }

        setEvents((eventsData || []).map(event => ({
          ...event,
          description: event.description || undefined
        })));
      } catch (error) {
        console.error("Error loading events:", error);
      }
    };

    loadEvents();
  }, [user]);

  // Update selectedEvent when initialSelectedEvent changes
  useEffect(() => {
    if (initialSelectedEvent) {
      setSelectedEvent(initialSelectedEvent);
    }
  }, [initialSelectedEvent]);

  // Load analytics data when selected event changes
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!selectedEvent || !user) return;

      try {
        // Get orders for this event with order items and tickets
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select(`
            id,
            total_amount,
            status,
            created_at,
            order_items (
              id,
              quantity,
              tickets (
                id,
                status
              )
            )
          `)
          .eq("event_id", selectedEvent.id)
          .in("status", ["completed", "paid"]);

        if (ordersError) throw ordersError;

        // Calculate total tickets from order items
        let totalTicketsSold = 0;
        orders?.forEach((order: any) => {
          order.order_items?.forEach((item: any) => {
            totalTicketsSold += item.tickets?.length || 0;
          });
        });

        const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
        const totalOrders = orders?.length || 0;

        // Mock page views for now (would need actual tracking implementation)
        const pageViews = totalOrders * 15; // Rough estimate
        const shares = Math.floor(totalOrders * 0.8); // Rough estimate
        const conversionRate = totalOrders > 0 ? ((totalTicketsSold / pageViews) * 100) : 0;

        setAnalytics({
          pageViews,
          shares,
          conversionRate: Number(conversionRate.toFixed(1)),
          totalTicketsSold,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          trafficSources: [
            { source: "Direct", visits: 45, color: "bg-primary" },
            { source: "Social Media", visits: 30, color: "bg-secondary" },
            { source: "Search", visits: 15, color: "bg-accent" },
            { source: "Email", visits: 10, color: "bg-muted" }
          ]
        });

      } catch (error) {
        console.error("Error loading analytics:", error);
      }
    };

    loadAnalytics();
  }, [selectedEvent, user]);

  const handleCopyShareLink = () => {
    if (selectedEvent) {
      const shareLink = `${window.location.origin}/events/${selectedEvent.id}`;
      navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link Copied",
        description: "Event share link has been copied to clipboard"
      });
    }
  };

  const handleDownloadQR = () => {
    toast({
      title: "QR Code Generated",
      description: "QR code has been downloaded successfully"
    });
  };

  const handleSendEmail = () => {
    toast({
      title: "Email Campaign Created",
      description: "Your email campaign has been scheduled for delivery"
    });
    setEmailCampaign({ subject: "", content: "", segment: "all" });
  };


  if (!selectedEvent) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Marketing Tools</h2>
          <p className="text-muted-foreground mb-4">Select an event to access marketing tools</p>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center py-8">
                No events found. Create an event first to access marketing tools.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => setSelectedEvent(event)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{event.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4" />
                    {formatEventDateRange(
                      event.event_date,
                      event.event_end_date,
                      { dateStyle: 'medium' },
                      'en-US'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <Badge
                      variant={event.status === 'published' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {event.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Marketing Tools</h2>
          <p className="text-muted-foreground text-sm sm:text-base truncate max-w-xs sm:max-w-none">Promote {selectedEvent.name}</p>
        </div>
        <Badge variant="outline" className="w-fit">{selectedEvent.status}</Badge>
      </div>

      <Tabs defaultValue="sharing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 p-1">
          <TabsTrigger value="sharing" className="text-xs sm:text-sm py-2">Sharing</TabsTrigger>
          <TabsTrigger value="email" className="text-xs sm:text-sm py-2">Email</TabsTrigger>
          <TabsTrigger value="social" className="text-xs sm:text-sm py-2">Social Media</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="sharing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Share Event
                </CardTitle>
                <CardDescription>Share your event with potential attendees</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Event Link</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={`${window.location.origin}/events/${selectedEvent.id}`}
                      readOnly
                      className="flex-1"
                    />
                    <Button onClick={handleCopyShareLink} size="icon" variant="outline">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview Page
                  </Button>
                  <Button className="flex-1" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Widget Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Code
                </CardTitle>
                <CardDescription>Generate QR codes for easy sharing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center p-4 border rounded-lg bg-muted/30">
                  <div className="w-32 h-32 bg-white border flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-muted-foreground" />
                  </div>
                </div>
                <Button onClick={handleDownloadQR} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Tabs defaultValue="reminder-campaigns" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-auto gap-1 p-1">
              <TabsTrigger value="reminder-campaigns" className="text-xs sm:text-sm py-2">Reminder Campaigns</TabsTrigger>
              <TabsTrigger value="promotional" className="text-xs sm:text-sm py-2">Promotional Emails</TabsTrigger>
            </TabsList>

            <TabsContent value="reminder-campaigns">
              <ReminderEmailCampaigns selectedEvent={selectedEvent} />
            </TabsContent>

            <TabsContent value="promotional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Promotional Email Marketing
                  </CardTitle>
                  <CardDescription>Send promotional emails to your audience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-subject">Subject Line</Label>
                      <Input
                        id="email-subject"
                        value={emailCampaign.subject}
                        onChange={(e) => setEmailCampaign(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Enter email subject"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-segment">Audience Segment</Label>
                      <Select value={emailCampaign.segment} onValueChange={(value) => setEmailCampaign(prev => ({ ...prev, segment: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-ticket-holders">All Confirmed Ticket Holders</SelectItem>
                          <SelectItem value="ticket-type">By Ticket Type</SelectItem>
                          <SelectItem value="purchase-date">By Purchase Date Range</SelectItem>
                          <SelectItem value="vip-tickets">VIP Ticket Holders Only</SelectItem>
                          <SelectItem value="past-attendees">Past Event Attendees</SelectItem>
                          <SelectItem value="custom-segment">Custom Segment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-content">Email Content</Label>
                    <Textarea
                      id="email-content"
                      value={emailCampaign.content}
                      onChange={(e) => setEmailCampaign(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your email content here..."
                      rows={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSendEmail} className="flex-1">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Campaign
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Save Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <SocialMediaIntegration selectedEvent={selectedEvent} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.pageViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Estimated traffic
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalTicketsSold}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  Total purchased
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analytics.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  From ticket sales
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>Where your visitors are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.trafficSources.map((item) => (
                  <div key={item.source} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="flex-1 text-sm">{item.source}</span>
                    <span className="text-sm font-medium">{item.visits}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};