import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StripeConfigurationProps {
  stripeAccountId: string;
  onStripeAccountIdChange: (value: string) => void;
}

export const StripeConfiguration = ({ stripeAccountId, onStripeAccountIdChange }: StripeConfigurationProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="stripeAccountId">Stripe Account ID</Label>
      <Input
        id="stripeAccountId"
        value={stripeAccountId}
        onChange={(e) => onStripeAccountIdChange(e.target.value)}
      />
    </div>
  );
};