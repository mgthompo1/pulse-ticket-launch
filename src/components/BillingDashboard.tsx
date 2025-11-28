import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
// Stripe will be loaded dynamically when needed
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { 
  CreditCard, 
  Receipt, 
  TrendingUp, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { BillingManagement } from "./BillingManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Stripe will be initialized dynamically when needed

interface BillingDashboardProps {
  organizationId: string;
  isLoading: boolean;
}

const PaymentMethodSetup = ({ onSuccess }: { organizationId: string; onSuccess: () => void }) => {
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
        description: error instanceof Error ? error.message : "Failed to setup payment method",
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
  const [billingData, setBillingData] = useState<{
    id: string;
    organization_id: string;
    stripe_customer_id: string;
    billing_status: string;
    billing_email: string;
  } | null>(null);
  const [usageData, setUsageData] = useState<Array<{
    id: string;
    transaction_amount: number;
    total_platform_fee: number;
    created_at: string;
  }>>([]);
  const [invoiceData, setInvoiceData] = useState<Array<{
    id: string;
    total_transaction_volume: number;
    total_platform_fees: number;
    total_transactions: number;
    status: string;
    created_at: string;
    billing_period_start: string;
    billing_period_end: string;
  }>>([]);
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

  // Manual invoice generation removed in favor of scheduled monthly billing

  const downloadInvoice = async (invoiceId?: string) => {
    try {
      const id = invoiceId || 'current';
      const { data, error } = await supabase.functions.invoke('download-invoice', {
        body: { 
          invoice_id: id,
          organization_id: organizationId
        }
      });
      
      if (error) throw error;
      
      // Create download link for PDF
      if (data.pdf_url) {
        const link = document.createElement('a');
        link.href = data.pdf_url;
        link.download = `invoice-${id}-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast({
        title: "Success",
        description: "Invoice downloaded successfully!"
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive"
      });
    }
  };

  const viewInvoice = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-invoice-details', {
        body: { 
          invoice_id: invoiceId,
          organization_id: organizationId
        }
      });
      
      if (error) throw error;
      
      // For now, just show a toast with basic info
      // In the future, this could open a modal with detailed invoice view
      toast({
        title: "Invoice Details",
        description: `Invoice #${data.invoice_number} - $${data.total_platform_fees.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error viewing invoice:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive"
      });
    }
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
    volume: acc.volume + (record.transaction_amount || 0),
    fees: acc.fees + (record.total_platform_fee || 0),
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
            Platform fees: 1.00% + $0.50 per transaction, billed fortnightly (every 14 days).
          </AlertDescription>
        </Alert>

        <StripeElementsWrapper organizationId={organizationId} onSuccess={handleSetupComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Billing & Usage</h2>
          <p className="text-muted-foreground text-sm">
            Monitor your platform usage and manage billing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {billingData?.billing_status === 'active' ? (
            <Badge variant="default" className="bg-green-600 gap-1">
              <CheckCircle className="h-3 w-3" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Setup Required
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-auto gap-1 p-1">
          <TabsTrigger value="usage" className="text-xs sm:text-sm py-2">Usage & Invoices</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm py-2">Payment Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          {/* Current Period Summary - Compact Card */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 sm:gap-8 flex-1">
                  <div className="text-center sm:text-left">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Transactions</p>
                    <p className="text-xl sm:text-3xl font-bold">{currentMonthUsage.transactions}</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Volume</p>
                    <p className="text-xl sm:text-3xl font-bold">${currentMonthUsage.volume.toFixed(0)}</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Platform Fees</p>
                    <p className="text-xl sm:text-3xl font-bold text-primary">${currentMonthUsage.fees.toFixed(2)}</p>
                  </div>
                </div>
                {/* Next Billing */}
                <div className="bg-background/50 rounded-lg p-4 text-center lg:text-right">
                  <p className="text-xs sm:text-sm text-muted-foreground">Next billing</p>
                  <p className="text-lg font-semibold">
                    {(billingData as any)?.next_billing_at
                      ? new Date((billingData as any).next_billing_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'Not scheduled'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Billed every {(billingData as any)?.billing_interval_days || 14} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Current Period Fee Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Percentage fee (1.00% of ${currentMonthUsage.volume.toFixed(2)})</span>
                  <span className="font-medium">${(currentMonthUsage.volume * 0.01).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Fixed fee ({currentMonthUsage.transactions} × $0.50)</span>
                  <span className="font-medium">${(currentMonthUsage.transactions * 0.50).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-semibold">Total due at next billing</span>
                  <span className="text-lg font-bold text-primary">${currentMonthUsage.fees.toFixed(2)}</span>
                </div>
              </div>
              {currentMonthUsage.transactions > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadInvoice()}
                  className="mt-4"
                >
                  Download Current Statement
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {usageData.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">No transactions this period</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {usageData.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">${record.transaction_amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">
                          ${record.total_platform_fee.toFixed(2)} fee
                        </p>
                      </div>
                    </div>
                  ))}
                  {usageData.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      + {usageData.length - 5} more transactions
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice History */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Invoice History</CardTitle>
                {invoiceData.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {invoiceData.length} invoice{invoiceData.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {invoiceData.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">No invoices yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Invoices are generated automatically every {(billingData as any)?.billing_interval_days || 14} days
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoiceData.map((invoice) => (
                    <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          invoice.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
                        }`}>
                          {invoice.status === 'paid' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {new Date(invoice.billing_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(invoice.billing_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.total_transactions} transactions • ${invoice.total_transaction_volume?.toFixed(2) || '0.00'} volume
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-11 sm:ml-0">
                        <div className="text-right">
                          <p className="font-semibold">${invoice.total_platform_fees.toFixed(2)}</p>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            {invoice.status}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadInvoice(invoice.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <BillingManagement organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StripeElementsWrapper = ({ organizationId, onSuccess }: { organizationId: string; onSuccess: () => void }) => {
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

      if (!stripePublishableKey) {
        console.error("VITE_STRIPE_PUBLISHABLE_KEY not configured in environment variables");
        return;
      }

      import("@stripe/stripe-js").then(({ loadStripe }) => {
        setStripePromise(loadStripe(stripePublishableKey));
      });
    }
  }, []);

  if (!stripePromise) {
    return <div>Loading payment form...</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodSetup
        organizationId={organizationId}
        onSuccess={onSuccess}
      />
    </Elements>
  );
};

export default BillingDashboard;