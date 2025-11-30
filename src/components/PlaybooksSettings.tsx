import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Target,
  Heart,
  Handshake,
  Rocket,
  Video,
  Plus,
  CheckCircle,
  AlertTriangle,
  Shield,
  FileText,
  Users,
  BarChart3,
  Loader2,
} from 'lucide-react';

interface PlaybooksSettingsProps {
  organizationId: string;
}

interface Playbook {
  id: string;
  name: string;
  description: string;
  playbook_type: string;
  icon: string;
  color: string;
}

const PLAYBOOK_ICONS: Record<string, React.ReactNode> = {
  '🎯': <Target className="h-6 w-6" />,
  '💝': <Heart className="h-6 w-6" />,
  '🤝': <Handshake className="h-6 w-6" />,
  '🚀': <Rocket className="h-6 w-6" />,
  '🎥': <Video className="h-6 w-6" />,
};

export function PlaybooksSettings({ organizationId }: PlaybooksSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playbooksEnabled, setPlaybooksEnabled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsCheckboxes, setTermsCheckboxes] = useState({
    dataProcessing: false,
    crmSync: false,
    attendeeTracking: false,
    privacyPolicy: false,
  });

  useEffect(() => {
    loadSettings();
  }, [organizationId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load organization settings
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('playbooks_enabled, playbooks_terms_accepted_at')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      setPlaybooksEnabled(org?.playbooks_enabled || false);
      setTermsAccepted(!!org?.playbooks_terms_accepted_at);
      setTermsAcceptedAt(org?.playbooks_terms_accepted_at);

      // Load playbooks if enabled
      if (org?.playbooks_enabled) {
        const { data: playbooksData } = await supabase
          .from('event_playbooks')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at');

        setPlaybooks(playbooksData || []);
      }
    } catch (error) {
      console.error('Error loading playbooks settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load playbooks settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePlaybooks = async () => {
    // Check if all terms are accepted
    const allAccepted = Object.values(termsCheckboxes).every(Boolean);
    if (!allAccepted) {
      toast({
        title: 'Terms Required',
        description: 'Please accept all terms and conditions to enable Playbooks',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Update organization settings
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          playbooks_enabled: true,
          playbooks_terms_accepted_at: new Date().toISOString(),
          playbooks_terms_accepted_by: user?.id,
        })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      // Create default playbooks
      const { error: rpcError } = await supabase.rpc('create_default_playbooks_for_org', {
        p_organization_id: organizationId,
      });

      if (rpcError) {
        console.error('Error creating default playbooks:', rpcError);
        // Non-fatal - continue anyway
      }

      setShowTermsDialog(false);
      setPlaybooksEnabled(true);
      setTermsAccepted(true);
      setTermsAcceptedAt(new Date().toISOString());

      toast({
        title: 'Playbooks Enabled',
        description: 'Event Marketing Playbooks are now available for your organization',
      });

      // Reload to get the created playbooks
      loadSettings();
    } catch (error: any) {
      console.error('Error enabling playbooks:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to enable playbooks',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisablePlaybooks = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ playbooks_enabled: false })
        .eq('id', organizationId);

      if (error) throw error;

      setPlaybooksEnabled(false);
      toast({
        title: 'Playbooks Disabled',
        description: 'Event Marketing Playbooks have been disabled. Your data is preserved.',
      });
    } catch (error: any) {
      console.error('Error disabling playbooks:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to disable playbooks',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Event Marketing Playbooks</CardTitle>
                <CardDescription>
                  Run targeted event campaigns with CRM integration, attendee tracking, and follow-up automation
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={playbooksEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  setShowTermsDialog(true);
                } else {
                  handleDisablePlaybooks();
                }
              }}
              disabled={saving}
            />
          </div>
        </CardHeader>

        {playbooksEnabled && (
          <CardContent className="space-y-6">
            {/* Status Banner */}
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Playbooks enabled
                {termsAcceptedAt && (
                  <span className="text-green-600 dark:text-green-400 ml-1">
                    · Terms accepted on {new Date(termsAcceptedAt).toLocaleDateString()}
                  </span>
                )}
              </span>
            </div>

            {/* Available Playbooks */}
            <div>
              <h3 className="text-sm font-medium mb-3">Available Playbooks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playbooks.map((playbook) => (
                  <Card key={playbook.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${playbook.color}20` }}
                        >
                          {PLAYBOOK_ICONS[playbook.icon] || <Target className="h-5 w-5" style={{ color: playbook.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{playbook.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {playbook.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Create Custom Playbook */}
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
                  <CardContent className="p-4 flex items-center justify-center h-full min-h-[100px]">
                    <div className="text-center">
                      <Plus className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Create Custom Playbook</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Features Overview */}
            <div>
              <h3 className="text-sm font-medium mb-3">Features Included</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Guest list management with CRM import</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Private & invite-only events</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Attendee notes & conversation tracking</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span>Post-event analytics & CRM enrichment</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Terms & Conditions Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Enable Event Marketing Playbooks
            </DialogTitle>
            <DialogDescription>
              Please review and accept the following terms to enable Playbooks for your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Data Processing Notice */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="data-processing">
                <AccordionTrigger className="text-sm font-medium">
                  Data Processing & Storage
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    When you enable Playbooks, TicketFlo will process and store additional data about your event attendees including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Contact information (name, email, company, job title)</li>
                    <li>Event engagement data (invites sent, opens, clicks, registrations)</li>
                    <li>Attendance records and check-in timestamps</li>
                    <li>Notes and observations recorded by your team during events</li>
                    <li>Outcome tags and follow-up actions</li>
                  </ul>
                  <p className="mt-2">
                    This data is stored securely and only accessible by authorized members of your organization.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="crm-sync">
                <AccordionTrigger className="text-sm font-medium">
                  CRM Integration & Data Sync
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    If you connect a CRM (HubSpot, Pipedrive, Salesforce, etc.), TicketFlo may:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Import contact lists and segments from your CRM</li>
                    <li>Update contact records with event attendance data</li>
                    <li>Create timeline events showing event interactions</li>
                    <li>Add contacts to lists/segments based on event outcomes</li>
                    <li>Trigger workflows based on attendance or engagement</li>
                  </ul>
                  <p className="mt-2">
                    You control which data is synced and can disable CRM sync at any time. CRM connections can be managed in Apps settings.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="attendee-tracking">
                <AccordionTrigger className="text-sm font-medium">
                  Attendee Tracking & Privacy
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Playbooks enables enhanced tracking of event attendees. You are responsible for:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Obtaining appropriate consent from attendees for data collection</li>
                    <li>Including privacy notices in event invitations and registration forms</li>
                    <li>Complying with GDPR, CCPA, and other applicable privacy regulations</li>
                    <li>Responding to data subject access and deletion requests</li>
                  </ul>
                  <p className="mt-2">
                    TicketFlo provides tools to capture consent and manage data retention, but you remain the data controller.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="widget-disclosure">
                <AccordionTrigger className="text-sm font-medium">
                  Widget & Public Event Pages
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    When using tracked invite links or engagement tracking on public event pages:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Visitors may be identified via unique invite codes in URLs</li>
                    <li>Page views, clicks, and form interactions may be tracked</li>
                    <li>This data is associated with the invited contact's record</li>
                  </ul>
                  <p className="mt-2">
                    We recommend including appropriate disclosures on your event pages when using tracked links.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Consent Checkboxes */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="dataProcessing"
                  checked={termsCheckboxes.dataProcessing}
                  onCheckedChange={(checked) =>
                    setTermsCheckboxes((prev) => ({ ...prev, dataProcessing: checked as boolean }))
                  }
                />
                <Label htmlFor="dataProcessing" className="text-sm leading-relaxed cursor-pointer">
                  I understand that enabling Playbooks will process and store additional attendee data as described above.
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="crmSync"
                  checked={termsCheckboxes.crmSync}
                  onCheckedChange={(checked) =>
                    setTermsCheckboxes((prev) => ({ ...prev, crmSync: checked as boolean }))
                  }
                />
                <Label htmlFor="crmSync" className="text-sm leading-relaxed cursor-pointer">
                  I understand that CRM integrations may sync attendee data bi-directionally between TicketFlo and connected CRM systems.
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="attendeeTracking"
                  checked={termsCheckboxes.attendeeTracking}
                  onCheckedChange={(checked) =>
                    setTermsCheckboxes((prev) => ({ ...prev, attendeeTracking: checked as boolean }))
                  }
                />
                <Label htmlFor="attendeeTracking" className="text-sm leading-relaxed cursor-pointer">
                  I accept responsibility for obtaining appropriate consent from attendees and complying with applicable privacy regulations.
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="privacyPolicy"
                  checked={termsCheckboxes.privacyPolicy}
                  onCheckedChange={(checked) =>
                    setTermsCheckboxes((prev) => ({ ...prev, privacyPolicy: checked as boolean }))
                  }
                />
                <Label htmlFor="privacyPolicy" className="text-sm leading-relaxed cursor-pointer">
                  I have read and agree to the{' '}
                  <a href="/privacy" target="_blank" className="text-primary hover:underline">
                    TicketFlo Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a href="/terms" target="_blank" className="text-primary hover:underline">
                    Terms of Service
                  </a>
                  .
                </Label>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Organization-wide setting:</strong> Enabling Playbooks applies to all users in your organization. All team members with event access will be able to use Playbooks features.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTermsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEnablePlaybooks}
              disabled={saving || !Object.values(termsCheckboxes).every(Boolean)}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                'Enable Playbooks'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
