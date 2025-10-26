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
