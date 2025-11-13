import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, AlertCircle, Calendar, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatEventDateRange } from "@/lib/dateUtils";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  event_end_date?: string | null;
  status: string;
}

interface SendEventLinkModalProps {
  contact: Contact | null;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SendEventLinkModal: React.FC<SendEventLinkModalProps> = ({
  contact,
  organizationId,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  useEffect(() => {
    if (open && organizationId) {
      loadEvents();
    }
  }, [open, organizationId]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, event_end_date, status")
        .eq("organization_id", organizationId)
        .in("status", ["published", "draft"])
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error("Error loading events:", err);
    }
  };

  const handleSend = async () => {
    if (!contact || !selectedEventId) return;

    setError("");
    setLoading(true);

    try {
      const selectedEvent = events.find(e => e.id === selectedEventId);
      if (!selectedEvent) throw new Error("Event not found");

      const widgetUrl = `${window.location.origin}/widget/${selectedEventId}`;
      const customerName = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'there';

      const emailBody = `
        <p>Hi ${customerName},</p>

        <p>We'd love to have you at <strong>${selectedEvent.name}</strong>!</p>

        <p>You can purchase your tickets using the link below:</p>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${widgetUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Get Your Tickets
          </a>
        </div>

        <p>Or copy this link: <a href="${widgetUrl}">${widgetUrl}</a></p>

        <p>Event Date: ${formatEventDateRange(
          selectedEvent.event_date,
          selectedEvent.event_end_date,
          { dateStyle: 'full' },
          'en-US'
        )}</p>

        <p>If you have any questions, just reply to this email!</p>
      `;

      // Send email using existing send-crm-email function
      const { error: emailError } = await supabase.functions.invoke('send-crm-email', {
        body: {
          contactId: contact.id,
          organizationId: organizationId,
          subject: `Tickets for ${selectedEvent.name}`,
          bodyHtml: emailBody,
        },
      });

      if (emailError) throw emailError;

      toast({
        title: "Event Link Sent",
        description: `Ticket link for ${selectedEvent.name} sent to ${contact.email}`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error sending event link:", err);
      setError(err.message || "Failed to send event link");
    } finally {
      setLoading(false);
    }
  };

  if (!contact) return null;

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Event Ticket Link
          </DialogTitle>
          <DialogDescription>
            Send a direct ticket purchase link to {contact.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm">
                <strong>Customer:</strong> {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
                <br />
                <strong>Email:</strong> {contact.email}
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="event">Select Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{event.name}</span>
                      <Badge variant={event.status === 'published' ? 'default' : 'secondary'} className="ml-2">
                        {event.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEvent && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm">
                  <strong>Event Date:</strong>{' '}
                  {formatEventDateRange(
                    selectedEvent.event_date,
                    selectedEvent.event_end_date,
                    { dateStyle: 'full' },
                    'en-US'
                  )}
                  <br />
                  <strong>Widget Link:</strong>{' '}
                  <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                    {window.location.origin}/widget/{selectedEventId}
                  </code>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading || !selectedEventId}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
