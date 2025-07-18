import React from "react";
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

const salesData = [
  { month: "Jan", sales: 4000, tickets: 240 },
  { month: "Feb", sales: 3000, tickets: 180 },
  { month: "Mar", sales: 5000, tickets: 300 },
  { month: "Apr", sales: 4500, tickets: 270 },
  { month: "May", sales: 6000, tickets: 360 },
  { month: "Jun", sales: 5500, tickets: 330 },
];

const eventTypeData = [
  { name: "Concerts", value: 45, color: "hsl(var(--primary))" },
  { name: "Conferences", value: 30, color: "hsl(var(--secondary))" },
  { name: "Workshops", value: 15, color: "hsl(var(--accent))" },
  { name: "Other", value: 10, color: "hsl(var(--muted))" },
];

const revenueData = [
  { day: "Mon", revenue: 2400 },
  { day: "Tue", revenue: 1398 },
  { day: "Wed", revenue: 9800 },
  { day: "Thu", revenue: 3908 },
  { day: "Fri", revenue: 4800 },
  { day: "Sat", revenue: 3800 },
  { day: "Sun", revenue: 4300 },
];

interface AnalyticsChartsProps {
  className?: string;
}

export const AnalyticsCharts = ({ className }: AnalyticsChartsProps) => {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Sales Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
          <CardDescription>Monthly sales and ticket sales over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stackId="1"
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.1)"
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="tickets" 
                stackId="2"
                stroke="hsl(var(--secondary))" 
                fill="hsl(var(--secondary) / 0.1)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Event Types Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Event Types</CardTitle>
          <CardDescription>Distribution of events by category</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={eventTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {eventTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Revenue</CardTitle>
          <CardDescription>Daily revenue for the current week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
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

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
          <CardDescription>Ticket sales performance over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Line 
                type="monotone" 
                dataKey="tickets" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};