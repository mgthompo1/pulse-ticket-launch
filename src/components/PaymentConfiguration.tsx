import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NZD">New Zealand Dollar (NZD)</SelectItem>
              <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
              <SelectItem value="USD">US Dollar (USD)</SelectItem>
              <SelectItem value="GBP">British Pound (GBP)</SelectItem>
              <SelectItem value="EUR">Euro (EUR)</SelectItem>
              <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentProvider">Payment Provider</Label>
          <Select value={paymentProvider} onValueChange={setPaymentProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="windcave">Windcave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentProvider === 'stripe' && (
          <div className="space-y-2">
            <Label htmlFor="stripeAccountId">Stripe Account ID</Label>
            <Input
              id="stripeAccountId"
              value={stripeAccountId}
              onChange={(e) => setStripeAccountId(e.target.value)}
            />
          </div>
        )}

        {paymentProvider === 'windcave' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="windcaveUsername">Windcave Username</Label>
              <Input
                id="windcaveUsername"
                value={windcaveUsername}
                onChange={(e) => setWindcaveUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="windcaveApiKey">Windcave API Key</Label>
              <Input
                id="windcaveApiKey"
                value={windcaveApiKey}
                onChange={(e) => setWindcaveApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="windcaveEndpoint">Windcave Endpoint</Label>
              <Select value={windcaveEndpoint} onValueChange={setWindcaveEndpoint}>
                <SelectTrigger>
                  <SelectValue placeholder="Select endpoint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAT">UAT</SelectItem>
                  <SelectItem value="SEC">SEC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="windcaveEnabled">Windcave Enabled</Label>
              <Switch
                id="windcaveEnabled"
                checked={windcaveEnabled}
                onCheckedChange={setWindcaveEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="windcaveHitUsername">Windcave HIT Username</Label>
              <Input
                id="windcaveHitUsername"
                value={windcaveHitUsername}
                onChange={(e) => setWindcaveHitUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="windcaveHitKey">Windcave HIT Key</Label>
              <Input
                id="windcaveHitKey"
                value={windcaveHitKey}
                onChange={(e) => setWindcaveHitKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="windcaveStationId">Windcave Station ID</Label>
              <Input
                id="windcaveStationId"
                value={windcaveStationId}
                onChange={(e) => setWindcaveStationId(e.target.value)}
              />
            </div>
          </>
        )}

        {paymentProvider === 'applepay' && (
          <div className="space-y-2">
            <Label htmlFor="applePayMerchantId">Apple Pay Merchant ID</Label>
            <Input
              id="applePayMerchantId"
              value={applePayMerchantId}
              onChange={(e) => setApplePayMerchantId(e.target.value)}
            />
          </div>
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
