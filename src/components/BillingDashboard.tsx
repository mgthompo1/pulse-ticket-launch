import React, { useState, useEffect } from "react";
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
  Receipt, 
  TrendingUp, 
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

// Initialize Stripe with a test publishable key (you can add your real key later)
const stripePromise = loadStripe("pk_test_51234567890abcdef"); // Replace with your actual Stripe publishable key

interface BillingDashboardProps {
  organizationId: string;
  isLoading: boolean;
}

const PaymentMethodSetup = ({ organizationId, onSuccess }: { organizationId: string; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>("");

  useEffect(() => {
    setupBilling();
  }, []);

  const setupBilling = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('setup-billing');
      if (error) throw error;
      
      setClientSecret(data.client_secret);
    } catch (error) {
      console.error('Error setting up billing:', error);
      toast({
        title: "Error",
        description: "Failed to initialize billing setup",
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

      // Complete billing setup
      const { error: completeError } = await supabase.functions.invoke('complete-billing-setup', {
        body: { setup_intent_id: setupIntent.id }
      });

      if (completeError) throw completeError;

      toast({
        title: "Success",
        description: "Payment method added successfully!"
      });

      onSuccess();
    } catch (error) {
      console.error('Error setting up payment method:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to setup payment method",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Add Payment Method
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            {isProcessing ? "Processing..." : "Add Payment Method"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const BillingDashboard: React.FC<BillingDashboardProps> = ({ organizationId, isLoading }) => {
  const { toast } = useToast();
  const [billingData, setBillingData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any[]>([]);
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadBillingData();
    }
  }, [organizationId]);

  const loadBillingData = async () => {
    try {
      setLoading(true);

      // Load billing customer info
      const { data: billing, error: billingError } = await supabase
        .from('billing_customers')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (billingError && billingError.code !== 'PGRST116') {
        console.error('Error loading billing data:', billingError);
      }

      setBillingData(billing);
      setNeedsSetup(!billing || billing.billing_status === 'setup_required');

      // Load current month usage
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data: usage, error: usageError } = await supabase
        .from('usage_records')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .order('created_at', { ascending: false });

      if (usageError) {
        console.error('Error loading usage data:', usageError);
      } else {
        setUsageData(usage || []);
      }

      // Load invoices
      const { data: invoices, error: invoiceError } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (invoiceError) {
        console.error('Error loading invoice data:', invoiceError);
      } else {
        setInvoiceData(invoices || []);
      }

    } catch (error) {
      console.error('Error loading billing data:', error);
      toast({
        title: "Error",
        description: "Failed to load billing information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setNeedsSetup(false);
    loadBillingData();
  };

  if (isLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentMonthUsage = usageData.reduce((acc, record) => ({
    transactions: acc.transactions + 1,
    volume: acc.volume + parseFloat(record.transaction_amount || 0),
    fees: acc.fees + parseFloat(record.total_platform_fee || 0),
  }), { transactions: 0, volume: 0, fees: 0 });

  if (needsSetup) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Billing Setup Required</h2>
          <p className="text-muted-foreground">
            Add a payment method to start accepting payments and going live with your events.
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must complete billing setup before you can publish events and accept payments.
            Platform fees: 1.00% + $0.50 per transaction, billed monthly.
          </AlertDescription>
        </Alert>

        <Elements stripe={stripePromise}>
          <PaymentMethodSetup 
            organizationId={organizationId} 
            onSuccess={handleSetupComplete}
          />
        </Elements>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Billing & Usage</h2>
        <p className="text-muted-foreground">
          Monitor your platform usage and manage billing information.
        </p>
      </div>

      {/* Billing Status */}
      <div className="flex items-center gap-2">
        {billingData?.billing_status === 'active' ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-700">Billing Active</span>
          </>
        ) : (
          <>
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="text-yellow-700">Setup Required</span>
          </>
        )}
      </div>

      {/* Current Month Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonthUsage.transactions}</div>
            <p className="text-xs text-muted-foreground">
              Transactions processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaction Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMonthUsage.volume.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total volume processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMonthUsage.fees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Fees this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {usageData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No transactions this month
            </p>
          ) : (
            <div className="space-y-3">
              {usageData.slice(0, 10).map((record) => (
                <div key={record.id} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="font-medium">${parseFloat(record.transaction_amount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${parseFloat(record.total_platform_fee).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Platform fee</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoiceData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No invoices yet
            </p>
          ) : (
            <div className="space-y-3">
              {invoiceData.map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-center py-3 border-b">
                  <div>
                    <p className="font-medium">
                      {invoice.billing_period_start} - {invoice.billing_period_end}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.total_transactions} transactions
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${parseFloat(invoice.total_platform_fees).toFixed(2)}</p>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingDashboard;