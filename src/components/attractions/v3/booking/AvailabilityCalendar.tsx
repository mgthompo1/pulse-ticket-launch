/**
 * AvailabilityCalendar - Modern calendar with availability indicators
 * Shows colored dots for availability levels and price variations
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DateAvailability, AvailabilityLevel, formatPrice } from '@/types/attraction-v3';
import { calendarMonth, fadeIn } from '@/lib/animations';

interface AvailabilityCalendarProps {
  selectedDate: string;
  availability: Map<string, DateAvailability>;
  blackoutDates?: string[];
  minDate?: Date;
  maxDate?: Date;
  currency?: string;
  onDateSelect: (date: string) => void;
  className?: string;
  compact?: boolean;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  selectedDate,
  availability,
  blackoutDates = [],
  minDate = new Date(),
  maxDate,
  currency = 'USD',
  onDateSelect,
  className,
  compact = false,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = selectedDate ? new Date(selectedDate) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [direction, setDirection] = useState(0);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      date: Date;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isPast: boolean;
      isBlackout: boolean;
      availability?: DateAvailability;
    }> = [];

    // Add days from previous month
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];
      days.push({
        date,
        dateString,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isPast: true,
        isBlackout: false,
      });
    }

    // Add days of current month
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today;
      const isBlackout = blackoutDates.includes(dateString);
      const isFuture = maxDate ? date > maxDate : false;

      days.push({
        date,
        dateString,
        isCurrentMonth: true,
        isToday,
        isSelected: dateString === selectedDate,
        isPast: isPast || isFuture,
        isBlackout,
        availability: availability.get(dateString),
      });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateString = date.toISOString().split('T')[0];
      days.push({
        date,
        dateString,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isPast: false,
        isBlackout: false,
      });
    }

    return days;
  }, [currentMonth, selectedDate, availability, blackoutDates, maxDate]);

  const navigateMonth = (delta: number) => {
    setDirection(delta);
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect(today.toISOString().split('T')[0]);
  };

  const getAvailabilityDotClass = (level?: AvailabilityLevel): string => {
    switch (level) {
      case 'high':
        return 'dot-available-high';
      case 'medium':
        return 'dot-available-medium';
      case 'low':
        return 'dot-available-low';
      case 'none':
        return 'dot-available-none';
      default:
        return '';
    }
  };

  return (
    <div className={cn('bg-card rounded-xl border border-border shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>

        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={currentMonth.toISOString()}
            variants={calendarMonth}
            custom={direction}
            initial="enter"
            animate="center"
            exit="exit"
            className="text-lg font-semibold text-foreground"
          >
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </motion.h2>
        </AnimatePresence>

        <button
          onClick={() => navigateMonth(1)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Quick Actions */}
      {!compact && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-xs"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              onDateSelect(tomorrow.toISOString().split('T')[0]);
            }}
            className="text-xs"
          >
            Tomorrow
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = new Date();
              const dayOfWeek = today.getDay();
              const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
              const saturday = new Date(today);
              saturday.setDate(today.getDate() + daysUntilSaturday);
              onDateSelect(saturday.toISOString().split('T')[0]);
            }}
            className="text-xs"
          >
            This Weekend
          </Button>
        </div>
      )}

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 px-4 py-2 border-b border-border">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {compact ? day.charAt(0) : day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentMonth.toISOString()}
          variants={calendarMonth}
          custom={direction}
          initial="enter"
          animate="center"
          exit="exit"
          className="grid grid-cols-7 gap-1 p-4"
        >
          {calendarDays.map((day, index) => {
            const isDisabled = !day.isCurrentMonth || day.isPast || day.isBlackout;
            const hasAvailability = day.availability && day.availability.slots_available > 0;

            return (
              <motion.button
                key={day.dateString}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                onClick={() => !isDisabled && onDateSelect(day.dateString)}
                disabled={isDisabled}
                className={cn(
                  'calendar-day',
                  day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50',
                  day.isToday && !day.isSelected && 'calendar-day-today',
                  day.isSelected && 'calendar-day-selected',
                  day.isBlackout && day.isCurrentMonth && 'calendar-day-blackout',
                  isDisabled && 'calendar-day-disabled',
                  !isDisabled && 'calendar-day-available'
                )}
                aria-label={`${day.date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}${day.isBlackout ? ' - Unavailable' : ''}`}
              >
                <span>{day.date.getDate()}</span>

                {/* Availability Dot */}
                {day.isCurrentMonth && !day.isPast && !day.isBlackout && day.availability && (
                  <span
                    className={cn(
                      'calendar-availability-dot',
                      getAvailabilityDotClass(day.availability.level)
                    )}
                  />
                )}

                {/* Price Indicator (on hover/selected) */}
                {day.isSelected && day.availability?.lowest_price && !compact && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-primary whitespace-nowrap"
                  >
                    from {formatPrice(day.availability.lowest_price, currency)}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      {!compact && (
        <div className="flex items-center justify-center gap-6 px-4 py-3 border-t border-border bg-muted/50">
          <div className="flex items-center gap-1.5">
            <span className="dot-available-high" />
            <span className="text-xs text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="dot-available-medium" />
            <span className="text-xs text-muted-foreground">Limited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="dot-available-low" />
            <span className="text-xs text-muted-foreground">Almost full</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="dot-available-none" />
            <span className="text-xs text-muted-foreground">Sold out</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Horizontal Week View for Mobile
export const WeekStrip: React.FC<{
  selectedDate: string;
  availability: Map<string, DateAvailability>;
  onDateSelect: (date: string) => void;
  className?: string;
}> = ({ selectedDate, availability, onDateSelect, className }) => {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      return {
        date,
        dateString,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isSelected: dateString === selectedDate,
        availability: availability.get(dateString),
      };
    });
  }, [startDate, selectedDate, availability]);

  return (
    <div className={cn('bg-card rounded-xl border border-border p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setStartDate((prev) => {
            const next = new Date(prev);
            next.setDate(prev.getDate() - 7);
            return next;
          })}
          className="p-1 rounded hover:bg-muted"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">
          {startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
        <button
          onClick={() => setStartDate((prev) => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + 7);
            return next;
          })}
          className="p-1 rounded hover:bg-muted"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-snap-x">
        {days.map((day) => (
          <button
            key={day.dateString}
            onClick={() => onDateSelect(day.dateString)}
            className={cn(
              'flex-shrink-0 flex flex-col items-center p-3 rounded-xl transition-all scroll-snap-item',
              'min-w-[60px] touch-target',
              day.isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            <span className="text-xs font-medium opacity-80">{day.dayName}</span>
            <span className="text-lg font-bold">{day.dayNumber}</span>
            {day.availability && (
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full mt-1',
                  day.availability.level === 'high' && 'bg-green-500',
                  day.availability.level === 'medium' && 'bg-yellow-500',
                  day.availability.level === 'low' && 'bg-orange-500',
                  day.availability.level === 'none' && 'bg-gray-300',
                  day.isSelected && 'bg-white/80'
                )}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
