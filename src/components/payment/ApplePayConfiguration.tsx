
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApplePayConfigurationProps {
  applePayMerchantId: string;
  onApplePayMerchantIdChange: (value: string) => void;
}

export const ApplePayConfiguration = ({ applePayMerchantId, onApplePayMerchantIdChange }: ApplePayConfigurationProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="applePayMerchantId">Apple Pay Merchant ID</Label>
      <Input
        id="applePayMerchantId"
        value={applePayMerchantId}
        onChange={(e) => onApplePayMerchantIdChange(e.target.value)}
      />
    </div>
  );
};