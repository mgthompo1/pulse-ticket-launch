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
import { ApplePayConfiguration } from './payment/ApplePayConfiguration';
import { GooglePayConfiguration } from './payment/GooglePayConfiguration';
import { PaymentLog } from './PaymentLog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PaymentConfigurationProps {
  organizationId: string;
}

export const PaymentConfiguration = ({ organizationId }: PaymentConfigurationProps) => {
  const [paymentProvider, setPaymentProvider] = useState('stripe');
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [enableApplePay, setEnableApplePay] = useState(false);
  const [enableGooglePay, setEnableGooglePay] = useState(false);
  const [windcaveUsername, setWindcaveUsername] = useState('');
  const [windcaveApiKey, setWindcaveApiKey] = useState('');
  const [windcaveEndpoint, setWindcaveEndpoint] = useState('UAT');
  const [windcaveEnabled, setWindcaveEnabled] = useState(false);
  const [windcaveHitUsername, setWindcaveHitUsername] = useState('');
  const [windcaveHitKey, setWindcaveHitKey] = useState('');
  const [windcaveStationId, setWindcaveStationId] = useState('');

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [currency, setCurrency] = useState('NZD');
  const [creditCardProcessingFee, setCreditCardProcessingFee] = useState(0);

  useEffect(() => {
    loadPaymentConfiguration();
  }, [organizationId]);

  const loadPaymentConfiguration = async () => {
    try {
      // Get basic organization info (non-sensitive)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('payment_provider, currency, credit_card_processing_fee_percentage')
        .eq('id', organizationId)
        .single();

      if (orgError) {
        console.error('Error loading organization:', orgError);
        return;
      }

      // Get payment credentials securely
      const { data: credData } = await supabase
        .from('payment_credentials')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (orgData) {
        setPaymentProvider(orgData.payment_provider || 'stripe');
        setCurrency(orgData.currency || 'NZD');
        setCreditCardProcessingFee(orgData.credit_card_processing_fee_percentage || 0);
      }

      if (credData) {
        setStripeAccountId(credData.stripe_account_id || '');
        setStripePublishableKey(credData.stripe_publishable_key || '');
        setStripeSecretKey(credData.stripe_secret_key || '');
        setEnableApplePay(credData.enable_apple_pay || false);
        setEnableGooglePay(credData.enable_google_pay || false);
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
      // Update organization with non-sensitive data
      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          payment_provider: paymentProvider,
          currency: currency,
          credit_card_processing_fee_percentage: creditCardProcessingFee
        })
        .eq('id', organizationId);

      if (orgError) {
        throw orgError;
      }

      // Upsert payment credentials securely
      const { error: credError } = await supabase
        .from('payment_credentials')
        .upsert({
          organization_id: organizationId,
          stripe_account_id: stripeAccountId,
          stripe_publishable_key: stripePublishableKey,
          stripe_secret_key: stripeSecretKey,
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

      if (credError) {
        throw credError;
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
    <Tabs defaultValue="configuration" className="space-y-6">
      <TabsList>
        <TabsTrigger value="configuration">Configuration</TabsTrigger>
        <TabsTrigger value="payment-log">Payment Log</TabsTrigger>
      </TabsList>

      <TabsContent value="configuration">
        <Card>
          <CardHeader>
            <CardTitle>Payment Configuration</CardTitle>
            <CardDescription>
              Configure your payment providers and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PaymentProviderSelector
              paymentProvider={paymentProvider}
              onProviderChange={setPaymentProvider}
            />

            {paymentProvider === 'stripe' && (
              <StripeConfiguration 
                stripeAccountId={stripeAccountId}
                stripePublishableKey={stripePublishableKey}
                stripeSecretKey={stripeSecretKey}
                enableApplePay={enableApplePay}
                enableGooglePay={enableGooglePay}
                currency={currency}
                onStripeAccountIdChange={setStripeAccountId}
                onStripePublishableKeyChange={setStripePublishableKey}
                onStripeSecretKeyChange={setStripeSecretKey}
                onEnableApplePayChange={setEnableApplePay}
                onEnableGooglePayChange={setEnableGooglePay}
                onCurrencyChange={setCurrency}
              />
            )}

            {paymentProvider === 'windcave' && (
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
            )}

            {paymentProvider === 'stripe' && null}



            <div className="space-y-3">
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

            <div className="pt-4">
              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payment-log">
        <PaymentLog organizationId={organizationId} />
      </TabsContent>
    </Tabs>
  );
};
