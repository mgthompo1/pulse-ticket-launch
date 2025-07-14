import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PaymentProviderSelector } from './payment/PaymentProviderSelector';
import { StripeConfiguration } from './payment/StripeConfiguration';
import { WindcaveConfiguration } from './payment/WindcaveConfiguration';
import { ApplePayConfiguration } from './payment/ApplePayConfiguration';

interface PaymentConfigurationProps {
  organizationId: string;
}

export const PaymentConfiguration = ({ organizationId }: PaymentConfigurationProps) => {
  const [paymentProvider, setPaymentProvider] = useState('stripe');
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [windcaveUsername, setWindcaveUsername] = useState('');
  const [windcaveApiKey, setWindcaveApiKey] = useState('');
  const [windcaveEndpoint, setWindcaveEndpoint] = useState('UAT');
  const [windcaveEnabled, setWindcaveEnabled] = useState(false);
  const [windcaveHitUsername, setWindcaveHitUsername] = useState('');
  const [windcaveHitKey, setWindcaveHitKey] = useState('');
  const [windcaveStationId, setWindcaveStationId] = useState('');
  const [applePayMerchantId, setApplePayMerchantId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [currency, setCurrency] = useState('NZD');

  useEffect(() => {
    const loadPaymentConfig = async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) {
        console.error('Error loading payment config:', error);
        return;
      }

      if (data) {
        setPaymentProvider(data.payment_provider || 'stripe');
        setStripeAccountId(data.stripe_account_id || '');
        setWindcaveUsername(data.windcave_username || '');
        setWindcaveApiKey(data.windcave_api_key || '');
        setWindcaveEndpoint(data.windcave_endpoint || 'UAT');
        setWindcaveEnabled(data.windcave_enabled || false);
        setWindcaveHitUsername(data.windcave_hit_username || '');
        setWindcaveHitKey(data.windcave_hit_key || '');
        setWindcaveStationId(data.windcave_station_id || '');
        setCurrency(data.currency || 'NZD');
        setApplePayMerchantId(data.apple_pay_merchant_id || '');
      }
    };

    loadPaymentConfig();
  }, [organizationId]);

  const handleSave = async () => {
    setLoading(true);
    
    const { error } = await supabase
      .from('organizations')
      .update({
        payment_provider: paymentProvider,
        stripe_account_id: stripeAccountId,
        windcave_username: windcaveUsername,
        windcave_api_key: windcaveApiKey,
        windcave_endpoint: windcaveEndpoint,
        windcave_enabled: windcaveEnabled,
        windcave_hit_username: windcaveHitUsername,
        windcave_hit_key: windcaveHitKey,
        windcave_station_id: windcaveStationId,
        currency: currency,
        apple_pay_merchant_id: applePayMerchantId,
      })
      .eq('id', organizationId);

    if (error) {
      console.error('Error saving payment config:', error);
      toast({
        title: "Error",
        description: "Failed to save payment configuration",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Payment configuration saved successfully",
      });
    }
    
    setLoading(false);
  };

  return (
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
            onStripeAccountIdChange={setStripeAccountId}
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

        {paymentProvider === 'applepay' && (
          <ApplePayConfiguration 
            applePayMerchantId={applePayMerchantId}
            onApplePayMerchantIdChange={setApplePayMerchantId}
          />
        )}

        <div className="pt-4">
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
