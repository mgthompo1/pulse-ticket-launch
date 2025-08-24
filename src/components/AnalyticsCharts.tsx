
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { Receipt } from "lucide-react";


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
      <Card className="border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="font-manrope font-bold text-xl text-gray-900">Monthly Revenue by Event</CardTitle>
          <CardDescription className="font-manrope text-base text-gray-600">Monthly revenue by event (last 30 days)</CardDescription>
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
                  border: "2px solid hsl(var(--primary))",
                  borderRadius: "6px",
                  boxShadow: "0 4px 12px hsl(var(--primary) / 0.15)"
                }}
                formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                labelFormatter={(label) => `Event: ${label}`}
              />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Total Revenue by Event */}
      <Card className="border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="font-manrope font-bold text-xl text-gray-900">Total Revenue by Event</CardTitle>
          <CardDescription className="font-manrope text-base text-gray-600">All-time revenue for each event</CardDescription>
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
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200/60 rounded-lg hover:bg-gray-50/50 transition-colors">
                  <div>
                    <h4 className="font-manrope font-semibold text-base text-gray-900">{event.name}</h4>
                    <p className="font-manrope text-sm text-gray-600 mt-0.5">Total Revenue</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-primary">
                      ${(event.value / 1000).toFixed(1)}k
                    </div>
                    <div className="font-manrope text-sm text-gray-600">
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
      <Card className="border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="font-manrope font-bold text-xl text-gray-900">Weekly Revenue by Event</CardTitle>
          <CardDescription className="font-manrope text-base text-gray-600">Revenue by event for the last 7 days</CardDescription>
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
                  border: "2px solid hsl(var(--primary))",
                  borderRadius: "6px",
                  boxShadow: "0 4px 12px hsl(var(--primary) / 0.15)"
                }}
                formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                labelFormatter={(label) => `Event: ${label}`}
              />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>


    </div>
  );
};