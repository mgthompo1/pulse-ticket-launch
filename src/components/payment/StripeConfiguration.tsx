
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Apple, CreditCard } from "lucide-react";

interface StripeConfigurationProps {
  stripeAccountId: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  enableApplePay?: boolean;
  enableGooglePay?: boolean;
  onStripeAccountIdChange: (value: string) => void;
  onStripePublishableKeyChange: (value: string) => void;
  onStripeSecretKeyChange: (value: string) => void;
  onEnableApplePayChange?: (value: boolean) => void;
  onEnableGooglePayChange?: (value: boolean) => void;
}

export const StripeConfiguration = ({ 
  stripeAccountId, 
  stripePublishableKey,
  stripeSecretKey,
  enableApplePay = false,
  enableGooglePay = false,
  onStripeAccountIdChange, 
  onStripePublishableKeyChange,
  onStripeSecretKeyChange,
  onEnableApplePayChange,
  onEnableGooglePayChange
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
        </CardContent>
      </Card>

      {/* Express Payment Methods removed */}
    </div>
  );
};