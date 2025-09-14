import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Mail,
  Calendar,
  Clock,
  Users,
  Send,
  Eye,
  Edit,
  Trash2,
  Plus,
  Settings,
  BarChart3,
  Play,
  Pause,
  Save,
  Copy,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmailTemplateBuilder } from "./EmailTemplateBuilder";
import { EmailTemplatePreview } from "./EmailTemplatePreview";
import type { EmailTemplate } from "@/types/email-template";
import { createDefaultReminderTemplate } from "@/types/email-template";

interface Event {
  id: string;
  name: string;
  event_date: string;
  venue?: string;
  description?: string;
  status: string;
}

interface ReminderCampaign {
  id?: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  template: EmailTemplate;
  subject_line: string;
  send_timing: 'days_before' | 'hours_before' | 'specific_datetime';
  send_value?: number;
  send_datetime?: string;
  recipient_type: 'all_attendees' | 'ticket_holders_only' | 'custom_segment';
  total_recipients: number;
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  emails_clicked: number;
}

interface ReminderEmailCampaignsProps {
  selectedEvent?: Event;
}

export const ReminderEmailCampaigns: React.FC<ReminderEmailCampaignsProps> = ({ selectedEvent: initialSelectedEvent }) => {
  const { toast } = useToast();
  const { user } = useAuth();

  // State management
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(initialSelectedEvent || null);
  const [campaigns, setCampaigns] = useState<ReminderCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<ReminderCampaign | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [showPreview, setShowPreview] = useState(false);

  // New campaign state
  const [newCampaign, setNewCampaign] = useState<Partial<ReminderCampaign>>({
    name: "",
    description: "",
    status: 'draft',
    template: createDefaultReminderTemplate(),
    subject_line: "⏰ @EventName is coming up soon!",
    send_timing: 'days_before',
    send_value: 7,
    recipient_type: 'all_attendees',
    total_recipients: 0,
    emails_sent: 0,
    emails_delivered: 0,
    emails_opened: 0,
    emails_clicked: 0,
  });

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      if (!user) return;

      try {
        // Get user's organization
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (!orgMember) return;

        // Get events
        const { data: eventsData, error } = await supabase
          .from('events')
          .select('id, name, event_date, venue, description, status')
          .eq('organization_id', orgMember.organization_id)
          .eq('status', 'published')
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true });

        if (error) throw error;

        setEvents(eventsData || []);

        // Auto-select first event if none selected
        if (!selectedEvent && eventsData && eventsData.length > 0) {
          setSelectedEvent(eventsData[0]);
        }
      } catch (error) {
        console.error('Error loading events:', error);
        toast({
          title: "Error",
          description: "Failed to load events",
          variant: "destructive",
        });
      }
    };

    loadEvents();
  }, [user]);

  // Load campaigns for selected event
  useEffect(() => {
    const loadCampaigns = async () => {
      if (!selectedEvent || !user) return;

      try {
        // This would be the actual Supabase query once the tables are created
        // For now, we'll use mock data
        const mockCampaigns: ReminderCampaign[] = [
          {
            id: '1',
            name: 'One Week Reminder',
            description: 'Sent 7 days before the event',
            status: 'scheduled',
            template: createDefaultReminderTemplate(),
            subject_line: '⏰ @EventName is next week!',
            send_timing: 'days_before',
            send_value: 7,
            recipient_type: 'all_attendees',
            total_recipients: 156,
            emails_sent: 0,
            emails_delivered: 0,
            emails_opened: 0,
            emails_clicked: 0,
          },
          {
            id: '2',
            name: 'Final Reminder',
            description: 'Sent 24 hours before the event',
            status: 'draft',
            template: createDefaultReminderTemplate(),
            subject_line: '🚨 @EventName is tomorrow!',
            send_timing: 'hours_before',
            send_value: 24,
            recipient_type: 'ticket_holders_only',
            total_recipients: 142,
            emails_sent: 0,
            emails_delivered: 0,
            emails_opened: 0,
            emails_clicked: 0,
          }
        ];

        setCampaigns(mockCampaigns);
      } catch (error) {
        console.error('Error loading campaigns:', error);
        toast({
          title: "Error",
          description: "Failed to load campaigns",
          variant: "destructive",
        });
      }
    };

    loadCampaigns();
  }, [selectedEvent, user]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalSent = campaigns.reduce((sum, c) => sum + c.emails_sent, 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + c.emails_delivered, 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + c.emails_opened, 0);
    const totalClicked = campaigns.reduce((sum, c) => sum + c.emails_clicked, 0);

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'scheduled' || c.status === 'sending').length,
      totalSent,
      deliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0',
      openRate: totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0',
      clickRate: totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(1) : '0',
    };
  }, [campaigns]);

  // Handle campaign creation/editing
  const handleSaveCampaign = async (campaign: Partial<ReminderCampaign>) => {
    try {
      if (campaign.id) {
        // Update existing campaign
        // await supabase.from('reminder_email_campaigns').update(campaign).eq('id', campaign.id);
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, ...campaign } as ReminderCampaign : c));
        toast({ title: "Success", description: "Campaign updated successfully" });
      } else {
        // Create new campaign
        const newId = Math.random().toString(36).substr(2, 9);
        const fullCampaign: ReminderCampaign = {
          ...campaign,
          id: newId,
          total_recipients: 0,
          emails_sent: 0,
          emails_delivered: 0,
          emails_opened: 0,
          emails_clicked: 0,
        } as ReminderCampaign;

        setCampaigns(prev => [...prev, fullCampaign]);
        toast({ title: "Success", description: "Campaign created successfully" });
      }

      setIsCreating(false);
      setSelectedCampaign(null);
      setNewCampaign({
        name: "",
        description: "",
        status: 'draft',
        template: createDefaultReminderTemplate(),
        subject_line: "⏰ @EventName is coming up soon!",
        send_timing: 'days_before',
        send_value: 7,
        recipient_type: 'all_attendees',
        total_recipients: 0,
        emails_sent: 0,
        emails_delivered: 0,
        emails_opened: 0,
        emails_clicked: 0,
      });
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: "Error",
        description: "Failed to save campaign",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      // await supabase.from('reminder_email_campaigns').delete().eq('id', campaignId);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      toast({ title: "Success", description: "Campaign deleted successfully" });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: ReminderCampaign['status']) => {
    const statusConfig = {
      draft: { color: "secondary", icon: Edit },
      scheduled: { color: "default", icon: Calendar },
      sending: { color: "default", icon: Send },
      sent: { color: "secondary", icon: CheckCircle },
      paused: { color: "secondary", icon: Pause },
      cancelled: { color: "destructive", icon: AlertCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!selectedEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select an event to manage reminder emails</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Event Selection */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reminder Email Campaigns</h2>
          <p className="text-muted-foreground">Automate reminder emails for your attendees</p>
        </div>

        <Select value={selectedEvent.id} onValueChange={(value) => {
          const event = events.find(e => e.id === value);
          if (event) setSelectedEvent(event);
        }}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {events.map(event => (
              <SelectItem key={event.id} value={event.id}>
                {event.name} - {new Date(event.event_date).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.openRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.clickRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="create">Create Campaign</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {activeTab === "campaigns" && (
            <Button onClick={() => setActiveTab("create")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          )}
        </div>

        {/* Campaigns List */}
        <TabsContent value="campaigns" className="space-y-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No reminder campaigns yet</p>
                  <Button onClick={() => setActiveTab("create")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {campaign.name}
                          {getStatusBadge(campaign.status)}
                        </CardTitle>
                        <CardDescription>{campaign.description}</CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedCampaign(campaign);
                          setNewCampaign(campaign);
                          setActiveTab("create");
                        }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCampaign(campaign.id!)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium">Schedule</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.send_value} {campaign.send_timing.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Recipients</p>
                        <p className="text-sm text-muted-foreground">{campaign.total_recipients} attendees</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Sent</p>
                        <p className="text-sm text-muted-foreground">{campaign.emails_sent}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Open Rate</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.emails_delivered > 0 ?
                            ((campaign.emails_opened / campaign.emails_delivered) * 100).toFixed(1) : '0'
                          }%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Create/Edit Campaign */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedCampaign ? 'Edit Campaign' : 'Create New Campaign'}</CardTitle>
              <CardDescription>
                Set up an automated reminder email for your event attendees
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Campaign Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., One Week Reminder"
                  />
                </div>

                <div>
                  <Label htmlFor="recipient-type">Recipients</Label>
                  <Select
                    value={newCampaign.recipient_type}
                    onValueChange={(value: any) => setNewCampaign(prev => ({ ...prev, recipient_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_attendees">All Attendees</SelectItem>
                      <SelectItem value="ticket_holders_only">Ticket Holders Only</SelectItem>
                      <SelectItem value="custom_segment">Custom Segment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="campaign-description">Description (Optional)</Label>
                <Textarea
                  id="campaign-description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this campaign..."
                />
              </div>

              {/* Scheduling */}
              <div>
                <Label>Schedule</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Select
                    value={newCampaign.send_timing}
                    onValueChange={(value: any) => setNewCampaign(prev => ({ ...prev, send_timing: value }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days_before">Days Before</SelectItem>
                      <SelectItem value="hours_before">Hours Before</SelectItem>
                      <SelectItem value="specific_datetime">Specific Date</SelectItem>
                    </SelectContent>
                  </Select>

                  {newCampaign.send_timing !== 'specific_datetime' && (
                    <Input
                      type="number"
                      min="1"
                      className="w-20"
                      value={newCampaign.send_value}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, send_value: parseInt(e.target.value) }))}
                    />
                  )}

                  {newCampaign.send_timing === 'specific_datetime' && (
                    <Input
                      type="datetime-local"
                      className="w-64"
                      value={newCampaign.send_datetime}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, send_datetime: e.target.value }))}
                    />
                  )}
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <Label htmlFor="subject-line">Subject Line</Label>
                <Input
                  id="subject-line"
                  value={newCampaign.subject_line}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, subject_line: e.target.value }))}
                  placeholder="⏰ @EventName is coming up soon!"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Use @EventName, @FirstName, @DaysUntilEvent and other personalization variables
                </p>
              </div>

              <Separator />

              {/* Email Template Builder */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Email Template</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {showPreview ? 'Hide' : 'Show'} Preview
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <EmailTemplateBuilder
                      template={newCampaign.template}
                      templateType="reminder_email"
                      onChange={(template) => setNewCampaign(prev => ({ ...prev, template }))}
                    />
                  </div>

                  {showPreview && (
                    <div>
                      <EmailTemplatePreview
                        emailCustomization={{
                          template: {
                            theme: 'default',
                            headerColor: newCampaign.template?.theme?.headerColor || '#1f2937',
                            backgroundColor: newCampaign.template?.theme?.backgroundColor || '#ffffff',
                            textColor: newCampaign.template?.theme?.textColor || '#374151',
                            buttonColor: newCampaign.template?.theme?.buttonColor || '#1f2937',
                            accentColor: newCampaign.template?.theme?.accentColor || '#f9fafb',
                            borderColor: newCampaign.template?.theme?.borderColor || '#e5e7eb',
                            fontFamily: newCampaign.template?.theme?.fontFamily || "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
                          },
                          branding: {
                            showLogo: true,
                            logoPosition: 'header',
                            logoSize: 'medium'
                          }
                        }}
                        blocksTemplate={newCampaign.template}
                        eventDetails={{
                          name: selectedEvent.name,
                          venue: selectedEvent.venue || 'Sample Venue',
                          event_date: selectedEvent.event_date
                        }}
                        organizationDetails={{
                          name: 'Your Organization'
                        }}
                        className="max-h-96 overflow-y-auto"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("campaigns");
                    setSelectedCampaign(null);
                    setNewCampaign({
                      name: "",
                      description: "",
                      status: 'draft',
                      template: createDefaultReminderTemplate(),
                      subject_line: "⏰ @EventName is coming up soon!",
                      send_timing: 'days_before',
                      send_value: 7,
                      recipient_type: 'all_attendees',
                      total_recipients: 0,
                      emails_sent: 0,
                      emails_delivered: 0,
                      emails_opened: 0,
                      emails_clicked: 0,
                    });
                  }}
                >
                  Cancel
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSaveCampaign({ ...newCampaign, status: 'draft' })}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>

                  <Button onClick={() => handleSaveCampaign({ ...newCampaign, status: 'scheduled' })}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Campaign
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Analytics</CardTitle>
              <CardDescription>
                Performance metrics for your reminder email campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Detailed analytics will be available once campaigns start sending
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};