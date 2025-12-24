/**
 * TimeSlotPicker - Grouped time slot selection with urgency indicators
 * Shows slots grouped by morning/afternoon/evening with premium animations
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Sun,
  Sunset,
  Moon,
  AlertCircle,
  CheckCircle,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EnhancedBookingSlot,
  TimeSlotGroup,
  StaffProfile,
  AvailabilityLevel,
  groupSlotsByTimeOfDay,
  formatTime,
  formatPrice,
} from '@/types/attraction-v3';
import {
  staggerContainer,
  staggerItem,
  timeSlot as timeSlotAnimation,
  buttonTap,
} from '@/lib/animations';

interface TimeSlotPickerProps {
  slots: EnhancedBookingSlot[];
  selectedSlotId: string | null;
  basePrice: number;
  currency?: string;
  loading?: boolean;
  showStaff?: boolean;
  onSlotSelect: (slot: EnhancedBookingSlot) => void;
  onTryAnotherDate?: () => void;
  className?: string;
}

const groupIcons: Record<string, React.ReactNode> = {
  morning: <Sun className="w-5 h-5 text-yellow-500" />,
  afternoon: <Sunset className="w-5 h-5 text-orange-500" />,
  evening: <Moon className="w-5 h-5 text-indigo-500" />,
};

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlotId,
  basePrice,
  currency = 'USD',
  loading = false,
  showStaff = true,
  onSlotSelect,
  onTryAnotherDate,
  className,
}) => {
  const groupedSlots = useMemo(() => groupSlotsByTimeOfDay(slots), [slots]);

  const getUrgencyClass = (level: AvailabilityLevel): string => {
    switch (level) {
      case 'low':
        return 'urgency-critical';
      case 'medium':
        return 'urgency-high';
      case 'high':
        return 'urgency-low';
      default:
        return '';
    }
  };

  const getUrgencyText = (spotsLeft: number): string | null => {
    if (spotsLeft <= 1) return 'Last spot!';
    if (spotsLeft <= 3) return `Only ${spotsLeft} left`;
    if (spotsLeft <= 5) return `${spotsLeft} spots left`;
    return null;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        {['morning', 'afternoon'].map((group) => (
          <div key={group} className="space-y-3">
            <div className="skeleton-text w-32" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-card h-24" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!slots || slots.length === 0) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className={cn(
          'flex flex-col items-center justify-center py-12 px-6 text-center',
          'bg-muted rounded-xl border border-border',
          className
        )}
      >
        <motion.div variants={staggerItem}>
          <Clock className="w-12 h-12 text-muted-foreground mb-4" />
        </motion.div>
        <motion.h3 variants={staggerItem} className="text-lg font-semibold text-foreground mb-2">
          No available times
        </motion.h3>
        <motion.p variants={staggerItem} className="text-muted-foreground mb-4 max-w-sm">
          There are no available time slots for this date. Try selecting a different date.
        </motion.p>
        {onTryAnotherDate && (
          <motion.button
            variants={staggerItem}
            whileTap={buttonTap}
            onClick={onTryAnotherDate}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Try another date
          </motion.button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn('space-y-6', className)}
    >
      {groupedSlots.map((group) => (
        <motion.div key={group.id} variants={staggerItem} className="space-y-3">
          {/* Group Header */}
          <div className="flex items-center gap-2">
            {groupIcons[group.id]}
            <h3 className="text-lg font-semibold text-foreground">{group.label}</h3>
            <span className="text-sm text-muted-foreground">({group.time_range})</span>
            <span className="ml-auto text-sm text-muted-foreground">
              {group.slots.length} {group.slots.length === 1 ? 'slot' : 'slots'}
            </span>
          </div>

          {/* Slots Grid */}
          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            <AnimatePresence>
              {group.slots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                const price = slot.price_override ?? basePrice;
                const spotsLeft = slot.spots_left;
                const urgencyText = getUrgencyText(spotsLeft);
                const hasDiscount = slot.price_override !== null && slot.price_override < basePrice;

                return (
                  <motion.button
                    key={slot.id}
                    variants={timeSlotAnimation}
                    initial="hidden"
                    animate={isSelected ? 'selected' : 'visible'}
                    whileHover="hover"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSlotSelect(slot)}
                    disabled={spotsLeft === 0}
                    className={cn(
                      'time-slot-card text-left',
                      isSelected && 'time-slot-card-selected',
                      spotsLeft === 0 && 'time-slot-card-disabled'
                    )}
                    aria-pressed={isSelected}
                    aria-label={`${formatTime(slot.start_time)} - ${formatPrice(price, currency)} - ${spotsLeft} spots left`}
                  >
                    {/* Urgency Badge */}
                    {urgencyText && spotsLeft > 0 && (
                      <span
                        className={cn(
                          'time-slot-badge',
                          spotsLeft <= 1
                            ? 'bg-red-500 text-white'
                            : spotsLeft <= 3
                            ? 'bg-orange-500 text-white'
                            : 'bg-yellow-500 text-yellow-950'
                        )}
                      >
                        {urgencyText}
                      </span>
                    )}

                    {/* Selected Indicator */}
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2"
                      >
                        <CheckCircle className="w-5 h-5 text-primary" />
                      </motion.span>
                    )}

                    <div className="space-y-2">
                      {/* Time */}
                      <div className="text-lg font-bold text-foreground">
                        {formatTime(slot.start_time)}
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            hasDiscount ? 'text-green-600' : 'text-muted-foreground'
                          )}
                        >
                          {formatPrice(price, currency)}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-muted-foreground/70 line-through">
                            {formatPrice(basePrice, currency)}
                          </span>
                        )}
                      </div>

                      {/* Capacity */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{spotsLeft} of {slot.max_capacity} left</span>
                      </div>

                      {/* Staff/Resource */}
                      {showStaff && slot.resource && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                          {slot.resource.photo_url ? (
                            <img
                              src={slot.resource.photo_url}
                              alt={slot.resource.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs font-medium text-muted-foreground">
                                {slot.resource.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground truncate">
                            {slot.resource.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ))}

      {/* Selection Hint */}
      {!selectedSlotId && (
        <motion.p
          variants={staggerItem}
          className="text-center text-sm text-muted-foreground pt-4"
        >
          Select a time slot to continue
        </motion.p>
      )}
    </motion.div>
  );
};

// Compact horizontal scroll version for mobile
export const TimeSlotStrip: React.FC<{
  slots: EnhancedBookingSlot[];
  selectedSlotId: string | null;
  basePrice: number;
  currency?: string;
  onSlotSelect: (slot: EnhancedBookingSlot) => void;
  className?: string;
}> = ({ slots, selectedSlotId, basePrice, currency = 'USD', onSlotSelect, className }) => {
  return (
    <div className={cn('overflow-x-auto scrollbar-hide', className)}>
      <div className="flex gap-3 pb-2 scroll-snap-x">
        {slots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          const price = slot.price_override ?? basePrice;
          const spotsLeft = slot.spots_left;

          return (
            <motion.button
              key={slot.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSlotSelect(slot)}
              disabled={spotsLeft === 0}
              className={cn(
                'flex-shrink-0 scroll-snap-item',
                'flex flex-col items-center p-4 rounded-xl border-2 min-w-[100px]',
                'transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-border bg-card hover:border-muted-foreground/30',
                spotsLeft === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="text-lg font-bold text-foreground">
                {formatTime(slot.start_time)}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatPrice(price, currency)}
              </span>
              <span
                className={cn(
                  'text-xs mt-1',
                  spotsLeft <= 3 ? 'text-orange-600 font-medium' : 'text-muted-foreground'
                )}
              >
                {spotsLeft} left
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotPicker;
