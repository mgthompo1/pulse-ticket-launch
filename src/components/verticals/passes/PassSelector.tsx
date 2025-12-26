/**
 * PassSelector - Apply membership passes during booking
 * Shows available passes for customer to use
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  CreditCard,
  Check,
  Ticket,
  Infinity as InfinityIcon,
  Clock,
  Star,
  Percent,
} from 'lucide-react';
import { useClientPasses, useValidatePass } from '@/hooks/usePasses';
import type { ClientPass, AttractionPass } from '@/types/verticals';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PassSelectorProps {
  attractionId: string;
  clientId: string;
  bookingDate: Date;
  startTime: string;
  basePrice: number;
  onPassSelect: (pass: ClientPass | null, discount: number) => void;
  className?: string;
}

export function PassSelector({
  attractionId,
  clientId,
  bookingDate,
  startTime,
  basePrice,
  onPassSelect,
  className,
}: PassSelectorProps) {
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);

  const { data: clientPasses, isLoading } = useClientPasses({ clientId });
  const validatePass = useValidatePass();

  // Filter passes that belong to this attraction and are active
  const applicablePasses = React.useMemo(() => {
    if (!clientPasses) return [];
    return clientPasses.filter((cp) => {
      const pass = cp.pass as AttractionPass;
      return (
        pass?.attraction_id === attractionId &&
        cp.status === 'active' &&
        (!cp.expires_at || new Date(cp.expires_at) > new Date()) &&
        (cp.remaining_uses === null || cp.remaining_uses > 0)
      );
    });
  }, [clientPasses, attractionId]);

  const handlePassSelect = async (passId: string | null) => {
    setSelectedPassId(passId);

    if (!passId) {
      onPassSelect(null, 0);
      return;
    }

    const selectedPass = applicablePasses.find((p) => p.id === passId);
    if (!selectedPass) {
      onPassSelect(null, 0);
      return;
    }

    const pass = selectedPass.pass as AttractionPass;

    // Validate the pass
    try {
      const isValid = await validatePass.mutateAsync({
        clientPassId: passId,
        attractionId,
        bookingDate: format(bookingDate, 'yyyy-MM-dd'),
        startTime,
      });

      if (isValid) {
        const discountPercent = pass.member_discount_percent || 0;
        const discount = (basePrice * discountPercent) / 100;
        onPassSelect(selectedPass, discount);
      } else {
        onPassSelect(null, 0);
      }
    } catch (error) {
      onPassSelect(null, 0);
    }
  };

  const getPassIcon = (type: string) => {
    switch (type) {
      case 'unlimited':
        return <InfinityIcon className="w-5 h-5" />;
      case 'punch_card':
        return <Ticket className="w-5 h-5" />;
      case 'time_limited':
        return <Clock className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getPassStatus = (clientPass: ClientPass) => {
    const pass = clientPass.pass as AttractionPass;
    if (clientPass.remaining_uses !== null) {
      return `${clientPass.remaining_uses} uses left`;
    }
    if (clientPass.expires_at) {
      return `Expires ${format(new Date(clientPass.expires_at), 'MMM d, yyyy')}`;
    }
    return 'Active';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          Checking for available passes...
        </CardContent>
      </Card>
    );
  }

  if (applicablePasses.length === 0) {
    return null; // Don't show anything if no passes available
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="w-5 h-5 text-primary" />
          Apply a Pass
        </CardTitle>
        <CardDescription>
          You have {applicablePasses.length} pass{applicablePasses.length !== 1 ? 'es' : ''} available
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedPassId || ''}
          onValueChange={(value) => handlePassSelect(value || null)}
          className="space-y-3"
        >
          {/* No pass option */}
          <div
            className={cn(
              'flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer',
              !selectedPassId
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => handlePassSelect(null)}
          >
            <RadioGroupItem value="" id="no-pass" />
            <Label htmlFor="no-pass" className="flex-1 cursor-pointer">
              <div className="font-medium">Pay Full Price</div>
              <div className="text-sm text-muted-foreground">
                ${basePrice.toFixed(2)}
              </div>
            </Label>
          </div>

          {/* Available passes */}
          {applicablePasses.map((clientPass) => {
            const pass = clientPass.pass as AttractionPass;
            const isSelected = selectedPassId === clientPass.id;
            const discountPercent = pass.member_discount_percent || 0;
            const discountAmount = (basePrice * discountPercent) / 100;
            const finalPrice = basePrice - discountAmount;

            return (
              <div
                key={clientPass.id}
                className={cn(
                  'flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => handlePassSelect(clientPass.id)}
              >
                <RadioGroupItem value={clientPass.id} id={clientPass.id} className="mt-1" />
                <Label htmlFor={clientPass.id} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'p-1.5 rounded',
                      isSelected ? 'bg-primary/10 text-primary' : 'bg-muted'
                    )}>
                      {getPassIcon(pass.pass_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pass.name}</span>
                        {pass.is_featured && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getPassStatus(clientPass)}
                      </div>
                    </div>
                  </div>

                  {discountPercent > 0 && (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <Percent className="w-4 h-4" />
                        <span>{discountPercent}% off</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm line-through text-muted-foreground">
                          ${basePrice.toFixed(2)}
                        </div>
                        <div className="font-semibold text-primary">
                          ${finalPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  {pass.pass_type === 'punch_card' && clientPass.remaining_uses !== null && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      This will use 1 of your {clientPass.remaining_uses} remaining punches
                    </div>
                  )}
                </Label>

                {isSelected && (
                  <Check className="w-5 h-5 text-primary mt-1" />
                )}
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export default PassSelector;
