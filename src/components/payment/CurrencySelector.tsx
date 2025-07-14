import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CurrencySelectorProps {
  currency: string;
  onCurrencyChange: (value: string) => void;
}

export const CurrencySelector = ({ currency, onCurrencyChange }: CurrencySelectorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="currency">Currency</Label>
      <Select value={currency} onValueChange={onCurrencyChange}>
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
  );
};