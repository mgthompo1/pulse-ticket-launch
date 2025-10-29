import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Mail,
  Phone,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  FileText,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

interface EnquiryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  enquiry: any;
  onUpdate?: () => void;
}

export const EnquiryDetailModal = ({
  isOpen,
  onClose,
  enquiry,
  onUpdate,
}: EnquiryDetailModalProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [adminNotes, setAdminNotes] = useState(enquiry?.admin_notes || '');
  const [adminResponse, setAdminResponse] = useState(enquiry?.admin_response || '');

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('contact_enquiries')
        .update({
          status: newStatus,
        })
        .eq('id', enquiry.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Status updated to ${newStatus}`,
      });

      onUpdate?.();
      onClose();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('contact_enquiries')
        .update({
          admin_notes: adminNotes,
        })
        .eq('id', enquiry.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Internal notes saved',
      });

      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save notes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendResponse = async () => {
    if (!adminResponse.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a response',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('contact_enquiries')
        .update({
          admin_response: adminResponse,
          responded_at: new Date().toISOString(),
          responded_by: 'admin@ticketflo.org',
          status: 'in_progress',
        })
        .eq('id', enquiry.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Response saved. You can send this via email separately.',
      });

      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving response:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save response',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      open: { variant: 'default', icon: AlertCircle },
      in_progress: { variant: 'secondary', icon: Clock },
      closed: { variant: 'default', icon: CheckCircle },
    };

    const config = variants[status] || variants.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (!enquiry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5" />
              <span>Enquiry Details</span>
            </div>
            {getStatusBadge(enquiry.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enquiry Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Name</Label>
                  <div className="text-sm font-medium mt-1">{enquiry.name}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${enquiry.email}`} className="text-sm text-blue-600 hover:underline">
                      {enquiry.email}
                    </a>
                  </div>
                </div>
                {enquiry.phone && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Phone</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${enquiry.phone}`} className="text-sm text-blue-600 hover:underline">
                        {enquiry.phone}
                      </a>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-muted-foreground">Type</Label>
                  <div className="text-sm mt-1">
                    <Badge variant={enquiry.enquiry_type === 'support' ? 'default' : 'secondary'}>
                      {enquiry.enquiry_type === 'support' ? 'Support Ticket' : 'General Enquiry'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm text-muted-foreground">Message</Label>
                <div className="bg-muted/50 p-4 rounded-lg text-sm mt-2 whitespace-pre-wrap">
                  {enquiry.message}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Created: {format(new Date(enquiry.created_at), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                {enquiry.updated_at !== enquiry.created_at && (
                  <span>Updated: {format(new Date(enquiry.updated_at), 'MMM dd, yyyy HH:mm')}</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admin Response */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5" />
                Response
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {enquiry.admin_response && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Response Sent</span>
                  </div>
                  <p className="text-sm text-blue-700 whitespace-pre-wrap">{enquiry.admin_response}</p>
                  {enquiry.responded_at && (
                    <p className="text-xs text-blue-600 mt-2">
                      Sent on {format(new Date(enquiry.responded_at), 'MMM dd, yyyy HH:mm')}
                      {enquiry.responded_by && ` by ${enquiry.responded_by}`}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="response">Response to User</Label>
                <Textarea
                  id="response"
                  placeholder="Type your response to the user here..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be saved in the system. You can copy and paste it into an email to send to the user.
                </p>
              </div>

              <Button
                onClick={handleSendResponse}
                disabled={saving || !adminResponse.trim()}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Save Response
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Private Notes (not visible to user)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add internal notes about this enquiry..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <Button
                onClick={handleSaveNotes}
                disabled={saving}
                variant="outline"
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Save Notes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Status Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleStatusUpdate('open')}
                  disabled={saving || enquiry.status === 'open'}
                  variant={enquiry.status === 'open' ? 'default' : 'outline'}
                  className="flex-1"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Open
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('in_progress')}
                  disabled={saving || enquiry.status === 'in_progress'}
                  variant={enquiry.status === 'in_progress' ? 'default' : 'outline'}
                  className="flex-1"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  In Progress
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('closed')}
                  disabled={saving || enquiry.status === 'closed'}
                  variant={enquiry.status === 'closed' ? 'default' : 'outline'}
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Closed
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
