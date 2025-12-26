/**
 * TipSelector - Add tips during checkout
 * Used in salon/spa verticals
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TipSelectorProps {
  subtotal: number;
  onTipChange: (tipAmount: number, tipPercent: number | null) => void;
  staffName?: string;
  className?: string;
}

const TIP_PERCENTAGES = [15, 18, 20, 25];

export function TipSelector({
  subtotal,
  onTipChange,
  staffName,
  className,
}: TipSelectorProps) {
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);

  const handlePercentSelect = (percent: number) => {
    setSelectedPercent(percent);
    setIsCustom(false);
    setCustomAmount('');
    const tipAmount = Math.round((subtotal * percent) / 100 * 100) / 100;
    onTipChange(tipAmount, percent);
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    setSelectedPercent(null);
    setIsCustom(true);
    const amount = parseFloat(value) || 0;
    onTipChange(amount, null);
  };

  const handleNoTip = () => {
    setSelectedPercent(null);
    setIsCustom(false);
    setCustomAmount('');
    onTipChange(0, null);
  };

  const currentTip = isCustom
    ? parseFloat(customAmount) || 0
    : selectedPercent
    ? Math.round((subtotal * selectedPercent) / 100 * 100) / 100
    : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="w-5 h-5 text-pink-500" />
          Add a Tip
        </CardTitle>
        {staffName && (
          <CardDescription>
            Show your appreciation for {staffName}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Percentage Options */}
        <div className="grid grid-cols-4 gap-2">
          {TIP_PERCENTAGES.map((percent) => {
            const amount = Math.round((subtotal * percent) / 100 * 100) / 100;
            const isSelected = selectedPercent === percent && !isCustom;

            return (
              <button
                key={percent}
                onClick={() => handlePercentSelect(percent)}
                className={cn(
                  'flex flex-col items-center p-3 rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span className="font-semibold text-lg">{percent}%</span>
                <span className="text-xs text-muted-foreground">${amount.toFixed(2)}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Amount */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={customAmount}
              onChange={(e) => handleCustomAmount(e.target.value)}
              placeholder="Custom amount"
              className={cn(
                'pl-8',
                isCustom && customAmount ? 'border-primary ring-2 ring-primary/30' : ''
              )}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNoTip}
            className={cn(
              'shrink-0',
              !selectedPercent && !isCustom && 'text-primary'
            )}
          >
            No Tip
          </Button>
        </div>

        {/* Summary */}
        {currentTip > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm">Tip amount</span>
            <span className="font-semibold text-primary">${currentTip.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TipSelector;
