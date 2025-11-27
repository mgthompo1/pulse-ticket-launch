
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from "recharts";
import { Receipt, TrendingUp } from "lucide-react";

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border-2 border-blue-500 shadow-lg">
        <p className="font-manrope font-semibold text-sm text-slate-900 dark:text-white mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <p className="font-manrope text-sm text-slate-700 dark:text-zinc-300">
            Revenue: <span className="font-bold text-blue-600 dark:text-blue-400">${Number(payload[0].value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};


interface AnalyticsChartsProps {
  className?: string;
  salesData: Array<{ month: string; revenue: number }>;
  eventTypeData: Array<{ name: string; value: number; color: string }>;
  revenueData: Array<{ day: string; revenue: number }>;
  isLoading?: boolean;
}

export const AnalyticsCharts = ({ className, salesData, eventTypeData, revenueData, isLoading = false }: AnalyticsChartsProps) => {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Monthly Revenue by Event Chart */}
      <Card className="border-slate-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="font-manrope font-bold text-xl text-slate-900 dark:text-white">Monthly Revenue by Event</CardTitle>
          <CardDescription className="font-manrope text-base text-slate-600 dark:text-zinc-400">Monthly revenue by event (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--brand-accent)"
                  radius={[8, 8, 4, 4]}
                  animationDuration={1000}
                  animationBegin={0}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Total Revenue by Event */}
      <Card className="border-slate-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="font-manrope font-bold text-xl text-slate-900 dark:text-white">Total Revenue by Event</CardTitle>
          <CardDescription className="font-manrope text-base text-slate-600 dark:text-zinc-400">All-time revenue for each event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {eventTypeData.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-manrope text-muted-foreground">No revenue data available</p>
                <p className="font-manrope text-sm text-muted-foreground mt-1">
                  Revenue will appear here once you start selling tickets
                </p>
              </div>
            ) : (
              eventTypeData.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200/60 dark:border-zinc-700 rounded-lg hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div>
                    <h4 className="font-manrope font-semibold text-base text-gray-900 dark:text-white">{event.name}</h4>
                    <p className="font-manrope text-sm text-gray-600 dark:text-zinc-400 mt-0.5">Total Revenue</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg" style={{ color: '#ff4d00' }}>
                      ${(event.value / 1000).toFixed(1)}k
                    </div>
                    <div className="font-manrope text-sm text-gray-600 dark:text-zinc-400">
                      ${event.value.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Revenue by Event */}
      <Card className="border-slate-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="font-manrope font-bold text-xl text-slate-900 dark:text-white">Weekly Revenue by Event</CardTitle>
          <CardDescription className="font-manrope text-base text-slate-600 dark:text-zinc-400">Revenue by event for the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--brand-accent)"
                  radius={[8, 8, 4, 4]}
                  animationDuration={1000}
                  animationBegin={0}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>


    </div>
  );
};