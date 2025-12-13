import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PaymentProviderSelector } from './payment/PaymentProviderSelector';
import { StripeConfiguration } from './payment/StripeConfiguration';
import { WindcaveConfiguration } from './payment/WindcaveConfiguration';
import { PaymentLog } from './PaymentLog';
import { PayoutsAndFees } from './PayoutsAndFees';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Receipt, DollarSign, CreditCard, Save, Landmark } from "lucide-react";

interface PaymentConfigurationProps {
  organizationId: string;
}

export const PaymentConfiguration = ({ organizationId }: PaymentConfigurationProps) => {
  const [activeTab, setActiveTab] = useState('configuration');
  const [paymentProvider, setPaymentProvider] = useState('stripe');
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeTerminalLocationId, setStripeTerminalLocationId] = useState('');
  const [enableApplePay, setEnableApplePay] = useState(false);
  const [enableGooglePay, setEnableGooglePay] = useState(false);
  const [windcaveUsername, setWindcaveUsername] = useState('');
  const [windcaveApiKey, setWindcaveApiKey] = useState('');
  const [windcaveEndpoint, setWindcaveEndpoint] = useState('UAT');
  const [windcaveEnabled, setWindcaveEnabled] = useState(false);
  const [windcaveHitUsername, setWindcaveHitUsername] = useState('');
  const [windcaveHitKey, setWindcaveHitKey] = useState('');
  const [windcaveStationId, setWindcaveStationId] = useState('');
  const [enableBookingFees, setEnableBookingFees] = useState(false);
  const [stripeConnectedAccountId, setStripeConnectedAccountId] = useState('');
  const [stripeTestMode, setStripeTestMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [currency, setCurrency] = useState('NZD');
  const [creditCardProcessingFee, setCreditCardProcessingFee] = useState(0);

  useEffect(() => {
    loadPaymentConfiguration();
  }, [organizationId]);

  const loadPaymentConfiguration = async () => {
    try {
      // Get basic organization info (non-sensitive) including Stripe Connect status
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('payment_provider, currency, credit_card_processing_fee_percentage, stripe_account_id, stripe_booking_fee_enabled, stripe_terminal_location_id, stripe_test_mode')
        .eq('id', organizationId)
        .single();

      if (orgError) {
        console.error('Error loading organization:', orgError);
        return;
      }

      // Get payment credentials securely (if payment_credentials table exists)
      const { data: credData } = await supabase
        .from('payment_credentials')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (orgData) {
        setPaymentProvider(orgData.payment_provider || 'stripe');
        setCurrency(orgData.currency || 'NZD');
        setCreditCardProcessingFee(orgData.credit_card_processing_fee_percentage || 0);
        setStripeConnectedAccountId(orgData.stripe_account_id || '');
        setEnableBookingFees(orgData.stripe_booking_fee_enabled || false);
        setStripeTerminalLocationId(orgData.stripe_terminal_location_id || '');
        setStripeTestMode(orgData.stripe_test_mode || false);
      }

      if (credData) {
        // Override with payment_credentials if they exist
        setStripeAccountId(credData.stripe_account_id || '');
        if (credData.stripe_publishable_key) setStripePublishableKey(credData.stripe_publishable_key);
        if (credData.stripe_secret_key) setStripeSecretKey(credData.stripe_secret_key);
        if (credData.stripe_terminal_location_id) setStripeTerminalLocationId(credData.stripe_terminal_location_id);
        setEnableApplePay(false); // Column doesn't exist yet
        setEnableGooglePay(false); // Column doesn't exist yet
        setWindcaveUsername(credData.windcave_username || '');
        setWindcaveApiKey(credData.windcave_api_key || '');
        setWindcaveEndpoint(credData.windcave_endpoint || 'UAT');
        setWindcaveEnabled(credData.windcave_enabled || false);
        setWindcaveHitUsername(credData.windcave_hit_username || '');
        setWindcaveHitKey(credData.windcave_hit_key || '');
        setWindcaveStationId(credData.windcave_station_id || '');

      }
    } catch (error) {
      console.error('Error loading payment configuration:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Update organization (no manual Stripe credentials with Connect)
      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          payment_provider: paymentProvider,
          currency: currency,
          credit_card_processing_fee_percentage: creditCardProcessingFee,
          stripe_booking_fee_enabled: enableBookingFees,
          stripe_terminal_location_id: stripeTerminalLocationId,
          stripe_test_mode: stripeTestMode
        })
        .eq('id', organizationId);

      if (orgError) {
        throw orgError;
      }

      // Also save to payment_credentials if table exists (for backwards compatibility)
      try {
        await supabase
          .from('payment_credentials')
          .upsert({
            organization_id: organizationId,
            stripe_account_id: stripeAccountId,
            stripe_publishable_key: stripePublishableKey,
            stripe_secret_key: stripeSecretKey,
            stripe_terminal_location_id: stripeTerminalLocationId,
            enable_apple_pay: enableApplePay,
            enable_google_pay: enableGooglePay,
            windcave_username: windcaveUsername,
            windcave_api_key: windcaveApiKey,
            windcave_endpoint: windcaveEndpoint,
            windcave_enabled: windcaveEnabled,
            windcave_hit_username: windcaveHitUsername,
            windcave_hit_key: windcaveHitKey,
            windcave_station_id: windcaveStationId,
          }, {
            onConflict: 'organization_id'
          });
      } catch (credError) {
        // Ignore errors if payment_credentials table doesn't exist
        console.log('payment_credentials table may not exist, continuing...');
      }

      toast({
        title: "Success",
        description: "Payment configuration saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving payment configuration:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save payment configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Payments</h2>
          <p className="text-muted-foreground">
            Configure payment providers and track transactions
          </p>
        </div>
        {activeTab === 'configuration' && (
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-12 p-1.5 gap-1 bg-muted/40 border rounded-xl min-w-max">
            <TabsTrigger
              value="configuration"
              className="relative flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuration</span>
            </TabsTrigger>
            <TabsTrigger
              value="payment-log"
              className="relative flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300"
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Payment Log</span>
            </TabsTrigger>
            <TabsTrigger
              value="payouts-fees"
              className="relative flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300"
            >
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Payouts & Fees</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="configuration" className="space-y-6">
          {/* Payment Provider Selection */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Payment Provider</CardTitle>
              <CardDescription>
                Choose your primary payment processor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentProviderSelector
                paymentProvider={paymentProvider}
                onProviderChange={setPaymentProvider}
              />
            </CardContent>
          </Card>

          {/* Provider Configuration */}
          {paymentProvider === 'stripe' && (
            <StripeConfiguration
                  stripeAccountId={stripeAccountId}
                  stripePublishableKey={stripePublishableKey}
                  stripeSecretKey={stripeSecretKey}
                  stripeTerminalLocationId={stripeTerminalLocationId}
                  enableApplePay={enableApplePay}
                  enableGooglePay={enableGooglePay}
                  currency={currency}
                  enableBookingFees={enableBookingFees}
                  stripeConnectedAccountId={stripeConnectedAccountId}
                  organizationId={organizationId}
                  stripeTestMode={stripeTestMode}
                  onStripeAccountIdChange={setStripeAccountId}
                  onStripePublishableKeyChange={setStripePublishableKey}
                  onStripeSecretKeyChange={setStripeSecretKey}
                  onStripeTerminalLocationIdChange={setStripeTerminalLocationId}
                  onEnableApplePayChange={setEnableApplePay}
                  onEnableGooglePayChange={setEnableGooglePay}
                  onCurrencyChange={setCurrency}
                  onEnableBookingFeesChange={setEnableBookingFees}
                  onStripeTestModeChange={setStripeTestMode}
                  onConnectionChange={loadPaymentConfiguration}
            />
          )}

          {paymentProvider === 'windcave' && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  Windcave Configuration
                </CardTitle>
                <CardDescription>
                  Configure your Windcave payment gateway
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WindcaveConfiguration
                  windcaveUsername={windcaveUsername}
                  windcaveApiKey={windcaveApiKey}
                  windcaveEndpoint={windcaveEndpoint}
                  windcaveEnabled={windcaveEnabled}
                  windcaveHitUsername={windcaveHitUsername}
                  windcaveHitKey={windcaveHitKey}
                  windcaveStationId={windcaveStationId}
                  currency={currency}
                  onWindcaveUsernameChange={setWindcaveUsername}
                  onWindcaveApiKeyChange={setWindcaveApiKey}
                  onWindcaveEndpointChange={setWindcaveEndpoint}
                  onWindcaveEnabledChange={setWindcaveEnabled}
                  onWindcaveHitUsernameChange={setWindcaveHitUsername}
                  onWindcaveHitKeyChange={setWindcaveHitKey}
                  onWindcaveStationIdChange={setWindcaveStationId}
                  onCurrencyChange={setCurrency}
                />
              </CardContent>
            </Card>
          )}

          {/* Processing Fee */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Processing Fees</CardTitle>
              <CardDescription>
                Configure additional fees for card payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="creditCardFee">Credit Card Processing Fee (%)</Label>
                <Input
                  id="creditCardFee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={creditCardProcessingFee}
                  onChange={(e) => setCreditCardProcessingFee(parseFloat(e.target.value) || 0)}
                  placeholder="Enter percentage (e.g., 2.5 for 2.5%)"
                />
                <p className="text-sm text-muted-foreground">
                  Optional processing fee added to ticket cost (e.g., 2.5 for 2.5%). Leave at 0 to disable.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-log">
          <PaymentLog organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="payouts-fees">
          <PayoutsAndFees organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
