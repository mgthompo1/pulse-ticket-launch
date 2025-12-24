import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Theme } from '@/types/theme';

interface DateSelectorProps {
  selectedDate: string;
  currentMonth: Date;
  calendarDays: Date[];
  showCalendar: boolean;
  theme: Theme;
  onShowCalendarChange: (show: boolean) => void;
  onDateSelect: (date: Date) => void;
  onChangeMonth: (direction: number) => void;
  onChangeDate: (days: number) => void;
  onQuickSelect: (type: 'tomorrow' | 'weekend') => void;
  isToday: (date: Date) => boolean;
  isSelected: (date: Date) => boolean;
  isPast: (date: Date) => boolean;
  formatSelectedDate: () => string;
  formatSelectedWeekday: () => string;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  currentMonth,
  calendarDays,
  showCalendar,
  theme,
  onShowCalendarChange,
  onDateSelect,
  onChangeMonth,
  onChangeDate,
  onQuickSelect,
  isToday,
  isSelected,
  isPast,
  formatSelectedDate,
  formatSelectedWeekday
}) => {
  const calendarRef = useRef<HTMLDivElement>(null);
  const { primaryColor, headerTextColor, bodyTextColor } = theme;

  // Handle click outside calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onShowCalendarChange(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar, onShowCalendarChange]);

  const canGoBack = new Date(selectedDate) > new Date();

  return (
    <div className="space-y-3">
      {/* Enhanced Date Picker with Calendar Popup */}
      <div className="relative">
        <div
          className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer bg-white"
          onClick={() => onShowCalendarChange(!showCalendar)}
        >
          {/* Calendar Icon */}
          <div className="flex-shrink-0">
            <Calendar className="h-6 w-6" style={{ color: primaryColor }} />
          </div>

          {/* Date Display */}
          <div className="flex-1">
            <div className="text-lg font-medium" style={{ color: headerTextColor }}>
              {formatSelectedDate()}
            </div>
            <div className="text-sm" style={{ color: bodyTextColor }}>
              {formatSelectedWeekday()}
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onChangeDate(-1);
              }}
              disabled={!canGoBack}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              style={{ color: headerTextColor }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onChangeDate(1);
              }}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              style={{ color: headerTextColor }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Popup */}
        {showCalendar && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => onShowCalendarChange(false)}
            />

            {/* Calendar */}
            <div
              ref={calendarRef}
              className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-4 min-w-[320px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChangeMonth(-1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold" style={{ color: headerTextColor }}>
                  {currentMonth.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChangeMonth(1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium p-2"
                    style={{ color: bodyTextColor }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => (
                  <button
                    key={index}
                    onClick={() => onDateSelect(date)}
                    disabled={isPast(date)}
                    className={`
                      h-10 w-10 rounded-lg text-sm font-medium transition-colors
                      ${isSelected(date) ? 'text-white' : ''}
                      ${isPast(date) ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                      ${!isToday(date) && !isSelected(date) && !isPast(date) ? 'text-gray-700' : ''}
                    `}
                    style={{
                      backgroundColor: isSelected(date)
                        ? '#6B7280'
                        : isToday(date)
                        ? primaryColor + '20'
                        : undefined,
                      color: isToday(date) && !isSelected(date) ? primaryColor : undefined
                    }}
                  >
                    {date.getDate()}
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickSelect('tomorrow')}
                  className="flex-1 text-xs"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Tomorrow
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickSelect('weekend')}
                  className="flex-1 text-xs"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  This Weekend
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Hidden Date Input for Accessibility */}
        <Input
          type="date"
          value={selectedDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => onDateSelect(new Date(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>

      {/* Quick Date Navigation */}
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: bodyTextColor }}>
          {!canGoBack ? 'Today' : 'Available dates'}
        </span>
        <div className="flex items-center gap-2">
          <span style={{ color: bodyTextColor }}>Quick jump:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickSelect('tomorrow')}
            className="h-6 px-2 text-xs hover:bg-gray-100"
            style={{ color: primaryColor }}
          >
            Tomorrow
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickSelect('weekend')}
            className="h-6 px-2 text-xs hover:bg-gray-100"
            style={{ color: primaryColor }}
          >
            This Weekend
          </Button>
        </div>
      </div>
    </div>
  );
};
