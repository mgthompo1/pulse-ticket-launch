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
import { Progress } from "@/components/ui/progress";
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
  Users,
  CheckCircle,
  XCircle
} from "lucide-react";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
}

interface BulkEmailModalProps {
  contacts: Contact[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
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
    description: "Thank customers for their support",
    subject: "Thank you for your support!",
    body: `<p>Hi {{FirstName}},</p>

<p>I wanted to personally reach out and thank you for your continued support. Your patronage means the world to us!</p>

<p>We truly appreciate customers like you who help make our events special.</p>

<p>Looking forward to seeing you at future events!</p>`,
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
    name: "Newsletter",
    description: "Regular updates to customers",
    subject: "What's new this month",
    body: `<p>Hi {{FirstName}},</p>

<p>Here's what's happening this month!</p>

<p>We have several exciting events and announcements to share with you.</p>

<p>Thank you for being part of our community!</p>`,
  },
];

export const BulkEmailModal: React.FC<BulkEmailModalProps> = ({
  contacts,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { currentOrganization } = useOrganizations();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showTemplates, setShowTemplates] = useState(true);

  // Progress tracking
  const [sendProgress, setSendProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setSubject("");
      setBodyHtml("");
      setError("");
      setShowTemplates(true);
      setSendProgress(0);
      setSuccessCount(0);
      setFailureCount(0);
    }
  }, [open]);

  const replaceVariables = (text: string, contact: Contact): string => {
    const firstName = contact.first_name || contact.full_name?.split(' ')[0] || 'there';
    const lastName = contact.last_name || contact.full_name?.split(' ').slice(1).join(' ') || '';
    const fullName = contact.full_name || `${firstName} ${lastName}`.trim();

    return text
      .replace(/{{FirstName}}/g, firstName)
      .replace(/{{LastName}}/g, lastName)
      .replace(/{{FullName}}/g, fullName)
      .replace(/{{Email}}/g, contact.email);
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSubject(template.subject);
    setBodyHtml(template.body);
    setShowTemplates(false);
  };

  const handleSend = async () => {
    if (!currentOrganization) return;

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
    if (contacts.length === 0) {
      setError("No contacts selected");
      return;
    }

    setSending(true);
    setSuccessCount(0);
    setFailureCount(0);
    setSendProgress(0);

    let sent = 0;
    let failed = 0;

    // Send emails one by one to track progress
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      try {
        // Personalize the content for each recipient
        const personalizedBody = replaceVariables(bodyHtml, contact);
        const personalizedSubject = replaceVariables(subject, contact);

        const response = await supabase.functions.invoke('send-crm-email', {
          body: {
            contactId: contact.id,
            organizationId: currentOrganization.id,
            subject: personalizedSubject.trim(),
            bodyHtml: personalizedBody.trim(),
          },
        });

        console.log('Full response:', response);

        // Try to read the response body
        if (response.error && response.response) {
          try {
            const errorText = await response.response.clone().text();
            console.error('Response body:', errorText);
          } catch (e) {
            console.error('Could not read response body');
          }
        }

        if (response.error) {
          console.error(`❌ Error sending email to ${contact.email}:`, response.error);
          console.error('Function response data:', response.data);
          throw response.error;
        }

        sent++;
        setSuccessCount(sent);
      } catch (err: any) {
        console.error(`❌ Error sending email to ${contact.email}:`, err);
        console.error('Full error details:', JSON.stringify(err, null, 2));
        failed++;
        setFailureCount(failed);
      }

      // Update progress
      setSendProgress(((i + 1) / contacts.length) * 100);

      // Small delay to avoid rate limiting
      if (i < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setSending(false);

    if (sent > 0) {
      toast({
        title: "Emails Sent",
        description: `Successfully sent ${sent} email${sent !== 1 ? 's' : ''} ${failed > 0 ? `(${failed} failed)` : ''}`,
      });

      if (failed === 0) {
        onSuccess?.();
        onOpenChange(false);
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to send any emails",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Send Bulk Email
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Sending to {contacts.length} {contacts.length === 1 ? 'customer' : 'customers'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients Preview */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm">
                <strong>Recipients ({contacts.length}):</strong>
                <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                  {contacts.slice(0, 10).map((contact) => (
                    <Badge key={contact.id} variant="secondary" className="text-xs">
                      {contact.full_name || contact.email}
                    </Badge>
                  ))}
                  {contacts.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{contacts.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Template Variables Info */}
          {!showTemplates && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm">
                  <strong>Personalization:</strong> Each email will be personalized with the recipient's information.
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">{'{{FirstName}}'}</Badge>
                    <Badge variant="secondary">{'{{LastName}}'}</Badge>
                    <Badge variant="secondary">{'{{FullName}}'}</Badge>
                    <Badge variant="secondary">{'{{Email}}'}</Badge>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  placeholder="Write your message... (HTML supported, use template variables)"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  disabled={sending}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  HTML formatting is supported. Use template variables to personalize each message.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(true)}
                className="w-full"
                disabled={sending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Use a template instead
              </Button>
            </>
          )}

          {/* Progress */}
          {sending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Sending emails...</span>
                <span>{Math.round(sendProgress)}%</span>
              </div>
              <Progress value={sendProgress} className="h-2" />
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {successCount} sent
                </div>
                {failureCount > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" />
                    {failureCount} failed
                  </div>
                )}
              </div>
            </div>
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
            {sending ? 'Close' : 'Cancel'}
          </Button>
          {!sending && (
            <Button
              onClick={handleSend}
              disabled={showTemplates || !subject.trim() || !bodyHtml.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Send to {contacts.length} {contacts.length === 1 ? 'Customer' : 'Customers'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
