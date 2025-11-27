import { cn } from "@/lib/utils";

export type TimeRange = '7d' | '30d' | '90d' | 'ytd' | 'all';

interface TimeRangeOption {
  label: string;
  value: TimeRange;
  days?: number;
}

const TIME_RANGES: TimeRangeOption[] = [
  { label: '7D', value: '7d', days: 7 },
  { label: '30D', value: '30d', days: 30 },
  { label: '90D', value: '90d', days: 90 },
  { label: 'YTD', value: 'ytd' },
  { label: 'All', value: 'all' }
];

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export const TimeRangeFilter = ({ value, onChange }: TimeRangeFilterProps) => {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-zinc-800 rounded-lg">
      {TIME_RANGES.map(range => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            value === range.value
              ? "bg-white dark:bg-zinc-700 shadow-sm text-slate-900 dark:text-white"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};
