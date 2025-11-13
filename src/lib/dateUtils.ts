import { TimeRange } from '@/components/TimeRangeFilter';

// Helper function to calculate date range
export const calculateDateRange = (range: TimeRange): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'ytd':
      startDate.setMonth(0, 1); // January 1st of current year
      break;
    case 'all':
      startDate.setFullYear(2000, 0, 1); // Far back enough for "all time"
      break;
  }

  return { startDate, endDate };
};

// Helper to calculate previous period for trend comparison
export const calculatePreviousPeriod = (range: TimeRange): { startDate: Date; endDate: Date } => {
  const current = calculateDateRange(range);
  const duration = current.endDate.getTime() - current.startDate.getTime();

  const endDate = new Date(current.startDate.getTime() - 1); // 1ms before current period starts
  const startDate = new Date(endDate.getTime() - duration);

  return { startDate, endDate };
};

const dateOptionKeys = new Set([
  "weekday",
  "era",
  "year",
  "month",
  "day",
  "dateStyle",
  "calendar"
]);

const timeOptionKeys = new Set([
  "hour",
  "minute",
  "second",
  "hour12",
  "timeZone",
  "timeZoneName",
  "timeStyle"
]);

const extractDateOptions = (options: Intl.DateTimeFormatOptions) => {
  const result: Intl.DateTimeFormatOptions = {};
  for (const key of Object.keys(options) as (keyof Intl.DateTimeFormatOptions)[]) {
    if (dateOptionKeys.has(key)) {
      result[key] = options[key];
    }
  }
  return result;
};

const extractTimeOptions = (options: Intl.DateTimeFormatOptions) => {
  const result: Intl.DateTimeFormatOptions = {};
  for (const key of Object.keys(options) as (keyof Intl.DateTimeFormatOptions)[]) {
    if (timeOptionKeys.has(key)) {
      result[key] = options[key];
    }
  }
  return result;
};

const hasTimeOptions = (options: Intl.DateTimeFormatOptions) => {
  return Boolean(
    options.timeStyle !== undefined ||
    options.hour !== undefined ||
    options.minute !== undefined ||
    options.second !== undefined
  );
};

export const formatEventDateRange = (
  start: string | null | undefined,
  end?: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale?: string
): string => {
  if (!start) return '';

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return '';
  }

  const endDate = end ? new Date(end) : null;
  const hasValidEnd = endDate && !Number.isNaN(endDate.getTime());
  const resolvedLocale = locale ?? undefined;
  const formatter = new Intl.DateTimeFormat(resolvedLocale, options);

  if (!hasValidEnd) {
    return formatter.format(startDate);
  }

  const sameDay = startDate.toDateString() === endDate!.toDateString();
  const includesTime = hasTimeOptions(options);

  if (sameDay && !includesTime) {
    // No time information – single day range, return single formatted date
    return formatter.format(startDate);
  }

  if (sameDay && includesTime) {
    const dateOptions = extractDateOptions(options);
    if (!dateOptions.dateStyle && Object.keys(dateOptions).length === 0) {
      dateOptions.dateStyle = 'medium';
    }

    const timeOptions = extractTimeOptions(options);
    if (Object.keys(timeOptions).length === 0) {
      timeOptions.timeStyle = 'short';
    }

    const dateFormatter = new Intl.DateTimeFormat(resolvedLocale, dateOptions);
    const timeFormatter = new Intl.DateTimeFormat(resolvedLocale, timeOptions);

    return `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate!)}`;
  }

  return `${formatter.format(startDate)} – ${formatter.format(endDate!)}`;
};
