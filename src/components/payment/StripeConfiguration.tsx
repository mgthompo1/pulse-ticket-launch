import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StripeConfigurationProps {
  stripeAccountId: string;
  stripePublishableKey: string;
  onStripeAccountIdChange: (value: string) => void;
  onStripePublishableKeyChange: (value: string) => void;
}

export const StripeConfiguration = ({ 
  stripeAccountId, 
  stripePublishableKey,
  onStripeAccountIdChange, 
  onStripePublishableKeyChange 
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
    </div>
  );
};