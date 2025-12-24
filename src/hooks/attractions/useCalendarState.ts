import { useState, useCallback, useMemo } from 'react';

interface UseCalendarStateOptions {
  initialDate?: string;
  onDateChange?: (date: string) => void;
}

interface UseCalendarStateReturn {
  selectedDate: string;
  currentMonth: Date;
  calendarDays: Date[];
  showCalendar: boolean;
  setShowCalendar: (show: boolean) => void;
  selectDate: (date: Date) => void;
  changeMonth: (direction: number) => void;
  changeDate: (days: number) => void;
  quickDateSelect: (type: 'today' | 'tomorrow' | 'weekend') => void;
  isToday: (date: Date) => boolean;
  isSelected: (date: Date) => boolean;
  isPast: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
  formatSelectedDate: () => string;
  formatSelectedWeekday: () => string;
}

export function useCalendarState({
  initialDate,
  onDateChange
}: UseCalendarStateOptions = {}): UseCalendarStateReturn {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  // Generate calendar days for the current month view
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);

    while (current <= lastDay || days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
      if (days.length >= 42) break;
    }

    return days;
  }, [currentMonth]);

  const isToday = useCallback((date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  const isSelected = useCallback((date: Date): boolean => {
    return date.toISOString().split('T')[0] === selectedDate;
  }, [selectedDate]);

  const isPast = useCallback((date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }, []);

  const isCurrentMonth = useCallback((date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth() &&
           date.getFullYear() === currentMonth.getFullYear();
  }, [currentMonth]);

  const selectDate = useCallback((date: Date) => {
    if (isPast(date)) return;

    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setShowCalendar(false);
    onDateChange?.(dateStr);
  }, [isPast, onDateChange]);

  const changeMonth = useCallback((direction: number) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  }, []);

  const changeDate = useCallback((days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);

    // Don't allow going to past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (currentDate < today) return;

    const dateStr = currentDate.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    onDateChange?.(dateStr);
  }, [selectedDate, onDateChange]);

  const quickDateSelect = useCallback((type: 'today' | 'tomorrow' | 'weekend') => {
    const today = new Date();
    const targetDate = new Date(today);

    switch (type) {
      case 'today':
        // Already today
        break;
      case 'tomorrow':
        targetDate.setDate(today.getDate() + 1);
        break;
      case 'weekend': {
        const daysUntilSaturday = 6 - today.getDay();
        targetDate.setDate(today.getDate() + (daysUntilSaturday <= 0 ? 7 + daysUntilSaturday : daysUntilSaturday));
        break;
      }
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setShowCalendar(false);
    onDateChange?.(dateStr);
  }, [onDateChange]);

  const formatSelectedDate = useCallback((): string => {
    return new Date(selectedDate).toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [selectedDate]);

  const formatSelectedWeekday = useCallback((): string => {
    return new Date(selectedDate).toLocaleDateString('en-US', {
      weekday: 'long'
    });
  }, [selectedDate]);

  return {
    selectedDate,
    currentMonth,
    calendarDays,
    showCalendar,
    setShowCalendar,
    selectDate,
    changeMonth,
    changeDate,
    quickDateSelect,
    isToday,
    isSelected,
    isPast,
    isCurrentMonth,
    formatSelectedDate,
    formatSelectedWeekday
  };
}
