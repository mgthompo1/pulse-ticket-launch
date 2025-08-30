import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { 
  CreditCard, 
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Settings,
  XCircle,
  RefreshCw,
  ExternalLink
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

// Stripe will be initialized dynamically when needed

interface BillingManagementProps {
  organizationId: string;
}

const UpdatePaymentMethod = ({ onSuccess }: { organizationId: string; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>("");

  useEffect(() => {
    setupPaymentMethodUpdate();
  }, []);

  const setupPaymentMethodUpdate = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('setup-billing');
      if (error) throw error;
      
      setClientSecret(data.client_secret);
    } catch (error) {
      console.error('Error setting up payment method update:', error);
      toast({
        title: "Error",
        description: "Failed to initialize payment method update",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Update payment method
      const { error: updateError } = await supabase.functions.invoke('manage-billing', {
        body: { 
          action: 'update_payment_method',
          setup_intent_id: setupIntent.id 
        }
      });

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Payment method updated successfully!"
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update payment method",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: 'hsl(var(--foreground))',
                '::placeholder': {
                  color: 'hsl(var(--muted-foreground))',
                },
              },
            },
          }}
        />
      </div>
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
        {isProcessing ? "Updating..." : "Update Payment Method"}
      </Button>
    </form>
  );
};

export const BillingManagement: React.FC<BillingManagementProps> = ({ organizationId }) => {
  const { toast } = useToast();
  const [billingData, setBillingData] = useState<any>(null);
  const [upcomingCharges, setUpcomingCharges] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<Array<any>>([]);
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

  const handleUpdateComplete = () => {
    setShowUpdatePayment(false);
    loadBillingData();
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
      <div>
        <h3 className="text-xl font-semibold mb-2">Billing Management</h3>
        <p className="text-muted-foreground">
          Manage your payment methods and billing preferences.
        </p>
      </div>

      {/* Billing Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              Billing Status
              {billingData.billing_status === 'active' ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : billingData.billing_status === 'cancelled' ? (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Cancelled
                </Badge>
              ) : (
                <Badge variant="secondary">
                  {billingData.billing_status}
                </Badge>
              )}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Customer ID</p>
              <p className="text-sm text-muted-foreground">{billingData.stripe_customer_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Last Updated</p>
              <p className="text-sm text-muted-foreground">
                {new Date(billingData.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <Button onClick={handleManagePaymentMethods} variant="default">
              <Settings className="h-4 w-4 mr-2" />
              Manage Payment Methods
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>

            <Button 
              onClick={() => setShowUpdatePayment(!showUpdatePayment)} 
              variant="outline"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Update Payment Method
            </Button>

            <Button onClick={loadUpcomingCharges} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {billingData.billing_status === 'active' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Billing
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Billing</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel billing? You'll still be able to process payments 
                      until the end of the current billing period, but no new charges will be processed 
                      after that.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Billing Active</AlertDialogCancel>
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

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment methods on file.</p>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map(pm => (
                <div key={pm.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{pm.brand?.toUpperCase()} •••• {pm.last4}</div>
                    <div className="text-xs text-muted-foreground">Exp {pm.exp_month}/{pm.exp_year}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {defaultPaymentMethod === pm.id ? (
                      <Badge>Default</Badge>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setDefault(pm.id)}>Set Default</Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => removePm(pm.id)} disabled>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => setShowUpdatePayment(true)} className="flex-1">
              Add/Update Card
            </Button>
            <Button onClick={handleManagePaymentMethods} variant="outline" className="flex-1">
              Open Stripe Portal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Update Payment Method */}
      {showUpdatePayment && (
        <Card>
          <CardHeader>
            <CardTitle>Update Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <Elements stripe={loadStripe("pk_live_51RkWYvIkAZJOEIBEU4kM4sZ1jv3Jkdhfcr953tdGveqHA83bUo6pDA3KBSUUe9QbWbgTnT9uvXWSUO65PEFqlZ06009YvC3tjO")}>
              <UpdatePaymentMethod 
                organizationId={organizationId} 
                onSuccess={handleUpdateComplete}
              />
            </Elements>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Charges */}
      {upcomingCharges && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Charges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-2xl font-bold">
                    ${parseFloat(upcomingCharges.upcoming_amount).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Platform fees for {upcomingCharges.transaction_count} transactions
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Next Billing Date</p>
                <p className="text-lg font-semibold">
                  {new Date(upcomingCharges.next_billing_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Billing period: {new Date(upcomingCharges.billing_period_start).toLocaleDateString()} - {new Date(upcomingCharges.billing_period_end).toLocaleDateString()}
                </p>
              </div>
            </div>

            {parseFloat(upcomingCharges.upcoming_amount) === 0 && (
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No charges scheduled for this billing period.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};