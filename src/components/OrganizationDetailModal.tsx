import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Calendar,
  Ticket,
  DollarSign,
  TrendingUp,
  Pause,
  Play,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Building2,
  Mail,
  CreditCard,
} from 'lucide-react';
import { format, addDays } from 'date-fns';

interface OrganizationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  onUpdate?: () => void;
}

interface OrganizationStats {
  total_events: number;
  active_events: number;
  total_orders: number;
  total_tickets_sold: number;
  total_revenue: number;
  total_platform_fees: number;
  pending_invoices: number;
  next_billing_date: string | null;
  billing_status: string;
  is_trial: boolean;
  trial_days_remaining: number;
}

interface OrganizationDetails {
  id: string;
  name: string;
  email: string;
  billing_suspended: boolean;
  billing_suspended_reason: string | null;
  billing_suspended_at: string | null;
  billing_suspended_by: string | null;
  trial_ends_at: string | null;
  trial_started_at: string | null;
  created_at: string;
}

export const OrganizationDetailModal = ({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  onUpdate,
}: OrganizationDetailModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [details, setDetails] = useState<OrganizationDetails | null>(null);

  // Billing control state
  const [suspendReason, setSuspendReason] = useState('');
  const [trialDays, setTrialDays] = useState(30);

  useEffect(() => {
    if (isOpen) {
      loadOrganizationData();
    }
  }, [isOpen, organizationId]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);

      // Load organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;
      setDetails(orgData);

      // Load statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_organization_stats', { p_organization_id: organizationId });

      if (statsError) throw statsError;
      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (error: any) {
      console.error('Error loading organization data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendBilling = async () => {
    if (!suspendReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for suspending billing',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('organizations')
        .update({
          billing_suspended: true,
          billing_suspended_reason: suspendReason,
          billing_suspended_at: new Date().toISOString(),
          billing_suspended_by: 'admin@ticketflo.org', // You can make this dynamic
        })
        .eq('id', organizationId);

      if (error) throw error;

      // Also update billing_customers table
      await supabase
        .from('billing_customers')
        .update({
          billing_suspended: true,
        })
        .eq('organization_id', organizationId);

      toast({
        title: 'Success',
        description: 'Billing has been suspended for this organization',
      });

      await loadOrganizationData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error suspending billing:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to suspend billing',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setSuspendReason('');
    }
  };

  const handleResumeBilling = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('organizations')
        .update({
          billing_suspended: false,
          billing_suspended_reason: null,
          billing_suspended_at: null,
          billing_suspended_by: null,
        })
        .eq('id', organizationId);

      if (error) throw error;

      // Also update billing_customers table
      await supabase
        .from('billing_customers')
        .update({
          billing_suspended: false,
        })
        .eq('organization_id', organizationId);

      toast({
        title: 'Success',
        description: 'Billing has been resumed for this organization',
      });

      await loadOrganizationData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error resuming billing:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resume billing',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetTrial = async () => {
    try {
      setSaving(true);

      const trialEndsAt = addDays(new Date(), trialDays).toISOString();

      const { error } = await supabase
        .from('organizations')
        .update({
          trial_started_at: new Date().toISOString(),
          trial_ends_at: trialEndsAt,
          billing_suspended: true,
          billing_suspended_reason: `Trial period: ${trialDays} days`,
          billing_suspended_at: new Date().toISOString(),
          billing_suspended_by: 'admin@ticketflo.org',
        })
        .eq('id', organizationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Trial period set for ${trialDays} days`,
      });

      await loadOrganizationData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error setting trial:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to set trial period',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {organizationName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{details?.email || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Created</Label>
                  <div className="text-sm mt-1">
                    {details?.created_at ? format(new Date(details.created_at), 'MMM dd, yyyy') : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Trial Status */}
              {stats?.is_trial && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Trial Period Active
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    {stats.trial_days_remaining} days remaining
                    {details?.trial_ends_at && ` (ends ${format(new Date(details.trial_ends_at), 'MMM dd, yyyy')})`}
                  </p>
                </div>
              )}

              {/* Billing Suspension Status */}
              {details?.billing_suspended && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-900">
                      Billing Suspended
                    </span>
                  </div>
                  {details.billing_suspended_reason && (
                    <p className="text-sm text-yellow-700 mt-1">
                      Reason: {details.billing_suspended_reason}
                    </p>
                  )}
                  {details.billing_suspended_at && (
                    <p className="text-sm text-yellow-600 mt-1">
                      Suspended on {format(new Date(details.billing_suspended_at), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_events || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.active_events || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_tickets_sold || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.total_orders || 0} orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.total_revenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.total_platform_fees || 0)} in fees
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Billing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Billing Status</Label>
                  <div className="mt-1">
                    <Badge variant={stats?.billing_status === 'active' ? 'default' : 'secondary'}>
                      {stats?.billing_status || 'N/A'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Next Billing Date</Label>
                  <div className="text-sm mt-1">
                    {stats?.next_billing_date
                      ? format(new Date(stats.next_billing_date), 'MMM dd, yyyy')
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Pending Invoices</Label>
                  <div className="text-sm mt-1">
                    {stats?.pending_invoices || 0}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total Platform Fees</Label>
                  <div className="text-sm mt-1 font-medium">
                    {formatCurrency(stats?.total_platform_fees || 0)}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Billing Controls */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Billing Controls</h3>

                {!details?.billing_suspended ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="suspend-reason">Reason for Suspension</Label>
                      <Textarea
                        id="suspend-reason"
                        placeholder="e.g., Trial period, special arrangement, etc."
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button
                      onClick={handleSuspendBilling}
                      disabled={saving}
                      variant="destructive"
                      className="w-full"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Suspending...
                        </>
                      ) : (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Suspend Billing
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleResumeBilling}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resuming...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Resume Billing
                      </>
                    )}
                  </Button>
                )}

                <Separator />

                {/* Trial Period */}
                <div className="space-y-3">
                  <Label htmlFor="trial-days">Set Trial Period</Label>
                  <div className="flex gap-2">
                    <Input
                      id="trial-days"
                      type="number"
                      min="1"
                      max="365"
                      value={trialDays}
                      onChange={(e) => setTrialDays(parseInt(e.target.value))}
                    />
                    <Button
                      onClick={handleSetTrial}
                      disabled={saving}
                      variant="outline"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Setting...
                        </>
                      ) : (
                        <>
                          <Clock className="mr-2 h-4 w-4" />
                          Set {trialDays} Day Trial
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will suspend billing and set a trial period for the specified number of days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
