import { LineChart, Line, ResponsiveContainer } from "recharts";

interface MiniSparklineProps {
  data: Array<{ value: number }>;
  color?: string;
}

export const MiniSparkline = ({ data, color = "#3b82f6" }: MiniSparklineProps) => {
  // If no data or empty array, show placeholder
  if (!data || data.length === 0) {
    return (
      <div className="w-20 h-8 bg-slate-100 rounded animate-pulse" />
    );
  }

  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
