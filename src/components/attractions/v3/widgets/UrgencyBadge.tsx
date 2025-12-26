/**
 * UrgencyBadge - Scarcity and urgency indicators
 * Shows "Only X left!", "Selling fast", and booking activity
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  Flame,
  Users,
  TrendingUp,
  Zap,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { urgencyPulse, urgencyShake } from '@/lib/animations';

type UrgencyLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

interface UrgencyBadgeProps {
  level: UrgencyLevel;
  spotsLeft?: number;
  message?: string;
  showAnimation?: boolean;
  variant?: 'badge' | 'banner' | 'inline' | 'floating';
  className?: string;
}

const levelConfig: Record<UrgencyLevel, {
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ReactNode;
  defaultMessage: string;
}> = {
  none: {
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-600',
    borderClass: 'border-gray-200',
    icon: <AlertTriangle className="w-4 h-4" />,
    defaultMessage: 'Sold out',
  },
  low: {
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200',
    icon: <TrendingUp className="w-4 h-4" />,
    defaultMessage: 'Good availability',
  },
  medium: {
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-200',
    icon: <Clock className="w-4 h-4" />,
    defaultMessage: 'Filling up',
  },
  high: {
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-200',
    icon: <Flame className="w-4 h-4" />,
    defaultMessage: 'Selling fast!',
  },
  critical: {
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    icon: <AlertTriangle className="w-4 h-4" />,
    defaultMessage: 'Almost sold out!',
  },
};

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
  level,
  spotsLeft,
  message,
  showAnimation = true,
  variant = 'badge',
  className,
}) => {
  const config = levelConfig[level];
  const displayMessage = message || (
    spotsLeft !== undefined
      ? spotsLeft <= 0
        ? config.defaultMessage
        : `Only ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left!`
      : config.defaultMessage
  );

  const shouldAnimate = showAnimation && (level === 'high' || level === 'critical');

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-sm font-medium',
          config.textClass,
          className
        )}
      >
        {config.icon}
        {displayMessage}
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <motion.div
        animate={shouldAnimate ? urgencyPulse.animate : undefined}
        className={cn(
          'w-full py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium',
          config.bgClass,
          config.textClass,
          className
        )}
      >
        {config.icon}
        {displayMessage}
      </motion.div>
    );
  }

  if (variant === 'floating') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-auto',
          'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg',
          'bg-white border',
          config.borderClass,
          className
        )}
      >
        <div className={cn('p-2 rounded-lg', config.bgClass, config.textClass)}>
          {config.icon}
        </div>
        <div>
          <p className={cn('font-semibold', config.textClass)}>{displayMessage}</p>
          {spotsLeft !== undefined && spotsLeft <= 5 && (
            <p className="text-xs text-gray-500">Book now to secure your spot</p>
          )}
        </div>
      </motion.div>
    );
  }

  // Default badge variant
  return (
    <motion.div
      animate={shouldAnimate ? urgencyPulse.animate : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border',
        config.bgClass,
        config.textClass,
        config.borderClass,
        className
      )}
    >
      {config.icon}
      {displayMessage}
    </motion.div>
  );
};

// Spots remaining counter
export const SpotsCounter: React.FC<{
  total: number;
  remaining: number;
  showBar?: boolean;
  className?: string;
}> = ({ total, remaining, showBar = true, className }) => {
  const percentage = (remaining / total) * 100;
  const level: UrgencyLevel =
    percentage <= 10 ? 'critical' :
    percentage <= 25 ? 'high' :
    percentage <= 50 ? 'medium' : 'low';

  const config = levelConfig[level];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className={cn('font-medium', config.textClass)}>
          {remaining} of {total} spots left
        </span>
        <span className="text-gray-500">{Math.round(percentage)}% available</span>
      </div>
      {showBar && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              level === 'critical' ? 'bg-red-500' :
              level === 'high' ? 'bg-orange-500' :
              level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
            )}
          />
        </div>
      )}
    </div>
  );
};

// Live viewing indicator
export const ViewingNow: React.FC<{
  count: number;
  className?: string;
}> = ({ count, className }) => {
  const [displayCount, setDisplayCount] = useState(count);

  // Simulate slight fluctuation for realism
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayCount((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1;
        return Math.max(1, prev + change);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm',
        className
      )}
    >
      <div className="relative">
        <Eye className="w-4 h-4" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
      </div>
      <span>
        <span className="font-semibold">{displayCount}</span> viewing now
      </span>
    </motion.div>
  );
};

// Recent bookings ticker
export const RecentBookingsTicker: React.FC<{
  bookings: { name: string; time: string; location?: string }[];
  className?: string;
}> = ({ bookings, className }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (bookings.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bookings.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [bookings.length]);

  if (bookings.length === 0) return null;

  return (
    <div className={cn('overflow-hidden', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center gap-2 text-sm"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-gray-600">
            <span className="font-medium text-gray-900">{bookings[currentIndex].name}</span>
            {' '}just booked
            {bookings[currentIndex].location && (
              <span className="text-gray-500"> from {bookings[currentIndex].location}</span>
            )}
          </span>
          <span className="text-gray-400">{bookings[currentIndex].time}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Popular time badge
export const PopularTimeBadge: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700',
        className
      )}
    >
      <Flame className="w-3 h-3" />
      Popular
    </span>
  );
};

// Booking countdown timer
export const BookingCountdown: React.FC<{
  expiresAt: Date;
  onExpire?: () => void;
  className?: string;
}> = ({ expiresAt, onExpire, className }) => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) {
        onExpire?.();
        return null;
      }
      return {
        minutes: Math.floor(diff / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      if (!newTimeLeft) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (!timeLeft) return null;

  const isUrgent = timeLeft.minutes < 5;

  return (
    <motion.div
      animate={isUrgent ? { scale: [1, 1.02, 1] } : undefined}
      transition={{ repeat: Infinity, duration: 1 }}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg',
        isUrgent ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700',
        className
      )}
    >
      <Clock className="w-4 h-4" />
      <span className="text-sm">
        Hold expires in{' '}
        <span className="font-mono font-bold">
          {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </span>
    </motion.div>
  );
};

export default UrgencyBadge;
