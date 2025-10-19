import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Mail,
  Send,
  Eye,
  Save,
  Calendar,
  Clock,
  Users
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

interface PromotionalEmailProps {
  selectedEvent: Event;
}

export const PromotionalEmail: React.FC<PromotionalEmailProps> = ({ selectedEvent }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showPreview, setShowPreview] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const [emailData, setEmailData] = useState({
    subject: "",
    description: "",
    template: createDefaultReminderTemplate(),
    recipient_type: "all" as "all" | "past_attendees" | "interests" | "location",
    scheduled_datetime: "",
  });

  const handleSendNow = async () => {
    if (!emailData.subject.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get user's organization
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!orgMember) {
        throw new Error("Organization not found");
      }

      // Create promotional email record
      const { data: emailRecord, error } = await supabase
        .from('promotional_emails')
        .insert({
          organization_id: orgMember.organization_id,
          event_id: selectedEvent.id,
          subject_line: emailData.subject,
          description: emailData.description,
          template: emailData.template,
          recipient_type: emailData.recipient_type,
          status: 'sending',
          send_immediately: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Email Sending",
        description: "Your promotional email is being sent to recipients",
      });

      // Reset form
      setEmailData({
        subject: "",
        description: "",
        template: createDefaultReminderTemplate(),
        recipient_type: "all",
        scheduled_datetime: "",
      });
      setScheduleEnabled(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send promotional email",
        variant: "destructive",
      });
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
      // Get user's organization
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!orgMember) {
        throw new Error("Organization not found");
      }

      // Create scheduled promotional email
      const { data: emailRecord, error } = await supabase
        .from('promotional_emails')
        .insert({
          organization_id: orgMember.organization_id,
          event_id: selectedEvent.id,
          subject_line: emailData.subject,
          description: emailData.description,
          template: emailData.template,
          recipient_type: emailData.recipient_type,
          status: 'scheduled',
          send_immediately: false,
          scheduled_send_time: emailData.scheduled_datetime,
          created_by: user?.id,
        })
        .select()
        .single();

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
        recipient_type: "all",
        scheduled_datetime: "",
      });
      setScheduleEnabled(false);
    } catch (error) {
      console.error('Error scheduling email:', error);
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
      // Get user's organization
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!orgMember) {
        throw new Error("Organization not found");
      }

      // Save as draft
      const { data: emailRecord, error } = await supabase
        .from('promotional_emails')
        .insert({
          organization_id: orgMember.organization_id,
          event_id: selectedEvent.id,
          subject_line: emailData.subject,
          description: emailData.description,
          template: emailData.template,
          recipient_type: emailData.recipient_type,
          status: 'draft',
          send_immediately: false,
          scheduled_send_time: emailData.scheduled_datetime || null,
          created_by: user?.id,
        })
        .select()
        .single();

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
        recipient_type: "all",
        scheduled_datetime: "",
      });
      setScheduleEnabled(false);
    } catch (error) {
      console.error('Error saving draft:', error);
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
          Create and send promotional emails to your audience with customizable templates
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject Line *</Label>
            <Input
              id="email-subject"
              value={emailData.subject}
              onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="🎉 Don't miss out on {Event Name}!"
            />
            <p className="text-xs text-muted-foreground">
              Use variables like {'{Event Name}'}, {'{Date}'}, {'{Venue}'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-type">Audience Segment</Label>
            <Select
              value={emailData.recipient_type}
              onValueChange={(value: any) => setEmailData(prev => ({ ...prev, recipient_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subscribers</SelectItem>
                <SelectItem value="past_attendees">Past Attendees</SelectItem>
                <SelectItem value="interests">By Interests</SelectItem>
                <SelectItem value="location">By Location</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              Email will be sent on {emailData.scheduled_datetime ? new Date(emailData.scheduled_datetime).toLocaleString() : 'selected date'}
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
              {showPreview ? 'Hide' : 'Show'} Preview
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
                      theme: 'default',
                      headerColor: emailData.template?.theme?.headerColor || '#1f2937',
                      backgroundColor: emailData.template?.theme?.backgroundColor || '#ffffff',
                      textColor: emailData.template?.theme?.textColor || '#374151',
                      buttonColor: emailData.template?.theme?.buttonColor || '#1f2937',
                      accentColor: emailData.template?.theme?.accentColor || '#f9fafb',
                      borderColor: emailData.template?.theme?.borderColor || '#e5e7eb',
                      fontFamily: emailData.template?.theme?.fontFamily || "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
                    },
                    branding: {
                      showLogo: true,
                      logoPosition: 'header',
                      logoSize: 'medium'
                    }
                  }}
                  blocksTemplate={emailData.template}
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

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          <div className="flex gap-2">
            {scheduleEnabled ? (
              <Button onClick={handleSchedule}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Email
              </Button>
            ) : (
              <Button onClick={handleSendNow}>
                <Send className="w-4 h-4 mr-2" />
                Send Now
              </Button>
            )}
          </div>
        </div>

        {/* Recipient Count Info */}
        <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-3">
          <Users className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              Estimated Recipients: <span className="text-primary">Calculating...</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Based on your selected audience segment
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
