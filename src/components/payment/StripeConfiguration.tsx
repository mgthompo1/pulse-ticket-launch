
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StripeConfigurationProps {
  stripeAccountId: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  onStripeAccountIdChange: (value: string) => void;
  onStripePublishableKeyChange: (value: string) => void;
  onStripeSecretKeyChange: (value: string) => void;
}

export const StripeConfiguration = ({ 
  stripeAccountId, 
  stripePublishableKey,
  stripeSecretKey,
  onStripeAccountIdChange, 
  onStripePublishableKeyChange,
  onStripeSecretKeyChange
}: StripeConfigurationProps) => {
  return (
    <div className="space-y-4">
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
    </div>
  );
};