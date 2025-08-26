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
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SocialMediaIntegration } from "./SocialMediaIntegration";

interface Event {
  id: string;
  name: string;
  status: string;
  event_date: string;
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
    segment: "all"
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
          .select("id, name, status, event_date, description")
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
        <Card>
          <CardHeader>
            <CardTitle>Marketing Tools</CardTitle>
            <CardDescription>Select an event to access marketing tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No events found. Create an event first to access marketing tools.
              </p>
            ) : (
              <div className="space-y-4">
                <Label>Select an Event</Label>
                <Select onValueChange={(eventId) => {
                  const event = events.find(e => e.id === eventId);
                  if (event) setSelectedEvent(event);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event to promote" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{event.name}</span>
                          <Badge variant="outline" className="ml-2">{event.status}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Marketing Tools</h2>
          <p className="text-muted-foreground">Promote {selectedEvent.name}</p>
        </div>
        <Badge variant="outline">{selectedEvent.status}</Badge>
      </div>

      <Tabs defaultValue="sharing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Marketing
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
                      <SelectItem value="all">All Subscribers</SelectItem>
                      <SelectItem value="past-attendees">Past Attendees</SelectItem>
                      <SelectItem value="interests">By Interests</SelectItem>
                      <SelectItem value="location">By Location</SelectItem>
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

        <TabsContent value="social" className="space-y-4">
          <SocialMediaIntegration selectedEvent={selectedEvent} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,341</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Shares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  +8% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3.2%</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  +0.5% from last week
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
                {[
                  { source: "Direct", visits: 45, color: "bg-primary" },
                  { source: "Social Media", visits: 30, color: "bg-secondary" },
                  { source: "Search", visits: 15, color: "bg-accent" },
                  { source: "Email", visits: 10, color: "bg-muted" }
                ].map((item) => (
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