import React from "react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: string | Date | null;
  onChange: (date: string) => void;
  label?: string;
  id?: string;
  className?: string;
  showTimeZone?: boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  label,
  id,
  className,
  showTimeZone = true,
  placeholder = "Select date and time",
  minDate,
  maxDate,
}) => {
  // Get user's timezone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Convert value to Date object
  const getDateValue = (): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(value);
  };

  const dateValue = getDateValue();

  // Handle date change
  const handleChange = (date: Date | null) => {
    if (!date) {
      onChange("");
      return;
    }

    // Convert to ISO string (will be stored as UTC in database)
    const isoString = date.toISOString();
    onChange(isoString);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="flex items-center gap-2">
          {label}
          {showTimeZone && (
            <span className="text-xs text-muted-foreground font-normal">
              ({userTimeZone})
            </span>
          )}
        </Label>
      )}
      <div className="relative">
        <DatePicker
          id={id}
          selected={dateValue}
          onChange={handleChange}
          showTimeSelect
          timeFormat="h:mm aa"
          timeIntervals={15}
          dateFormat="MMMM d, yyyy h:mm aa"
          placeholderText={placeholder}
          minDate={minDate}
          maxDate={maxDate}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "font-manrope"
          )}
          wrapperClassName="w-full"
          calendarClassName="font-manrope"
        />
      </div>
      {showTimeZone && dateValue && (
        <p className="text-xs text-muted-foreground">
          UTC: {format(dateValue, "MMM d, yyyy h:mm aa")} (
          {formatInTimeZone(dateValue, "UTC", "zzz")})
        </p>
      )}
    </div>
  );
};
