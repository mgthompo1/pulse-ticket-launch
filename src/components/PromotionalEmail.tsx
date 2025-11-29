import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Mail,
  Send,
  Eye,
  Save,
  Calendar,
  Clock,
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
  Ticket
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizations } from "@/hooks/useOrganizations";
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

interface TicketType {
  id: string;
  name: string;
}

interface Recipient {
  email: string;
  name: string;
}

interface PromotionalEmailProps {
  selectedEvent: Event;
}

type RecipientType = "event_ticket_holders" | "ticket_type" | "all_customers" | "vip_holders";

export const PromotionalEmail: React.FC<PromotionalEmailProps> = ({ selectedEvent }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganizations();
  const [showPreview, setShowPreview] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTicketType, setSelectedTicketType] = useState<string>("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResults, setSendResults] = useState<{ success: number; failed: number } | null>(null);

  const [emailData, setEmailData] = useState({
    subject: "",
    description: "",
    template: createDefaultReminderTemplate(),
    recipient_type: "event_ticket_holders" as RecipientType,
    scheduled_datetime: "",
  });

  // Load ticket types for this event
  useEffect(() => {
    const loadTicketTypes = async () => {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("id, name")
        .eq("event_id", selectedEvent.id)
        .order("name");

      if (!error && data) {
        setTicketTypes(data);
      }
    };

    loadTicketTypes();
  }, [selectedEvent.id]);

  // Calculate recipient count when audience changes
  useEffect(() => {
    const calculateRecipients = async () => {
      if (!currentOrganization?.id) return;

      setLoadingRecipients(true);
      setRecipientCount(null);

      try {
        let count = 0;

        if (emailData.recipient_type === "event_ticket_holders") {
          // All confirmed ticket holders for this event
          const { count: orderCount } = await supabase
            .from("orders")
            .select("customer_email", { count: "exact", head: true })
            .eq("event_id", selectedEvent.id)
            .eq("status", "completed");
          count = orderCount || 0;
        } else if (emailData.recipient_type === "ticket_type" && selectedTicketType) {
          // Ticket holders for specific ticket type
          const { data: orders } = await supabase
            .from("orders")
            .select(`
              customer_email,
              order_items!inner(ticket_type_id)
            `)
            .eq("event_id", selectedEvent.id)
            .eq("status", "completed")
            .eq("order_items.ticket_type_id", selectedTicketType);

          // Get unique emails
          const uniqueEmails = new Set(orders?.map(o => o.customer_email) || []);
          count = uniqueEmails.size;
        } else if (emailData.recipient_type === "vip_holders") {
          // VIP ticket holders (ticket types with "VIP" in name)
          const { data: orders } = await supabase
            .from("orders")
            .select(`
              customer_email,
              order_items!inner(
                ticket_types!inner(name)
              )
            `)
            .eq("event_id", selectedEvent.id)
            .eq("status", "completed")
            .ilike("order_items.ticket_types.name", "%vip%");

          const uniqueEmails = new Set(orders?.map(o => o.customer_email) || []);
          count = uniqueEmails.size;
        } else if (emailData.recipient_type === "all_customers") {
          // All customers from organization's contacts/orders
          const { count: contactCount } = await supabase
            .from("contacts")
            .select("email", { count: "exact", head: true })
            .eq("organization_id", currentOrganization.id);
          count = contactCount || 0;
        }

        setRecipientCount(count);
      } catch (error) {
        console.error("Error calculating recipients:", error);
        setRecipientCount(0);
      } finally {
        setLoadingRecipients(false);
      }
    };

    calculateRecipients();
  }, [emailData.recipient_type, selectedTicketType, selectedEvent.id, currentOrganization?.id]);

  // Get recipients based on selection
  const getRecipients = async (): Promise<Recipient[]> => {
    if (!currentOrganization?.id) return [];

    let recipients: Recipient[] = [];

    if (emailData.recipient_type === "event_ticket_holders") {
      const { data: orders } = await supabase
        .from("orders")
        .select("customer_email, customer_name")
        .eq("event_id", selectedEvent.id)
        .eq("status", "completed");

      // Dedupe by email
      const emailMap = new Map<string, Recipient>();
      orders?.forEach(o => {
        if (!emailMap.has(o.customer_email)) {
          emailMap.set(o.customer_email, { email: o.customer_email, name: o.customer_name || "" });
        }
      });
      recipients = Array.from(emailMap.values());
    } else if (emailData.recipient_type === "ticket_type" && selectedTicketType) {
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          customer_email,
          customer_name,
          order_items!inner(ticket_type_id)
        `)
        .eq("event_id", selectedEvent.id)
        .eq("status", "completed")
        .eq("order_items.ticket_type_id", selectedTicketType);

      const emailMap = new Map<string, Recipient>();
      orders?.forEach(o => {
        if (!emailMap.has(o.customer_email)) {
          emailMap.set(o.customer_email, { email: o.customer_email, name: o.customer_name || "" });
        }
      });
      recipients = Array.from(emailMap.values());
    } else if (emailData.recipient_type === "vip_holders") {
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          customer_email,
          customer_name,
          order_items!inner(
            ticket_types!inner(name)
          )
        `)
        .eq("event_id", selectedEvent.id)
        .eq("status", "completed")
        .ilike("order_items.ticket_types.name", "%vip%");

      const emailMap = new Map<string, Recipient>();
      orders?.forEach(o => {
        if (!emailMap.has(o.customer_email)) {
          emailMap.set(o.customer_email, { email: o.customer_email, name: o.customer_name || "" });
        }
      });
      recipients = Array.from(emailMap.values());
    } else if (emailData.recipient_type === "all_customers") {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("email, full_name, first_name, last_name")
        .eq("organization_id", currentOrganization.id);

      recipients = contacts?.map(c => ({
        email: c.email,
        name: c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()
      })) || [];
    }

    return recipients;
  };

  const handleSendNow = async () => {
    if (!emailData.subject.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "Organization not found",
        variant: "destructive",
      });
      return;
    }

    if (emailData.recipient_type === "ticket_type" && !selectedTicketType) {
      toast({
        title: "Missing Information",
        description: "Please select a ticket type",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setSendProgress(0);
    setSendResults(null);

    try {
      const recipients = await getRecipients();

      if (recipients.length === 0) {
        toast({
          title: "No Recipients",
          description: "No recipients found for the selected audience",
          variant: "destructive",
        });
        setSending(false);
        return;
      }

      // Get organization details for email branding
      const { data: org } = await supabase
        .from("organizations")
        .select("name, email, logo_url")
        .eq("id", currentOrganization.id)
        .single();

      let successCount = 0;
      let failCount = 0;

      // Send emails in batches
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        try {
          // Replace variables in subject
          const personalizedSubject = emailData.subject
            .replace(/\{Event Name\}/g, selectedEvent.name)
            .replace(/\{Date\}/g, new Date(selectedEvent.event_date).toLocaleDateString())
            .replace(/\{Venue\}/g, selectedEvent.venue || "")
            .replace(/\{Name\}/g, recipient.name || "there");

          // Send via edge function
          const { error } = await supabase.functions.invoke("send-promotional-email", {
            body: {
              to: recipient.email,
              recipientName: recipient.name,
              subject: personalizedSubject,
              template: emailData.template,
              eventDetails: {
                name: selectedEvent.name,
                venue: selectedEvent.venue,
                event_date: selectedEvent.event_date,
              },
              organizationDetails: {
                name: org?.name || "Event Organizer",
                email: org?.email,
                logo_url: org?.logo_url,
              },
            },
          });

          if (error) throw error;
          successCount++;
        } catch (err) {
          console.error(`Failed to send to ${recipient.email}:`, err);
          failCount++;
        }

        // Update progress
        setSendProgress(Math.round(((i + 1) / recipients.length) * 100));
      }

      setSendResults({ success: successCount, failed: failCount });

      // Save record
      await supabase.from("promotional_emails").insert({
        organization_id: currentOrganization.id,
        event_id: selectedEvent.id,
        subject_line: emailData.subject,
        description: emailData.description,
        template: emailData.template,
        recipient_type: emailData.recipient_type,
        ticket_type_id: selectedTicketType || null,
        status: "sent",
        send_immediately: true,
        created_by: user?.id,
        recipients_count: recipients.length,
        sent_count: successCount,
        failed_count: failCount,
        sent_at: new Date().toISOString(),
      });

      toast({
        title: "Emails Sent",
        description: `Successfully sent to ${successCount} recipients${failCount > 0 ? `, ${failCount} failed` : ""}`,
      });

      // Reset form after delay
      setTimeout(() => {
        setEmailData({
          subject: "",
          description: "",
          template: createDefaultReminderTemplate(),
          recipient_type: "event_ticket_holders",
          scheduled_datetime: "",
        });
        setSelectedTicketType("");
        setSendResults(null);
        setSendProgress(0);
      }, 3000);
    } catch (error) {
      console.error("Error sending emails:", error);
      toast({
        title: "Error",
        description: "Failed to send promotional emails",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!emailData.subject.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    if (!emailData.scheduled_datetime) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time to send",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save scheduled email - will be processed by a cron job
      const { error } = await supabase.from("promotional_emails").insert({
        organization_id: currentOrganization?.id,
        event_id: selectedEvent.id,
        subject_line: emailData.subject,
        description: emailData.description,
        template: emailData.template,
        recipient_type: emailData.recipient_type,
        ticket_type_id: selectedTicketType || null,
        status: "scheduled",
        send_immediately: false,
        scheduled_send_time: emailData.scheduled_datetime,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Email Scheduled",
        description: `Your promotional email is scheduled for ${new Date(emailData.scheduled_datetime).toLocaleString()}`,
      });

      // Reset form
      setEmailData({
        subject: "",
        description: "",
        template: createDefaultReminderTemplate(),
        recipient_type: "event_ticket_holders",
        scheduled_datetime: "",
      });
      setSelectedTicketType("");
      setScheduleEnabled(false);
    } catch (error) {
      console.error("Error scheduling email:", error);
      toast({
        title: "Error",
        description: "Failed to schedule promotional email",
        variant: "destructive",
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!emailData.subject.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("promotional_emails").insert({
        organization_id: currentOrganization?.id,
        event_id: selectedEvent.id,
        subject_line: emailData.subject,
        description: emailData.description,
        template: emailData.template,
        recipient_type: emailData.recipient_type,
        ticket_type_id: selectedTicketType || null,
        status: "draft",
        send_immediately: false,
        scheduled_send_time: emailData.scheduled_datetime || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Draft Saved",
        description: "Your promotional email draft has been saved",
      });

      // Reset form
      setEmailData({
        subject: "",
        description: "",
        template: createDefaultReminderTemplate(),
        recipient_type: "event_ticket_holders",
        scheduled_datetime: "",
      });
      setSelectedTicketType("");
      setScheduleEnabled(false);
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Promotional Email Marketing
        </CardTitle>
        <CardDescription>
          Send promotional emails to ticket holders for {selectedEvent.name}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sending Progress */}
        {sending && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="ml-2">
              <div className="space-y-2">
                <p>Sending emails... {sendProgress}%</p>
                <Progress value={sendProgress} className="h-2" />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Send Results */}
        {sendResults && (
          <Alert className={sendResults.failed > 0 ? "border-yellow-500" : "border-green-500"}>
            {sendResults.failed > 0 ? (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <AlertDescription className="ml-2">
              <span className="text-green-600">{sendResults.success} sent successfully</span>
              {sendResults.failed > 0 && (
                <span className="text-red-600 ml-2">{sendResults.failed} failed</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Audience Selection */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <Label className="text-base font-semibold">Select Audience</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-type">Audience Segment</Label>
              <Select
                value={emailData.recipient_type}
                onValueChange={(value: RecipientType) => {
                  setEmailData(prev => ({ ...prev, recipient_type: value }));
                  setSelectedTicketType("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event_ticket_holders">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      All Ticket Holders (This Event)
                    </div>
                  </SelectItem>
                  <SelectItem value="ticket_type">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      By Ticket Type
                    </div>
                  </SelectItem>
                  <SelectItem value="vip_holders">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      VIP Ticket Holders
                    </div>
                  </SelectItem>
                  <SelectItem value="all_customers">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      All Customers (Organization)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Secondary selector for ticket type */}
            {emailData.recipient_type === "ticket_type" && (
              <div className="space-y-2">
                <Label htmlFor="ticket-type">Select Ticket Type *</Label>
                {ticketTypes.length > 0 ? (
                  <Select value={selectedTicketType} onValueChange={setSelectedTicketType}>
                    <SelectTrigger className="border-primary/50">
                      <SelectValue placeholder="Choose ticket type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketTypes.map(tt => (
                        <SelectItem key={tt.id} value={tt.id}>
                          {tt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                    No ticket types found for this event
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recipient count badge */}
          <div className="flex items-center gap-2 mt-2">
            {loadingRecipients ? (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Calculating...
              </Badge>
            ) : recipientCount !== null ? (
              <Badge variant={recipientCount > 0 ? "default" : "secondary"}>
                {recipientCount} recipient{recipientCount !== 1 ? "s" : ""} selected
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject Line *</Label>
            <Input
              id="email-subject"
              value={emailData.subject}
              onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="🎉 Don't miss out on {Event Name}!"
            />
            <p className="text-xs text-muted-foreground">
              Use variables: {"{Event Name}"}, {"{Date}"}, {"{Venue}"}, {"{Name}"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Internal Description (Optional)</Label>
            <Textarea
              id="description"
              value={emailData.description}
              onChange={(e) => setEmailData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Internal notes about this campaign..."
              rows={2}
            />
          </div>
        </div>

        {/* Scheduling Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label htmlFor="schedule-toggle" className="cursor-pointer">Schedule for Later</Label>
              <p className="text-sm text-muted-foreground">
                {scheduleEnabled ? "Email will be sent at the scheduled time" : "Email will be sent immediately"}
              </p>
            </div>
          </div>
          <Switch
            id="schedule-toggle"
            checked={scheduleEnabled}
            onCheckedChange={setScheduleEnabled}
          />
        </div>

        {/* Schedule Date/Time Picker */}
        {scheduleEnabled && (
          <div className="space-y-2">
            <Label htmlFor="schedule-datetime">Schedule Date & Time</Label>
            <Input
              id="schedule-datetime"
              type="datetime-local"
              value={emailData.scheduled_datetime}
              onChange={(e) => setEmailData(prev => ({ ...prev, scheduled_datetime: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Email will be sent on {emailData.scheduled_datetime ? new Date(emailData.scheduled_datetime).toLocaleString() : "selected date"}
            </p>
          </div>
        )}

        <Separator />

        {/* Email Template Builder */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Email Template</h3>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? "Hide" : "Show"} Preview
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <EmailTemplateBuilder
                template={emailData.template}
                templateType="promotional_email"
                onChange={(template) => setEmailData(prev => ({ ...prev, template }))}
              />
            </div>

            {showPreview && (
              <div>
                <EmailTemplatePreview
                  emailCustomization={{
                    template: {
                      theme: "default",
                      headerColor: emailData.template?.theme?.headerColor || "#1f2937",
                      backgroundColor: emailData.template?.theme?.backgroundColor || "#ffffff",
                      textColor: emailData.template?.theme?.textColor || "#374151",
                      buttonColor: emailData.template?.theme?.buttonColor || "#1f2937",
                      accentColor: emailData.template?.theme?.accentColor || "#f9fafb",
                      borderColor: emailData.template?.theme?.borderColor || "#e5e7eb",
                      fontFamily: emailData.template?.theme?.fontFamily || "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
                    },
                    branding: {
                      showLogo: true,
                      logoPosition: "header",
                      logoSize: "medium"
                    }
                  }}
                  blocksTemplate={emailData.template}
                  eventDetails={{
                    name: selectedEvent.name,
                    venue: selectedEvent.venue || "Sample Venue",
                    event_date: selectedEvent.event_date
                  }}
                  organizationDetails={{
                    name: currentOrganization?.name || "Your Organization"
                  }}
                  className="max-h-96 overflow-y-auto"
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={sending}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          <div className="flex gap-2">
            {scheduleEnabled ? (
              <Button onClick={handleSchedule} disabled={sending}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Email
              </Button>
            ) : (
              <Button
                onClick={handleSendNow}
                disabled={sending || recipientCount === 0}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Now{recipientCount ? ` (${recipientCount})` : ""}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
