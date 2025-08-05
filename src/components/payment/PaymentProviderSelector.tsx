
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentProviderSelectorProps {
  paymentProvider: string;
  onProviderChange: (value: string) => void;
}

export const PaymentProviderSelector = ({ paymentProvider, onProviderChange }: PaymentProviderSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="paymentProvider">Payment Provider</Label>
      <Select value={paymentProvider} onValueChange={onProviderChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select payment provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="stripe">Stripe</SelectItem>
          <SelectItem value="windcave">Windcave</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};