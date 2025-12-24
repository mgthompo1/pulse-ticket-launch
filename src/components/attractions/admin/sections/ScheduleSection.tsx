/**
 * ScheduleSection - Operating hours and blackout dates management
 * Weekly schedule grid with time pickers and blackout calendar
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeRange {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  timeRanges: TimeRange[];
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface BlackoutDate {
  id: string;
  date: string;
  reason?: string;
  isRecurring?: boolean;
}

interface ScheduleSectionProps {
  schedule: WeeklySchedule;
  blackoutDates: BlackoutDate[];
  timezone?: string;
  onScheduleChange: (schedule: WeeklySchedule) => void;
  onBlackoutDatesChange: (dates: BlackoutDate[]) => void;
  onTimezoneChange?: (timezone: string) => void;
  className?: string;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
] as const;

const DEFAULT_TIME_RANGE: TimeRange = { start: '09:00', end: '17:00' };

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  schedule,
  blackoutDates,
  timezone = 'Pacific/Auckland',
  onScheduleChange,
  onBlackoutDatesChange,
  onTimezoneChange,
  className,
}) => {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showBlackoutCalendar, setShowBlackoutCalendar] = useState(false);
  const [selectedBlackoutMonth, setSelectedBlackoutMonth] = useState(new Date());

  // Toggle day enabled
  const toggleDayEnabled = (dayKey: keyof WeeklySchedule) => {
    const newSchedule = { ...schedule };
    newSchedule[dayKey] = {
      ...newSchedule[dayKey],
      enabled: !newSchedule[dayKey].enabled,
      timeRanges: newSchedule[dayKey].enabled
        ? []
        : [{ ...DEFAULT_TIME_RANGE }],
    };
    onScheduleChange(newSchedule);
  };

  // Update time range
  const updateTimeRange = (
    dayKey: keyof WeeklySchedule,
    rangeIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const newSchedule = { ...schedule };
    const newRanges = [...newSchedule[dayKey].timeRanges];
    newRanges[rangeIndex] = { ...newRanges[rangeIndex], [field]: value };
    newSchedule[dayKey] = { ...newSchedule[dayKey], timeRanges: newRanges };
    onScheduleChange(newSchedule);
  };

  // Add time range
  const addTimeRange = (dayKey: keyof WeeklySchedule) => {
    const newSchedule = { ...schedule };
    const existingRanges = newSchedule[dayKey].timeRanges;
    const lastRange = existingRanges[existingRanges.length - 1];

    // Create a new range starting after the last one
    const newStart = lastRange ? incrementTime(lastRange.end, 60) : '09:00';
    const newEnd = incrementTime(newStart, 480); // 8 hours later

    newSchedule[dayKey] = {
      ...newSchedule[dayKey],
      timeRanges: [...existingRanges, { start: newStart, end: newEnd }],
    };
    onScheduleChange(newSchedule);
  };

  // Remove time range
  const removeTimeRange = (dayKey: keyof WeeklySchedule, rangeIndex: number) => {
    const newSchedule = { ...schedule };
    const newRanges = [...newSchedule[dayKey].timeRanges];
    newRanges.splice(rangeIndex, 1);
    newSchedule[dayKey] = {
      ...newSchedule[dayKey],
      timeRanges: newRanges,
      enabled: newRanges.length > 0,
    };
    onScheduleChange(newSchedule);
  };

  // Copy to other days
  const copyToOtherDays = (sourceDay: keyof WeeklySchedule) => {
    const sourceSchedule = schedule[sourceDay];
    const newSchedule = { ...schedule };

    DAYS_OF_WEEK.forEach(({ key }) => {
      if (key !== sourceDay) {
        newSchedule[key as keyof WeeklySchedule] = {
          enabled: sourceSchedule.enabled,
          timeRanges: sourceSchedule.timeRanges.map((r) => ({ ...r })),
        };
      }
    });

    onScheduleChange(newSchedule);
  };

  // Toggle blackout date
  const toggleBlackoutDate = (dateStr: string) => {
    const existing = blackoutDates.find((d) => d.date === dateStr);
    if (existing) {
      onBlackoutDatesChange(blackoutDates.filter((d) => d.date !== dateStr));
    } else {
      onBlackoutDatesChange([
        ...blackoutDates,
        { id: crypto.randomUUID(), date: dateStr },
      ]);
    }
  };

  return (
    <div className={cn('space-y-8', className)}>
      {/* Section Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          Operating Hours
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Set your regular operating hours for each day of the week
        </p>
      </div>

      {/* Timezone Selector */}
      {onTimezoneChange && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Timezone:</label>
          <select
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="Pacific/Auckland">New Zealand (Auckland)</option>
            <option value="Australia/Sydney">Australia (Sydney)</option>
            <option value="America/New_York">US Eastern</option>
            <option value="America/Los_Angeles">US Pacific</option>
            <option value="Europe/London">UK (London)</option>
          </select>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="space-y-2">
        {DAYS_OF_WEEK.map(({ key, label, short }) => {
          const daySchedule = schedule[key as keyof WeeklySchedule];
          const isExpanded = expandedDay === key;

          return (
            <div
              key={key}
              className={cn(
                'border rounded-xl overflow-hidden transition-all',
                daySchedule.enabled
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-muted/50'
              )}
            >
              {/* Day Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => setExpandedDay(isExpanded ? null : key)}
              >
                <div className="flex items-center gap-4">
                  {/* Enable Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDayEnabled(key as keyof WeeklySchedule);
                    }}
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors relative',
                      daySchedule.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow',
                        daySchedule.enabled ? 'left-5' : 'left-1'
                      )}
                    />
                  </button>

                  <span className="font-medium text-foreground">{label}</span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Time Summary */}
                  {daySchedule.enabled && daySchedule.timeRanges.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {daySchedule.timeRanges
                        .map((r) => `${r.start} - ${r.end}`)
                        .join(', ')}
                    </span>
                  )}

                  {!daySchedule.enabled && (
                    <span className="text-sm text-muted-foreground/60">Closed</span>
                  )}

                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && daySchedule.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-4 space-y-4">
                      {/* Time Ranges */}
                      {daySchedule.timeRanges.map((range, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={range.start}
                              onChange={(e) =>
                                updateTimeRange(
                                  key as keyof WeeklySchedule,
                                  idx,
                                  'start',
                                  e.target.value
                                )
                              }
                              className="px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-muted-foreground">to</span>
                            <input
                              type="time"
                              value={range.end}
                              onChange={(e) =>
                                updateTimeRange(
                                  key as keyof WeeklySchedule,
                                  idx,
                                  'end',
                                  e.target.value
                                )
                              }
                              className="px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>

                          {daySchedule.timeRanges.length > 1 && (
                            <button
                              onClick={() =>
                                removeTimeRange(key as keyof WeeklySchedule, idx)
                              }
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add Time Range */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => addTimeRange(key as keyof WeeklySchedule)}
                          className="flex items-center gap-1 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add time slot
                        </button>

                        <button
                          onClick={() => copyToOtherDays(key as keyof WeeklySchedule)}
                          className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          Copy to all days
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Blackout Dates Section */}
      <div className="pt-6 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Blackout Dates
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Block specific dates when you're unavailable
            </p>
          </div>
          <button
            onClick={() => setShowBlackoutCalendar(!showBlackoutCalendar)}
            className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors"
          >
            {showBlackoutCalendar ? 'Hide Calendar' : 'Manage Dates'}
          </button>
        </div>

        {/* Blackout Summary */}
        {blackoutDates.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {blackoutDates.slice(0, 10).map((date) => (
              <span
                key={date.id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-full"
              >
                {formatDate(date.date)}
                <button
                  onClick={() => toggleBlackoutDate(date.date)}
                  className="hover:text-red-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {blackoutDates.length > 10 && (
              <span className="text-sm text-muted-foreground">
                +{blackoutDates.length - 10} more
              </span>
            )}
          </div>
        )}

        {/* Blackout Calendar */}
        <AnimatePresence>
          {showBlackoutCalendar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border border-border rounded-xl overflow-hidden"
            >
              <BlackoutCalendar
                month={selectedBlackoutMonth}
                blackoutDates={blackoutDates}
                onDateToggle={toggleBlackoutDate}
                onMonthChange={setSelectedBlackoutMonth}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Blackout Calendar Component
const BlackoutCalendar: React.FC<{
  month: Date;
  blackoutDates: BlackoutDate[];
  onDateToggle: (date: string) => void;
  onMonthChange: (date: Date) => void;
}> = ({ month, blackoutDates, onDateToggle, onMonthChange }) => {
  const blackoutSet = new Set(blackoutDates.map((d) => d.date));

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);

  const prevMonth = () => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  return (
    <div className="p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
        </button>
        <span className="font-semibold text-foreground">
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
        >
          <ChevronDown className="w-5 h-5 -rotate-90" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="aspect-square" />;
          }

          const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isBlackout = blackoutSet.has(dateStr);
          const isPast = new Date(dateStr) < new Date(new Date().toDateString());

          return (
            <button
              key={idx}
              onClick={() => !isPast && onDateToggle(dateStr)}
              disabled={isPast}
              className={cn(
                'aspect-square flex items-center justify-center rounded-lg text-sm transition-colors',
                isPast && 'text-muted-foreground/40 cursor-not-allowed',
                !isPast && !isBlackout && 'hover:bg-muted text-foreground',
                isBlackout && 'bg-red-500 text-white hover:bg-red-600'
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Blocked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted" />
          <span>Available</span>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function incrementTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default ScheduleSection;
