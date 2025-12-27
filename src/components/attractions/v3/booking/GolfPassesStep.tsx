/**
 * GolfPassesStep - Shows passes/memberships for golf bookings
 * Allows customers to view and select passes or pay regular price
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Ticket,
  Infinity as InfinityIcon,
  Clock,
  Star,
  Check,
  Percent,
  Users,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAttractionPasses } from '@/hooks/usePasses';
import type { AttractionPass } from '@/types/verticals';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/types/attraction-v3';
import { staggerContainer, staggerItem } from '@/lib/animations';

interface GolfPassesStepProps {
  attractionId: string;
  basePrice: number;
  currency: string;
  partySize: number;
  onPassSelect: (pass: AttractionPass | null) => void;
  selectedPassId?: string | null;
}

export function GolfPassesStep({
  attractionId,
  basePrice,
  currency,
  partySize,
  onPassSelect,
  selectedPassId,
}: GolfPassesStepProps) {
  const { data: passes, isLoading } = useAttractionPasses({ attractionId });

  const sortedPasses = useMemo(() => {
    if (!passes) return [];
    // Sort by featured first, then by display order
    return [...passes].sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (a.display_order || 0) - (b.display_order || 0);
    });
  }, [passes]);

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

  const getPassTypeLabel = (type: string) => {
    switch (type) {
      case 'unlimited':
        return 'Unlimited Access';
      case 'punch_card':
        return 'Multi-Round Pass';
      case 'time_limited':
        return 'Membership';
      default:
        return 'Pass';
    }
  };

  const getValidityLabel = (pass: AttractionPass) => {
    if (pass.pass_type === 'punch_card' && pass.total_uses) {
      return `${pass.total_uses} rounds`;
    }
    if (pass.validity_period) {
      const periods: Record<string, string> = {
        days: `${pass.duration_days} days`,
        weekly: 'Weekly',
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        yearly: 'Annual',
        lifetime: 'Lifetime',
      };
      return periods[pass.validity_period] || pass.validity_period;
    }
    return null;
  };

  const calculateSavings = (pass: AttractionPass) => {
    if (!pass.member_discount_percent) return null;
    const regularTotal = basePrice * partySize;
    const discountAmount = (regularTotal * pass.member_discount_percent) / 100;
    return {
      percent: pass.member_discount_percent,
      amount: discountAmount,
      finalPrice: regularTotal - discountAmount,
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading passes...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerItem}>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Passes & Memberships
        </h3>
        <p className="text-muted-foreground text-sm">
          Save with a pass or membership, or continue with regular pricing
        </p>
      </motion.div>

      {/* Regular Price Option */}
      <motion.div variants={staggerItem}>
        <button
          onClick={() => onPassSelect(null)}
          className={cn(
            'w-full p-4 rounded-xl border-2 text-left transition-all',
            !selectedPassId
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                !selectedPassId ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-foreground">Pay Per Round</div>
                <div className="text-sm text-muted-foreground">
                  Standard green fee pricing
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">
                {formatPrice(basePrice * partySize, currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatPrice(basePrice, currency)} x {partySize}
              </div>
            </div>
          </div>
          {!selectedPassId && (
            <div className="absolute top-3 right-3">
              <Check className="w-5 h-5 text-primary" />
            </div>
          )}
        </button>
      </motion.div>

      {/* Available Passes */}
      {sortedPasses.length > 0 && (
        <>
          <motion.div variants={staggerItem} className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Or choose a pass
            </span>
            <div className="h-px flex-1 bg-border" />
          </motion.div>

          <motion.div variants={staggerItem} className="grid gap-4">
            {sortedPasses.map((pass) => {
              const isSelected = selectedPassId === pass.id;
              const savings = calculateSavings(pass);
              const validityLabel = getValidityLabel(pass);

              return (
                <motion.button
                  key={pass.id}
                  variants={staggerItem}
                  onClick={() => onPassSelect(pass)}
                  className={cn(
                    'relative w-full p-5 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50',
                    pass.is_featured && !isSelected && 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
                  )}
                >
                  {/* Featured Badge */}
                  {pass.is_featured && (
                    <div className="absolute -top-3 left-4">
                      <Badge className="bg-amber-500 text-white border-0">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      'p-3 rounded-xl shrink-0',
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : pass.is_featured
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {getPassIcon(pass.pass_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">
                          {pass.name}
                        </span>
                        {validityLabel && (
                          <Badge variant="secondary" className="text-xs">
                            {validityLabel}
                          </Badge>
                        )}
                      </div>

                      {pass.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {pass.description}
                        </p>
                      )}

                      {/* Features */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {getPassTypeLabel(pass.pass_type)}
                        </span>
                        {pass.member_discount_percent && pass.member_discount_percent > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Percent className="w-3 h-3" />
                            {pass.member_discount_percent}% off rounds
                          </span>
                        )}
                        {pass.priority_booking_hours && pass.priority_booking_hours > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            <Sparkles className="w-3 h-3" />
                            {pass.priority_booking_hours}hr early booking
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-foreground">
                        {formatPrice(pass.price, currency)}
                      </div>
                      {pass.is_subscription && pass.billing_interval && (
                        <div className="text-xs text-muted-foreground">
                          per {pass.billing_interval}
                        </div>
                      )}
                      {savings && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          Save {formatPrice(savings.amount, currency)} today
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </>
      )}

      {/* Empty State */}
      {sortedPasses.length === 0 && (
        <motion.div variants={staggerItem} className="text-center py-8">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">
            No passes available for this course yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Continue with regular pricing below.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

export default GolfPassesStep;
