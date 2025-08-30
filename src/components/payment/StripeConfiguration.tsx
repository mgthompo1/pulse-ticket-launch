
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Apple, CreditCard } from "lucide-react";

interface StripeConfigurationProps {
  stripeAccountId: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  enableApplePay?: boolean;
  enableGooglePay?: boolean;
  currency: string;
  onStripeAccountIdChange: (value: string) => void;
  onStripePublishableKeyChange: (value: string) => void;
  onStripeSecretKeyChange: (value: string) => void;
  onEnableApplePayChange?: (value: boolean) => void;
  onEnableGooglePayChange?: (value: boolean) => void;
  onCurrencyChange: (value: string) => void;
}

export const StripeConfiguration = ({ 
  stripeAccountId, 
  stripePublishableKey,
  stripeSecretKey,
  enableApplePay = false,
  enableGooglePay = false,
  currency,
  onStripeAccountIdChange, 
  onStripePublishableKeyChange,
  onStripeSecretKeyChange,
  onEnableApplePayChange,
  onEnableGooglePayChange,
  onCurrencyChange
}: StripeConfigurationProps) => {
  return (
    <div className="space-y-6">
      {/* Stripe API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe API Configuration
          </CardTitle>
          <CardDescription>
            Configure your Stripe API keys and account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stripeAccountId">Stripe Account ID</Label>
            <Input
              id="stripeAccountId"
              value={stripeAccountId}
              onChange={(e) => onStripeAccountIdChange(e.target.value)}
              placeholder="acct_..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stripePublishableKey">Stripe Publishable Key</Label>
            <Input
              id="stripePublishableKey"
              value={stripePublishableKey}
              onChange={(e) => onStripePublishableKeyChange(e.target.value)}
              placeholder="pk_test_... or pk_live_..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
            <Input
              id="stripeSecretKey"
              type="password"
              value={stripeSecretKey}
              onChange={(e) => onStripeSecretKeyChange(e.target.value)}
              placeholder="sk_test_... or sk_live_..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stripeCurrency">Transaction Currency</Label>
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">US Dollar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                <SelectItem value="NZD">New Zealand Dollar (NZD)</SelectItem>
                <SelectItem value="JPY">Japanese Yen (JPY)</SelectItem>
                <SelectItem value="SGD">Singapore Dollar (SGD)</SelectItem>
                <SelectItem value="HKD">Hong Kong Dollar (HKD)</SelectItem>
                <SelectItem value="CHF">Swiss Franc (CHF)</SelectItem>
                <SelectItem value="SEK">Swedish Krona (SEK)</SelectItem>
                <SelectItem value="NOK">Norwegian Krone (NOK)</SelectItem>
                <SelectItem value="DKK">Danish Krone (DKK)</SelectItem>
                <SelectItem value="PLN">Polish Zloty (PLN)</SelectItem>
                <SelectItem value="CZK">Czech Koruna (CZK)</SelectItem>
                <SelectItem value="HUF">Hungarian Forint (HUF)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Express Payment Methods removed */}
    </div>
  );
};