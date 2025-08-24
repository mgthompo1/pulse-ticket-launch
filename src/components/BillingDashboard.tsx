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

  const generateInvoice = async () => {
    try {
      const { error } = await supabase.functions.invoke('generate-invoice', {
        body: { 
          organization_id: organizationId,
          billing_period: new Date().toISOString().slice(0, 7) // YYYY-MM format
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Invoice generated successfully!"
      });
      
      // Reload billing data to show new invoice
      loadBillingData();
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive"
      });
    }
  };

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
            Platform fees: 1.00% + $0.50 per transaction, billed monthly.
          </AlertDescription>
        </Alert>

        <Elements stripe={loadStripe("pk_live_51RkWYvIkAZJOEIBEU4kM4sZ1jv3Jkdhfcr953tdGveqHA83bUo6pDA3KBSUUe9QbWbgTnT9uvXWSUO65PEFqlZ06009YvC3tjO")}>
          <PaymentMethodSetup 
            organizationId={organizationId} 
            onSuccess={handleSetupComplete}
          />
        </Elements>
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Billing & Usage</h2>
        <p className="text-muted-foreground">
          Monitor your platform usage and manage billing information.
        </p>
      </div>

      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
        <TabsTrigger value="management">Billing Management</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
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
              <div className="mt-2 text-xs text-muted-foreground">
                <div>1.00% + $0.50 per transaction</div>
                <div className="mt-1">
                  {currentMonthUsage.transactions > 0 && (
                    <>
                      <span className="text-primary">
                        ${(currentMonthUsage.volume * 0.01).toFixed(2)}
                      </span> + <span className="text-primary">
                        ${(currentMonthUsage.transactions * 0.50).toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Quick Actions</span>
              <Button 
                onClick={generateInvoice}
                disabled={currentMonthUsage.transactions === 0}
                size="sm"
                className="flex items-center gap-2"
              >
                <Receipt className="h-4 w-4" />
                Generate Invoice
              </Button>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Generate invoices and manage your billing
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h4 className="font-medium">Current Month</h4>
                <p className="text-sm text-muted-foreground">
                  ${currentMonthUsage.fees.toFixed(2)} in fees
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h4 className="font-medium">Transactions</h4>
                <p className="text-sm text-muted-foreground">
                  {currentMonthUsage.transactions} this month
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h4 className="font-medium">Volume</h4>
                <p className="text-sm text-muted-foreground">
                  ${currentMonthUsage.volume.toFixed(2)} processed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                      <p className="font-medium">${record.transaction_amount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${record.total_platform_fee.toFixed(2)}</p>
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
                      <p className="font-medium">${invoice.total_platform_fees.toFixed(2)}</p>
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
      </TabsContent>

      <TabsContent value="invoicing" className="space-y-6">
        {/* Current Month Invoice Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Current Month Invoice Preview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Preview of your upcoming invoice for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">Transaction Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Transactions:</span>
                    <span className="font-medium">{currentMonthUsage.transactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Transaction Volume:</span>
                    <span className="font-medium">${currentMonthUsage.volume.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Platform Fee Rate:</span>
                    <span className="font-medium">1.00% + $0.50 per transaction</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Fee Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Percentage Fee (1.00%):</span>
                    <span className="font-medium">${(currentMonthUsage.volume * 0.01).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fixed Fee ({currentMonthUsage.transactions} × $0.50):</span>
                    <span className="font-medium">${(currentMonthUsage.transactions * 0.50).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Platform Fees:</span>
                      <span className="text-lg">${currentMonthUsage.fees.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={generateInvoice}
                disabled={currentMonthUsage.transactions === 0}
                className="flex items-center gap-2"
              >
                <Receipt className="h-4 w-4" />
                Generate Invoice
              </Button>
              <Button 
                variant="outline"
                onClick={() => downloadInvoice()}
                disabled={currentMonthUsage.transactions === 0}
              >
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoice History with Enhanced Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <p className="text-sm text-muted-foreground">
              View and download previous invoices
            </p>
          </CardHeader>
          <CardContent>
            {invoiceData.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No invoices generated yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Invoices are generated monthly based on your platform usage
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoiceData.map((invoice) => (
                  <div key={invoice.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">
                          Invoice #{invoice.id.slice(-8)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {invoice.billing_period_start} - {invoice.billing_period_end}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">${invoice.total_platform_fees.toFixed(2)}</div>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Transactions:</span>
                        <div className="font-medium">{invoice.total_transactions}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Volume:</span>
                        <div className="font-medium">${invoice.total_transaction_volume?.toFixed(2) || '0.00'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Due Date:</span>
                        <div className="font-medium">
                          {new Date(invoice.billing_period_end).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Generated:</span>
                        <div className="font-medium">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadInvoice(invoice.id)}
                      >
                        Download
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewInvoice(invoice.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="management">
        <BillingManagement organizationId={organizationId} />
      </TabsContent>
    </Tabs>
  );
};

export default BillingDashboard;