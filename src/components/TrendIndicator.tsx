import { TrendingUp, TrendingDown } from "lucide-react";

interface TrendIndicatorProps {
  value: number;
  period?: string;
}

export const TrendIndicator = ({ value, period = "vs last month" }: TrendIndicatorProps) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  if (isNeutral) {
    return (
      <div className="flex items-center gap-1 text-sm mt-1 text-slate-500">
        <span className="font-medium">—</span>
        <span className="text-xs">{period}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-sm mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span className="font-medium">{isPositive ? '+' : ''}{value}%</span>
      <span className="text-slate-500 text-xs">{period}</span>
    </div>
  );
};
