import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Receipt
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BillingData {
  id: string;
  organization_id: string;
  stripe_customer_id: string;
  billing_status: string;
  billing_email: string;
  payment_method_id: string | null;
  updated_at: string;
}

interface UpcomingCharges {
  upcoming_amount: number;
  next_billing_date: string;
  billing_period_start: string;
  billing_period_end: string;
  transaction_count: number;
}

interface PaymentMethod {
  id: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
}

interface BillingManagementProps {
  organizationId: string;
}


export const BillingManagement: React.FC<BillingManagementProps> = ({ organizationId }) => {
  const { toast } = useToast();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [upcomingCharges, setUpcomingCharges] = useState<UpcomingCharges | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadBillingData();
      loadUpcomingCharges();
      loadPaymentMethods();
    }
  }, [organizationId]);

  const loadBillingData = async () => {
    try {
      const { data: billing, error: billingError } = await supabase
        .from('billing_customers')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (billingError && billingError.code !== 'PGRST116') {
        console.error('Error loading billing data:', billingError);
        return;
      }

      setBillingData(billing);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingCharges = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-billing', {
        body: { action: 'get_upcoming_charges' }
      });

      if (error) throw error;
      setUpcomingCharges(data);
    } catch (error) {
      console.error('Error loading upcoming charges:', error);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-billing', {
        body: { action: 'list_payment_methods' }
      });
      if (error) throw error;
      setPaymentMethods(data.payment_methods || []);
      setDefaultPaymentMethod(data.default_payment_method || null);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const setDefault = async (pmId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-billing', {
        body: { action: 'set_default_payment_method', pm_id: pmId }
      });
      if (error) throw error;
      await loadPaymentMethods();
      toast({ title: 'Updated', description: 'Default payment method updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to set default', variant: 'destructive' });
    }
  };

  const removePm = async (pmId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-billing', {
        body: { action: 'detach_payment_method', pm_id: pmId }
      });
      if (error) throw error;
      await loadPaymentMethods();
      toast({ title: 'Removed', description: 'Payment method removed' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove method', variant: 'destructive' });
    }
  };

  const handleManagePaymentMethods = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-billing', {
        body: { action: 'create_portal_session' }
      });

      if (error) throw error;
      
      // Open Stripe Customer Portal in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open payment management portal",
        variant: "destructive"
      });
    }
  };

  const handleViewInvoices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-billing', {
        body: { action: 'create_invoice_portal_session' }
      });

      if (error) throw error;
      
      // Open Stripe Customer Portal focused on invoices
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening invoice portal:', error);
      toast({
        title: "Error", 
        description: "Failed to open invoice portal",
        variant: "destructive"
      });
    }
  };

  const handleCancelBilling = async () => {
    try {
      const { error } = await supabase.functions.invoke('manage-billing', {
        body: { action: 'cancel_billing' }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Billing has been cancelled. You can still process payments until the end of the current billing period."
      });

      loadBillingData();
    } catch (error) {
      console.error('Error cancelling billing:', error);
      toast({
        title: "Error",
        description: "Failed to cancel billing",
        variant: "destructive"
      });
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!billingData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No billing setup found. Please complete billing setup first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Methods - Primary Focus */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </CardTitle>
            <Button onClick={loadPaymentMethods} variant="ghost" size="sm" className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-6">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No payment methods on file</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map(pm => (
                <div key={pm.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold">
                      {pm.brand?.slice(0, 2).toUpperCase() || 'CC'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pm.brand?.toUpperCase()} •••• {pm.last4}</p>
                      <p className="text-xs text-muted-foreground">Expires {pm.exp_month}/{pm.exp_year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {defaultPaymentMethod === pm.id ? (
                      <Badge variant="default" className="bg-green-600 text-xs">Default</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setDefault(pm.id)} className="text-xs">
                        Set Default
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button onClick={handleManagePaymentMethods} variant="outline" className="w-full">
            <CreditCard className="h-4 w-4 mr-2" />
            Add or Manage Cards via Stripe
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Billing Status</p>
              <div className="flex items-center gap-2">
                {billingData.billing_status === 'active' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Active</span>
                  </>
                ) : billingData.billing_status === 'cancelled' ? (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-sm">Cancelled</span>
                  </>
                ) : (
                  <span className="font-medium text-sm capitalize">{billingData.billing_status}</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Billing Email</p>
              <p className="font-medium text-sm truncate">{billingData.billing_email || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Customer ID</p>
              <p className="font-mono text-xs text-muted-foreground">{billingData.stripe_customer_id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="text-sm">{new Date(billingData.updated_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 mt-4 border-t">
            <Button onClick={handleViewInvoices} variant="outline" size="sm" className="flex-1">
              <Receipt className="h-4 w-4 mr-2" />
              View All Invoices
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
            {billingData.billing_status === 'active' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Billing
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Billing?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You'll still be able to process payments until the end of the current billing period.
                      After that, no new charges will be processed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Active</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelBilling} className="bg-destructive hover:bg-destructive/90">
                      Cancel Billing
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fee Structure Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Platform Fee Structure</p>
              <p className="text-sm text-muted-foreground mt-1">
                1.00% of transaction volume + $0.50 per transaction
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Fees are calculated and billed automatically every {upcomingCharges ? `${Math.round((new Date(upcomingCharges.next_billing_date).getTime() - new Date(upcomingCharges.billing_period_start).getTime()) / (1000 * 60 * 60 * 24))} days` : '14 days'}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};