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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  Info,
  Mail,
  User,
  Calendar,
  DollarSign
} from "lucide-react";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  total_orders: number;
  lifetime_value: number;
  last_order_date: string | null;
}

interface ComposeEmailModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  orderId?: string;
}

interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
  description: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    name: "Thank You",
    description: "Thank customer for their support",
    subject: "Thank you for your support!",
    body: `<p>Hi {{FirstName}},</p>

<p>I wanted to personally reach out and thank you for your continued support. Your patronage means the world to us!</p>

<p>We truly appreciate customers like you who help make our events special.</p>

<p>Looking forward to seeing you at future events!</p>`,
  },
  {
    name: "Follow Up",
    description: "Check in after an event",
    subject: "How was your experience?",
    body: `<p>Hi {{FirstName}},</p>

<p>I hope you enjoyed the event! We'd love to hear about your experience.</p>

<p>Your feedback helps us make our events even better. If you have a moment, please let us know how we did.</p>

<p>We hope to see you again soon!</p>`,
  },
  {
    name: "Upcoming Event",
    description: "Notify about upcoming events",
    subject: "You won't want to miss this!",
    body: `<p>Hi {{FirstName}},</p>

<p>We have some exciting events coming up that I think you'll love!</p>

<p>As one of our valued customers, I wanted to give you a heads up so you can get your tickets before they sell out.</p>

<p>Check out our latest events and I hope to see you there!</p>`,
  },
  {
    name: "Special Offer",
    description: "Share exclusive offers",
    subject: "Exclusive offer just for you",
    body: `<p>Hi {{FirstName}},</p>

<p>As a valued customer, we wanted to offer you something special!</p>

<p>We're offering exclusive early access to tickets for our upcoming events.</p>

<p>This is our way of saying thank you for your continued support.</p>`,
  },
];

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  contact,
  open,
  onOpenChange,
  onSuccess,
  orderId,
}) => {
  const { currentOrganization } = useOrganizations();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showTemplates, setShowTemplates] = useState(true);

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setSubject("");
      setBodyHtml("");
      setError("");
      setShowTemplates(true);
    }
  }, [open]);

  const replaceVariables = (text: string): string => {
    if (!contact) return text;

    const firstName = contact.first_name || contact.full_name?.split(' ')[0] || 'there';
    const lastName = contact.last_name || contact.full_name?.split(' ').slice(1).join(' ') || '';
    const fullName = contact.full_name || `${firstName} ${lastName}`.trim();

    return text
      .replace(/{{FirstName}}/g, firstName)
      .replace(/{{LastName}}/g, lastName)
      .replace(/{{FullName}}/g, fullName)
      .replace(/{{Email}}/g, contact.email)
      .replace(/{{TotalOrders}}/g, contact.total_orders.toString())
      .replace(/{{LifetimeValue}}/g, `$${contact.lifetime_value.toFixed(2)}`);
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSubject(replaceVariables(template.subject));
    setBodyHtml(replaceVariables(template.body));
    setShowTemplates(false);
  };

  const handleSend = async () => {
    if (!contact || !currentOrganization) return;

    setError("");

    // Validate
    if (!subject.trim()) {
      setError("Please enter a subject");
      return;
    }
    if (!bodyHtml.trim()) {
      setError("Please enter a message");
      return;
    }

    setSending(true);

    try {
      const { data, error: sendError } = await supabase.functions.invoke('send-crm-email', {
        body: {
          contactId: contact.id,
          organizationId: currentOrganization.id,
          subject: subject.trim(),
          bodyHtml: bodyHtml.trim(),
          orderId: orderId || null,
        },
      });

      if (sendError) throw sendError;

      console.log("✅ Email sent:", data);

      toast({
        title: "Email Sent",
        description: `Your email was sent to ${contact.email}`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("❌ Error sending email:", err);
      setError(err.message || "Failed to send email");
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!contact) return null;

  const displayName = contact.full_name ||
    `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
    contact.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Email
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Sending to: <strong>{displayName}</strong> ({contact.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Variables Info */}
          {!showTemplates && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm">
                  <strong>Available variables:</strong>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">{'{{FirstName}}'}</Badge>
                    <Badge variant="secondary">{'{{LastName}}'}</Badge>
                    <Badge variant="secondary">{'{{FullName}}'}</Badge>
                    <Badge variant="secondary">{'{{Email}}'}</Badge>
                    <Badge variant="secondary">{'{{TotalOrders}}'}</Badge>
                    <Badge variant="secondary">{'{{LifetimeValue}}'}</Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Templates */}
          {showTemplates ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <Label>Quick Start Templates</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EMAIL_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handleTemplateSelect(template)}
                    className="text-left p-4 border rounded-lg hover:bg-slate-50 hover:border-blue-500 transition-colors group"
                  >
                    <div className="font-medium text-sm mb-1 group-hover:text-blue-600">
                      {template.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(false)}
                className="w-full"
              >
                Start from scratch
              </Button>
            </div>
          ) : (
            <>
              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Enter email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={sending}
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  placeholder="Write your message... (HTML supported)"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  disabled={sending}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  HTML formatting is supported. Use template variables to personalize the message.
                </p>
              </div>

              {/* Customer Context */}
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <div className="text-sm space-y-1">
                    <div className="font-medium mb-2">Customer Context:</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Lifetime Value: ${contact.lifetime_value.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Total Orders: {contact.total_orders}
                      </div>
                      {contact.last_order_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last Order: {new Date(contact.last_order_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(true)}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Use a template instead
              </Button>
            </>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || showTemplates || !subject.trim() || !bodyHtml.trim()}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
