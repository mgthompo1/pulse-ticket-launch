/**
 * TrustSignals - Security badges and trust indicators
 * Shows payment security, guarantee badges, and verified status
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  CreditCard,
  CheckCircle,
  Award,
  Clock,
  RefreshCw,
  Star,
  Users,
  Calendar,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';

interface TrustBadge {
  icon: React.ReactNode;
  label: string;
  description?: string;
}

interface TrustSignalsProps {
  variant?: 'compact' | 'detailed' | 'inline';
  showPaymentBadges?: boolean;
  showGuarantees?: boolean;
  showStats?: boolean;
  bookingCount?: number;
  rating?: number;
  reviewCount?: number;
  className?: string;
}

const paymentBadges: TrustBadge[] = [
  {
    icon: <Lock className="w-4 h-4" />,
    label: 'Secure Checkout',
    description: '256-bit SSL encryption',
  },
  {
    icon: <CreditCard className="w-4 h-4" />,
    label: 'Safe Payment',
    description: 'PCI DSS compliant',
  },
  {
    icon: <Shield className="w-4 h-4" />,
    label: 'Data Protected',
    description: 'Your info is safe',
  },
];

const guaranteeBadges: TrustBadge[] = [
  {
    icon: <RefreshCw className="w-4 h-4" />,
    label: 'Free Cancellation',
    description: 'Up to 24h before',
  },
  {
    icon: <Clock className="w-4 h-4" />,
    label: 'Instant Confirmation',
    description: 'Get tickets immediately',
  },
  {
    icon: <Award className="w-4 h-4" />,
    label: 'Best Price Guarantee',
    description: 'Lowest price or refund',
  },
];

export const TrustSignals: React.FC<TrustSignalsProps> = ({
  variant = 'compact',
  showPaymentBadges = true,
  showGuarantees = true,
  showStats = false,
  bookingCount,
  rating,
  reviewCount,
  className,
}) => {
  if (variant === 'inline') {
    return (
      <div className={cn('flex flex-wrap items-center gap-4 text-sm text-muted-foreground', className)}>
        {showPaymentBadges && (
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-green-600" />
            <span>Secure checkout</span>
          </div>
        )}
        {showGuarantees && (
          <>
            <div className="flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Free cancellation</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-yellow-600" />
              <span>Instant confirmation</span>
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center justify-center gap-6 py-3', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="text-sm">Secure</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="w-4 h-4 text-blue-600" />
          <span className="text-sm">Free Cancel</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="w-4 h-4 text-yellow-600" />
          <span className="text-sm">Instant</span>
        </div>
      </div>
    );
  }

  // Detailed variant
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn('space-y-6', className)}
    >
      {/* Stats */}
      {showStats && (bookingCount || rating) && (
        <motion.div
          variants={staggerItem}
          className="flex items-center justify-center gap-6 py-4 border-b border-border"
        >
          {bookingCount && bookingCount > 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Users className="w-5 h-5" />
                <span className="text-2xl font-bold">{bookingCount.toLocaleString()}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Bookings</p>
            </div>
          )}
          {rating && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-yellow-500">
                <Star className="w-5 h-5 fill-yellow-400" />
                <span className="text-2xl font-bold">{rating.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {reviewCount ? `${reviewCount} reviews` : 'Rating'}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Payment Badges */}
      {showPaymentBadges && (
        <motion.div variants={staggerItem}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Secure Payment</h4>
          <div className="grid grid-cols-3 gap-3">
            {paymentBadges.map((badge, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50"
              >
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 mb-2">
                  {badge.icon}
                </div>
                <span className="text-xs font-medium text-foreground">{badge.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Guarantee Badges */}
      {showGuarantees && (
        <motion.div variants={staggerItem}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Our Guarantees</h4>
          <div className="space-y-2">
            {guaranteeBadges.map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-primary/5"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  {badge.icon}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    {badge.label}
                  </span>
                  {badge.description && (
                    <span className="text-xs text-muted-foreground">{badge.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Payment method logos
export const PaymentMethods: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <div className="px-2 py-1 bg-card rounded border border-border">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">VISA</span>
      </div>
      <div className="px-2 py-1 bg-card rounded border border-border">
        <span className="text-xs font-bold text-red-600 dark:text-red-400">Mastercard</span>
      </div>
      <div className="px-2 py-1 bg-card rounded border border-border">
        <span className="text-xs font-bold text-blue-800 dark:text-blue-300">AMEX</span>
      </div>
      <div className="px-2 py-1 bg-card rounded border border-border">
        <span className="text-xs font-bold text-foreground">Apple Pay</span>
      </div>
    </div>
  );
};

// Verified badge
export const VerifiedBadge: React.FC<{
  label?: string;
  className?: string;
}> = ({ label = 'Verified', className }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium',
        className
      )}
    >
      <CheckCircle className="w-3 h-3" />
      {label}
    </div>
  );
};

// Recent activity indicator
export const RecentActivity: React.FC<{
  count: number;
  timeframe?: string;
  className?: string;
}> = ({ count, timeframe = 'today', className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100',
        className
      )}
    >
      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
      <span className="text-sm text-orange-700">
        <span className="font-semibold">{count}</span> booked {timeframe}
      </span>
    </motion.div>
  );
};

export default TrustSignals;
