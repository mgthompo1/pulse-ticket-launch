import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  DollarSign,
  Ticket,
  ShoppingCart,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  GripVertical,
  UsersRound,
  FileText,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  WidgetConfig,
  getWidgetDefinition,
} from "@/types/dashboard-widgets";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Color palette for charts - primary orange matches brand accent (#ff4d00)
const CHART_COLORS = [
  "#ff4d00",            // primary brand orange
  "#3b82f6",            // blue
  "#10b981",            // green
  "#8b5cf6",            // purple
  "#ef4444",            // red
  "#06b6d4",            // cyan
];

// Hover/active state color - lighter shade of brand orange
const CHART_HOVER_COLOR = "#ff6b2c";

// Custom tooltip component for modern look
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[120px]">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-semibold text-foreground">
            {formatter ? formatter(entry.value, entry.name)[0] : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Common chart axis styling
const axisStyle = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
  fontFamily: 'inherit',
};

const gridStyle = {
  stroke: 'hsl(var(--border))',
  strokeDasharray: '3 3',
  strokeOpacity: 0.5,
};

// Trend Indicator Component
interface TrendIndicatorProps {
  value: number;
  period?: string;
}

const TrendIndicator = ({ value, period = "vs last period" }: TrendIndicatorProps) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <div className={`flex items-center gap-1 text-sm mt-1 ${isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {isNeutral ? null : isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span className="font-medium">{isNeutral ? '0' : Math.abs(value).toFixed(1)}%</span>
      <span className="text-muted-foreground text-xs">{period}</span>
    </div>
  );
};

// Mini Sparkline Component
const MiniSparkline = ({ data, color = "#ff4d00" }: { data: Array<{ value: number }>; color?: string }) => (
  <ResponsiveContainer width={80} height={32}>
    <LineChart data={data}>
      <Line
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={2}
        dot={false}
      />
    </LineChart>
  </ResponsiveContainer>
);

interface DashboardWidgetsProps {
  enabledWidgets: WidgetConfig[];
  onReorder?: (fromIndex: number, toIndex: number) => void;
  // Data props
  totalRevenue: number;
  totalTickets: number;
  totalOrders: number;
  avgOrderValue: number;
  avgOrderByEvent: Array<{ name: string; avgValue: number; orderCount: number }>;
  checkinRate: number;
  revenueByEvent: Array<{ name: string; revenue: number }>;
  revenueOverTime: Array<{ date: string; revenue: number }>;
  weeklyRevenue: Array<{ day: string; revenue: number }>;
  ticketsByType: Array<{ name: string; count: number }>;
  ordersOverTime: Array<{ date: string; orders: number }>;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  visitorLocations: Array<{ country: string; count: number }>;
  conversionFunnel: Array<{ step: string; count: number; rate: number }>;
  upcomingEvents: Array<{ id: string; name: string; date: string; ticketsSold: number; capacity: number }>;
  eventCapacity: Array<{ name: string; sold: number; capacity: number }>;
  // Group data props
  groupSalesByGroup: Array<{ name: string; revenue: number; ticketsSold: number; discounts: number }>;
  outstandingInvoices: Array<{ id: string; groupName: string; invoiceNumber: string; amountOwed: number; dueDate: string | null; status: string }>;
  isLoading?: boolean;
  // Time range for dynamic labels
  timeRange?: string;
}

// Helper to get time range label
const getTimeRangeLabel = (timeRange?: string): string => {
  switch (timeRange) {
    case "7d": return "Last 7 days";
    case "30d": return "Last 30 days";
    case "90d": return "Last 90 days";
    case "1y": return "Last 12 months";
    default: return "Selected period";
  }
};

// Sortable widget wrapper component
interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

const SortableWidget = ({ id, children, className }: SortableWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative group h-full ${className || ''}`}>
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 hover:bg-muted"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
};

// Size to grid classes mapping - all same size for consistent grid with no gaps
const SIZE_CLASSES = {
  small: "",
  medium: "",
  large: "",
  full: "",
};

export const DashboardWidgets = ({
  enabledWidgets,
  onReorder,
  totalRevenue,
  totalTickets,
  totalOrders,
  avgOrderValue,
  avgOrderByEvent,
  checkinRate,
  revenueByEvent,
  revenueOverTime,
  weeklyRevenue,
  ticketsByType,
  ordersOverTime,
  deviceBreakdown,
  visitorLocations,
  conversionFunnel,
  upcomingEvents,
  eventCapacity,
  groupSalesByGroup,
  outstandingInvoices,
  isLoading = false,
  timeRange,
}: DashboardWidgetsProps) => {
  // Set up drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = enabledWidgets.findIndex((w) => w.widgetId === active.id);
      const newIndex = enabledWidgets.findIndex((w) => w.widgetId === over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="h-[200px] bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate sparkline data from time series (last 7 points)
  const revenueSparkline = revenueOverTime.slice(-7).map(d => ({ value: d.revenue }));
  const ordersSparkline = ordersOverTime.slice(-7).map(d => ({ value: d.orders }));

  // Calculate trend (compare recent half to earlier half)
  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return 0;
    const mid = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, mid);
    const secondHalf = data.slice(mid);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    if (firstAvg === 0) return secondAvg > 0 ? 100 : 0;
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  };

  const revenueTrend = calculateTrend(revenueOverTime.map(d => d.revenue));
  const ordersTrend = calculateTrend(ordersOverTime.map(d => d.orders));

  const renderWidget = (widgetConfig: WidgetConfig) => {
    const definition = getWidgetDefinition(widgetConfig.widgetId);
    if (!definition) return null;

    const sizeClass = SIZE_CLASSES[widgetConfig.size];

    switch (widgetConfig.widgetId) {
      case "revenue_total":
        return (
          <StatCard
            key={widgetConfig.widgetId}
            title="Total Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            icon={<DollarSign className="h-5 w-5" />}
            className={sizeClass}
            trend={revenueTrend}
            trendPeriod={getTimeRangeLabel(timeRange)}
            sparklineData={revenueSparkline}
          />
        );

      case "tickets_sold":
        return (
          <StatCard
            key={widgetConfig.widgetId}
            title="Tickets Sold"
            value={totalTickets.toLocaleString()}
            icon={<Ticket className="h-5 w-5" />}
            className={sizeClass}
            trend={ordersTrend}
            trendPeriod={getTimeRangeLabel(timeRange)}
            sparklineData={ordersSparkline}
          />
        );

      case "orders_total":
        return (
          <StatCard
            key={widgetConfig.widgetId}
            title="Total Orders"
            value={totalOrders.toLocaleString()}
            icon={<ShoppingCart className="h-5 w-5" />}
            className={sizeClass}
            trend={ordersTrend}
            trendPeriod={getTimeRangeLabel(timeRange)}
            sparklineData={ordersSparkline}
          />
        );

      case "orders_avg_value":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Average Order Value"
            description="Average order value by event"
            className={sizeClass}
          >
            <div className="space-y-3">
              {/* Total Average */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border-2 border-primary/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-semibold text-sm">Total Average</h4>
                    <p className="text-xs text-muted-foreground">Across all events</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl" style={{ color: '#ff4d00' }}>
                    ${avgOrderValue.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Per Event Breakdown */}
              {avgOrderByEvent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No order data available</p>
              ) : (
                avgOrderByEvent.slice(0, 5).map((event, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <h4 className="font-medium text-sm">{event.name}</h4>
                      <p className="text-xs text-muted-foreground">{event.orderCount} orders</p>
                    </div>
                    <div className="font-semibold text-base">
                      ${event.avgValue.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        );

      case "checkin_rate":
        return (
          <Card key={widgetConfig.widgetId} className={sizeClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Check-in Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{checkinRate.toFixed(1)}%</div>
              <Progress value={checkinRate} className="h-2" />
            </CardContent>
          </Card>
        );

      case "revenue_by_event":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Revenue by Event"
            description="Revenue breakdown by event"
            className={sizeClass}
          >
            {widgetConfig.chartType === "list" ? (
              <div className="space-y-2">
                {revenueByEvent.slice(0, 5).map((event, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="font-medium truncate text-sm">{event.name}</span>
                    <span className="font-semibold text-foreground">${event.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueByEvent.slice(0, 6)} margin={{ top: 5, right: 20, left: 0, bottom: 60 }} barCategoryGap="25%">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff4d00" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ff4d00" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={70} interval={0} />
                  <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={axisStyle} axisLine={false} tickLine={false} dx={-10} width={45} />
                  <Tooltip content={<CustomTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                  <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        );

      case "revenue_over_time": {
        // For line/area charts, we need at least 2 points to draw a line
        const showDots = revenueOverTime.length <= 3;

        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Revenue Over Time"
            description={getTimeRangeLabel(timeRange)}
            className={sizeClass}
          >
            {revenueOverTime.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                No revenue data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                {widgetConfig.chartType === "line" ? (
                  <LineChart data={revenueOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={CHART_COLORS[0]} />
                        <stop offset="100%" stopColor={CHART_COLORS[3]} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
                    <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={axisStyle} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip content={<CustomTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="url(#revenueLineGradient)"
                      strokeWidth={3}
                      dot={showDots ? { r: 5, fill: CHART_COLORS[0], stroke: '#fff', strokeWidth: 2 } : false}
                      activeDot={{ r: 6, fill: CHART_COLORS[0], stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                ) : widgetConfig.chartType === "area" ? (
                  <AreaChart data={revenueOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
                    <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={axisStyle} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip content={<CustomTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={CHART_COLORS[0]}
                      strokeWidth={2}
                      fill="url(#revenueAreaGradient)"
                      dot={showDots ? { r: 4, fill: CHART_COLORS[0], stroke: '#fff', strokeWidth: 2 } : false}
                      activeDot={{ r: 6, fill: CHART_COLORS[0], stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={revenueOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff4d00" stopOpacity={1} />
                        <stop offset="100%" stopColor="#ff4d00" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                    <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} dy={10} interval="preserveStartEnd" />
                    <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={axisStyle} axisLine={false} tickLine={false} dx={-10} width={45} />
                    <Tooltip content={<CustomTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                    <Bar dataKey="revenue" fill="url(#revenueBarGradient)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </ChartCard>
        );
      }

      case "revenue_by_event_list":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Total Revenue by Event"
            description="All-time revenue for each event"
            className={sizeClass}
          >
            <div className="space-y-3">
              {revenueByEvent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No revenue data available</p>
              ) : (
                revenueByEvent.slice(0, 6).map((event, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-sm">{event.name}</h4>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg" style={{ color: '#ff4d00' }}>
                        ${event.revenue >= 1000 ? `${(event.revenue / 1000).toFixed(1)}k` : event.revenue.toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${event.revenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        );

      case "revenue_weekly":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Weekly Revenue"
            description="Revenue for the past 7 days"
            className={sizeClass}
          >
            <ResponsiveContainer width="100%" height={250}>
              {widgetConfig.chartType === "line" ? (
                <LineChart data={weeklyRevenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="weeklyLineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={CHART_COLORS[0]} />
                      <stop offset="100%" stopColor={CHART_COLORS[3]} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={axisStyle} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="revenue" stroke="url(#weeklyLineGradient)" strokeWidth={3} dot={{ r: 4, fill: CHART_COLORS[0], stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, fill: CHART_COLORS[0], stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              ) : (
                <BarChart data={weeklyRevenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barCategoryGap="25%">
                  <defs>
                    <linearGradient id="weeklyBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff4d00" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ff4d00" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={axisStyle} axisLine={false} tickLine={false} dx={-10} width={45} />
                  <Tooltip content={<CustomTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                  <Bar dataKey="revenue" fill="url(#weeklyBarGradient)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartCard>
        );

      case "tickets_by_type": {
        const ticketData = ticketsByType.map((t, i) => ({ ...t, fill: CHART_COLORS[i % CHART_COLORS.length] }));
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Tickets by Type"
            description="Breakdown of tickets sold"
            className={sizeClass}
          >
            <ResponsiveContainer width="100%" height={250}>
              {widgetConfig.chartType === "bar" ? (
                <BarChart data={ticketData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }} barCategoryGap="30%">
                  <CartesianGrid horizontal={false} vertical={true} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={axisStyle} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<CustomTooltip formatter={(value: number) => [value.toLocaleString(), "Tickets"]} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {ticketData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={ticketData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={widgetConfig.chartType === "donut" ? 60 : 0}
                    outerRadius={90}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {ticketData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip formatter={(value: number) => [value.toLocaleString(), "Tickets"]} />} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </ChartCard>
        );
      }

      case "orders_over_time":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Orders Over Time"
            description="Order count trend"
            className={sizeClass}
          >
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={ordersOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="ordersAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[2]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS[2]} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip formatter={(value: number) => [value.toLocaleString(), "Orders"]} />} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="orders" stroke={CHART_COLORS[2]} strokeWidth={2} fill="url(#ordersAreaGradient)" activeDot={{ r: 6, fill: CHART_COLORS[2], stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        );

      case "visitors_device": {
        const deviceData = [
          { name: "Desktop", value: deviceBreakdown.desktop, icon: Monitor },
          { name: "Mobile", value: deviceBreakdown.mobile, icon: Smartphone },
          { name: "Tablet", value: deviceBreakdown.tablet, icon: Tablet },
        ].map((d, i) => ({ ...d, fill: CHART_COLORS[i] }));
        const totalDevices = deviceData.reduce((sum, d) => sum + d.value, 0);

        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Device Breakdown"
            description="Visitors by device type"
            className={sizeClass}
          >
            {widgetConfig.chartType === "progress" ? (
              <div className="space-y-4">
                {deviceData.map((device) => {
                  const percent = totalDevices > 0 ? (device.value / totalDevices) * 100 : 0;
                  return (
                    <div key={device.name} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                        <device.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-medium">{device.name}</span>
                          <span className="text-sm font-semibold tabular-nums">{percent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: device.fill }} />
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right tabular-nums">{device.value}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={widgetConfig.chartType === "donut" ? 50 : 0}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip formatter={(value: number) => [value.toLocaleString(), "Visitors"]} />} />
                  <Legend formatter={(value) => <span className="text-sm text-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        );
      }

      case "visitors_location":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Visitor Locations"
            description="Where your visitors are from"
            className={sizeClass}
          >
            {widgetConfig.chartType === "list" ? (
              <div className="space-y-2">
                {visitorLocations.slice(0, 6).map((loc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">{loc.country}</span>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">{loc.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={visitorLocations.slice(0, 6)} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }} barCategoryGap="30%">
                  <defs>
                    <linearGradient id="locationBarGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={CHART_COLORS[3]} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={CHART_COLORS[3]} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} vertical={true} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis dataKey="country" type="category" tick={axisStyle} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip formatter={(value: number) => [value.toLocaleString(), "Visitors"]} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                  <Bar dataKey="count" fill="url(#locationBarGradient)" radius={[0, 6, 6, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        );

      case "visitors_funnel": {
        const views = conversionFunnel.find(f => f.step === "Widget Views")?.count || 0;
        const purchases = conversionFunnel.find(f => f.step === "Purchase Completed")?.count || 0;
        const conversionRate = views > 0 ? (purchases / views) * 100 : 0;

        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Conversion Funnel"
            description="Widget visitor conversion rates"
            className={sizeClass}
          >
            <div className="space-y-4">
              {/* Conversion Rate Summary */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-foreground tabular-nums">{conversionRate.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground">Overall conversion rate</p>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-sm text-muted-foreground">{views.toLocaleString()} views</div>
                  <div className="text-sm font-semibold text-primary">{purchases.toLocaleString()} sales</div>
                </div>
              </div>

              {/* Funnel Steps */}
              <div className="space-y-3">
                {conversionFunnel.map((step, i) => (
                  <div key={i} className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{step.step}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm tabular-nums text-muted-foreground">{step.count.toLocaleString()}</span>
                        <Badge variant="secondary" className="tabular-nums text-xs px-2">
                          {step.rate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(8, step.rate)}%`,
                          background: 'linear-gradient(to right, #ff4d00, #f97316, #ec4899)'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        );
      }

      case "events_upcoming":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Upcoming Events"
            description="Your next events"
            className={sizeClass}
          >
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
              ) : (
                upcomingEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{event.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant={event.ticketsSold >= event.capacity ? "default" : "secondary"}>
                      {event.ticketsSold}/{event.capacity}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        );

      case "events_capacity":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Capacity Utilization"
            description="How full your events are"
            className={sizeClass}
          >
            {widgetConfig.chartType === "progress" ? (
              <div className="space-y-4">
                {eventCapacity.slice(0, 5).map((event, i) => {
                  const percent = event.capacity > 0 ? (event.sold / event.capacity) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm font-medium truncate">{event.name}</span>
                        <span className="text-sm font-semibold tabular-nums">{percent.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: percent >= 90 ? CHART_COLORS[2] : percent >= 50 ? CHART_COLORS[0] : CHART_COLORS[1]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={eventCapacity.slice(0, 5)} margin={{ top: 5, right: 20, left: 0, bottom: 50 }} barCategoryGap="25%">
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={60} interval={0} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} dx={-10} width={40} />
                  <Tooltip content={<CustomTooltip formatter={(value: number) => [value.toLocaleString(), ""]} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                  <Bar dataKey="sold" fill={CHART_COLORS[0]} name="Sold" radius={[2, 2, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="capacity" fill={CHART_COLORS[1]} name="Capacity" radius={[2, 2, 0, 0]} maxBarSize={28} opacity={0.25} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        );

      // Group widgets
      case "groups_sales_by_group":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Sales by Group"
            description="Revenue breakdown by group"
            className={sizeClass}
          >
            {groupSalesByGroup.length === 0 ? (
              <div className="text-center py-8">
                <UsersRound className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No group sales data available</p>
              </div>
            ) : widgetConfig.chartType === "list" ? (
              <div className="space-y-2">
                {groupSalesByGroup.slice(0, 6).map((group, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <h4 className="font-medium text-sm">{group.name}</h4>
                      <p className="text-xs text-muted-foreground">{group.ticketsSold} tickets sold</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        ${group.revenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={groupSalesByGroup.slice(0, 6)} margin={{ top: 5, right: 20, left: 0, bottom: 60 }} barCategoryGap="25%">
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={70} interval={0} />
                  <YAxis tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} tick={axisStyle} axisLine={false} tickLine={false} dx={-10} width={45} />
                  <Tooltip content={<CustomTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                  <Bar dataKey="revenue" fill={CHART_COLORS[0]} radius={[2, 2, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        );

      case "groups_tickets_by_group":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Tickets by Group"
            description="Tickets sold breakdown by group"
            className={sizeClass}
          >
            {groupSalesByGroup.length === 0 ? (
              <div className="text-center py-8">
                <UsersRound className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No group ticket data available</p>
              </div>
            ) : widgetConfig.chartType === "list" ? (
              <div className="space-y-2">
                {groupSalesByGroup.slice(0, 6).map((group, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <h4 className="font-medium text-sm">{group.name}</h4>
                      <p className="text-xs text-muted-foreground">${group.revenue.toLocaleString()} revenue</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        {group.ticketsSold}
                      </div>
                      <div className="text-xs text-muted-foreground">tickets</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={groupSalesByGroup.slice(0, 6)} margin={{ top: 5, right: 20, left: 0, bottom: 60 }} barCategoryGap="25%">
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={70} interval={0} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} dx={-10} width={40} />
                  <Tooltip content={<CustomTooltip formatter={(value: number) => [value.toLocaleString(), "Tickets"]} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                  <Bar dataKey="ticketsSold" fill={CHART_COLORS[1]} radius={[2, 2, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        );

      case "groups_outstanding_invoices":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Outstanding Invoices"
            description="Unpaid group invoices"
            className={sizeClass}
          >
            {outstandingInvoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No outstanding invoices</p>
              </div>
            ) : (
              <div className="space-y-3">
                {outstandingInvoices.slice(0, 6).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {invoice.status === "overdue" ? (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{invoice.groupName}</h4>
                        <p className="text-xs text-muted-foreground font-mono">{invoice.invoiceNumber}</p>
                        {invoice.dueDate && (
                          <p className={`text-xs ${invoice.status === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                            Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-destructive">
                        ${invoice.amountOwed.toLocaleString()}
                      </div>
                      <Badge variant={invoice.status === "overdue" ? "destructive" : "secondary"} className="text-xs">
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        );

      case "groups_discounts_given":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Group Discounts Given"
            description="Total discounts given to groups"
            className={sizeClass}
          >
            {groupSalesByGroup.length === 0 ? (
              <div className="text-center py-8">
                <UsersRound className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No group discount data available</p>
              </div>
            ) : widgetConfig.chartType === "list" ? (
              <div className="space-y-3">
                {/* Total discounts summary */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border-2 border-destructive/20">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-destructive" />
                    <div>
                      <h4 className="font-semibold text-sm">Total Discounts</h4>
                      <p className="text-xs text-muted-foreground">Across all groups</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl text-destructive">
                      ${groupSalesByGroup.reduce((sum, g) => sum + g.discounts, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                {/* Per group breakdown */}
                {groupSalesByGroup.filter(g => g.discounts > 0).slice(0, 5).map((group, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <h4 className="font-medium text-sm">{group.name}</h4>
                      <p className="text-xs text-muted-foreground">{group.ticketsSold} tickets</p>
                    </div>
                    <div className="font-semibold text-base text-destructive">
                      ${group.discounts.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={groupSalesByGroup.filter(g => g.discounts > 0).slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Discounts"]} />
                  <Bar dataKey="discounts" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} activeBar={{ fill: "#f87171" }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        );

      default:
        return null;
    }
  };

  const widgetIds = enabledWidgets.map((w) => w.widgetId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" style={{ gridAutoRows: 'minmax(320px, auto)' }}>
          {enabledWidgets.map((widget) => (
            <SortableWidget key={widget.widgetId} id={widget.widgetId}>
              {renderWidget(widget)}
            </SortableWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

// Helper components
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  className?: string;
  trend?: number;
  trendPeriod?: string;
  sparklineData?: Array<{ value: number }>;
}

const StatCard = ({ title, value, icon, description, className, trend, trendPeriod, sparklineData }: StatCardProps) => (
  <Card className={`group h-full flex flex-col min-h-[320px] bg-card border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 rounded-2xl ${className || ''}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 flex-shrink-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
    </CardHeader>
    <CardContent className="flex-1 flex flex-col justify-center">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{value}</div>
          {trend !== undefined && <TrendIndicator value={trend} period={trendPeriod} />}
          {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <MiniSparkline data={sparklineData} />
        )}
      </div>
    </CardContent>
  </Card>
);

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const ChartCard = ({ title, description, children, className }: ChartCardProps) => (
  <Card className={`group h-full flex flex-col min-h-[320px] bg-card border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 rounded-2xl ${className || ''}`}>
    <CardHeader className="pb-4 flex-shrink-0 border-b border-border/30">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
          {description && <CardDescription className="text-sm mt-1 text-muted-foreground">{description}</CardDescription>}
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-1 flex flex-col pt-4">{children}</CardContent>
  </Card>
);
