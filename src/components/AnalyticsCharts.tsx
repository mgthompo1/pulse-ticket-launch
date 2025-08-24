
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { Receipt } from "lucide-react";

// Custom label component for pie chart
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
  if (percent < 0.05) return null; // Don't show labels for small segments
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  return (
    <text 
      x={x} 
      y={y} 
      fill="#1a1a1a" 
      textAnchor="middle" 
      dominantBaseline="central"
      fontSize="12"
      fontWeight="600"
    >
      {`$${(value / 1000).toFixed(1)}k`}
    </text>
  );
};

interface AnalyticsChartsProps {
  className?: string;
  salesData: Array<{ month: string; sales: number; tickets: number }>;
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
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue by Event</CardTitle>
          <CardDescription>Monthly revenue by event (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
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
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "2px solid #ff4d00",
                  borderRadius: "6px",
                  boxShadow: "0 4px 12px rgba(255, 77, 0, 0.15)"
                }}
                formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                labelFormatter={(label) => `Event: ${label}`}
              />
              <Bar 
                dataKey="revenue" 
                fill="#ff4d00"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Total Revenue by Event */}
      <Card>
        <CardHeader>
          <CardTitle>Total Revenue by Event</CardTitle>
          <CardDescription>All-time revenue for each event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {eventTypeData.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No revenue data available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Revenue will appear here once you start selling tickets
                </p>
              </div>
            ) : (
              eventTypeData.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <h4 className="font-medium text-sm">{event.name}</h4>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-[#ff4d00]">
                      ${(event.value / 1000).toFixed(1)}k
                    </div>
                    <div className="text-xs text-muted-foreground">
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
      <Card>
        <CardHeader>
          <CardTitle>Weekly Revenue by Event</CardTitle>
          <CardDescription>Revenue by event for the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
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
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "2px solid #ff4d00",
                  borderRadius: "6px",
                  boxShadow: "0 4px 12px rgba(255, 77, 0, 0.15)"
                }}
                formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                labelFormatter={(label) => `Event: ${label}`}
              />
              <Bar 
                dataKey="revenue" 
                fill="#ff4d00"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>


    </div>
  );
};