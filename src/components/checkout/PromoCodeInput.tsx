import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Tag, Gift } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PromoCodeInputProps {
  promoCode: string;
  setPromoCode: (code: string) => void;
  promoDiscount: number;
  promoError: string | null;
  isValidating: boolean;
  onApply: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export const PromoCodeInput = ({
  promoCode,
  setPromoCode,
  promoDiscount,
  promoError,
  isValidating,
  onApply,
  onClear,
  disabled = false,
}: PromoCodeInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleApply = () => {
    if (promoCode.trim()) {
      onApply();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  const isApplied = promoDiscount > 0 && !promoError;

  return (
    <div className="space-y-2">
      <Label htmlFor="promo-code" className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        Promo Code (Optional)
      </Label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            id="promo-code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter promo code"
            disabled={disabled || isApplied}
            className={`font-mono uppercase ${
              isApplied
                ? 'border-green-500 bg-green-50'
                : promoError
                ? 'border-red-500'
                : isFocused
                ? 'border-blue-500'
                : ''
            }`}
          />
          {isApplied && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
          )}
          {promoError && !isApplied && (
            <X className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-600" />
          )}
        </div>

        {!isApplied ? (
          <Button
            onClick={handleApply}
            disabled={disabled || !promoCode.trim() || isValidating}
            variant="outline"
            className="min-w-[100px]"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Apply'
            )}
          </Button>
        ) : (
          <Button
            onClick={onClear}
            disabled={disabled}
            variant="outline"
            className="min-w-[100px]"
          >
            Remove
          </Button>
        )}
      </div>

      {/* Success message */}
      {isApplied && (
        <Alert className="border-green-500 bg-green-50">
          <Gift className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Code applied!</strong> You're saving ${promoDiscount.toFixed(2)}
          </AlertDescription>
        </Alert>
      )}

      {/* Error message */}
      {promoError && !isApplied && (
        <Alert variant="destructive" className="bg-red-50">
          <X className="h-4 w-4" />
          <AlertDescription>{promoError}</AlertDescription>
        </Alert>
      )}

      {/* Helper text */}
      {!isApplied && !promoError && (
        <p className="text-xs text-gray-500">
          Have a discount code? Enter it above to save on your purchase.
        </p>
      )}
    </div>
  );
};
