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
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  GripVertical,
  Target,
  Activity,
  CheckCircle,
} from "lucide-react";
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
import {
  AttractionWidgetConfig,
  getAttractionWidgetDefinition,
} from "@/types/attraction-dashboard-widgets";

// Color palette for charts
const CHART_COLORS = [
  "#ff4d00",  // primary brand orange
  "#3b82f6",  // blue
  "#10b981",  // green
  "#8b5cf6",  // purple
  "#ef4444",  // red
  "#06b6d4",  // cyan
];

// Custom tooltip
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[120px]">
        <p className="font-manrope text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="font-manrope text-sm font-semibold text-foreground tabular-nums">
            {formatter ? formatter(entry.value, entry.name)[0] : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Axis styling
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

// Trend indicator
const TrendIndicator = ({ value, period = "vs last period" }: { value: number; period?: string }) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <div className={`flex items-center gap-1 text-sm mt-1 font-manrope ${isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {isNeutral ? null : isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span className="font-medium tabular-nums">{isNeutral ? '0' : Math.abs(value).toFixed(1)}%</span>
      <span className="text-muted-foreground text-xs">{period}</span>
    </div>
  );
};

// Sortable widget wrapper
const SortableWidget = ({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) => {
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

interface AttractionsDashboardWidgetsProps {
  enabledWidgets: AttractionWidgetConfig[];
  onReorder?: (fromIndex: number, toIndex: number) => void;
  // Data props
  totalRevenue: number;
  totalBookings: number;
  totalGuests: number;
  avgBookingValue: number;
  checkinRate: number;
  revenueByAttraction: Array<{ name: string; revenue: number }>;
  revenueOverTime: Array<{ date: string; revenue: number }>;
  weeklyRevenue: Array<{ day: string; revenue: number }>;
  bookingsOverTime: Array<{ date: string; bookings: number }>;
  bookingsByAttraction: Array<{ name: string; bookings: number }>;
  partySizeDistribution: Array<{ size: string; count: number }>;
  capacityUtilization: Array<{ name: string; used: number; capacity: number }>;
  popularTimeSlots: Array<{ time: string; bookings: number }>;
  isLoading?: boolean;
  timeRange?: string;
  revenueTrend?: number;
  bookingsTrend?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const AttractionsDashboardWidgets = ({
  enabledWidgets,
  onReorder,
  totalRevenue,
  totalBookings,
  totalGuests,
  avgBookingValue,
  checkinRate,
  revenueByAttraction,
  revenueOverTime,
  weeklyRevenue,
  bookingsOverTime,
  bookingsByAttraction,
  partySizeDistribution,
  capacityUtilization,
  popularTimeSlots,
  isLoading = false,
  timeRange,
  revenueTrend = 0,
  bookingsTrend = 0,
}: AttractionsDashboardWidgetsProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorder) {
      const oldIndex = enabledWidgets.findIndex(w => w.widgetId === active.id);
      const newIndex = enabledWidgets.findIndex(w => w.widgetId === over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  // Render individual widget content
  const renderWidget = (config: AttractionWidgetConfig) => {
    const definition = getAttractionWidgetDefinition(config.widgetId);
    if (!definition) return null;

    switch (config.widgetId) {
      case "revenue_by_attraction":
        return (
          <Card className="h-full border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-manrope text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-500" />
                Revenue by Attraction
              </CardTitle>
              <CardDescription className="font-manrope text-xs">Top performing attractions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueByAttraction.slice(0, 5)} layout="vertical">
                  <CartesianGrid {...gridStyle} horizontal={true} vertical={false} />
                  <XAxis type="number" {...axisStyle} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" {...axisStyle} width={100} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />} />
                  <Bar dataKey="revenue" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case "revenue_over_time":
        return (
          <Card className="h-full border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-manrope text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Revenue Over Time
              </CardTitle>
              <CardDescription className="font-manrope text-xs">Revenue trend for selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={revenueOverTime}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="date" {...axisStyle} />
                  <YAxis {...axisStyle} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS[0]} fill="url(#revenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case "revenue_weekly":
        return (
          <Card className="h-full border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-manrope text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                Weekly Revenue
              </CardTitle>
              <CardDescription className="font-manrope text-xs">Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyRevenue}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="day" {...axisStyle} />
                  <YAxis {...axisStyle} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />} />
                  <Bar dataKey="revenue" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case "bookings_over_time":
        return (
          <Card className="h-full border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-manrope text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                Bookings Over Time
              </CardTitle>
              <CardDescription className="font-manrope text-xs">Booking trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={bookingsOverTime}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="date" {...axisStyle} />
                  <YAxis {...axisStyle} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => [v, 'Bookings']} />} />
                  <Line type="monotone" dataKey="bookings" stroke={CHART_COLORS[3]} strokeWidth={2} dot={{ fill: CHART_COLORS[3], strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case "bookings_by_attraction":
        return (
          <Card className="h-full border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-manrope text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                Bookings by Attraction
              </CardTitle>
              <CardDescription className="font-manrope text-xs">Distribution across attractions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={bookingsByAttraction.slice(0, 5)}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="name" {...axisStyle} angle={-45} textAnchor="end" height={80} />
                  <YAxis {...axisStyle} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => [v, 'Bookings']} />} />
                  <Bar dataKey="bookings" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case "party_size_distribution":
        return (
          <Card className="h-full border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-manrope text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-500" />
                Party Size Distribution
              </CardTitle>
              <CardDescription className="font-manrope text-xs">Group sizes breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={partySizeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="size"
                    label={({ size, percent }) => `${size}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {partySizeDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case "capacity_utilization":
        return (
          <Card className="h-full border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-manrope text-base font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                Capacity Utilization
              </CardTitle>
              <CardDescription className="font-manrope text-xs">How well capacity is used</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {capacityUtilization.slice(0, 4).map((item, index) => {
                const utilization = item.capacity > 0 ? (item.used / item.capacity) * 100 : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm font-manrope">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="text-muted-foreground tabular-nums">{item.used}/{item.capacity}</span>
                    </div>
                    <Progress value={utilization} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );

      case "popular_time_slots":
        return (
          <Card className="h-full border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-manrope text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-500" />
                Popular Time Slots
              </CardTitle>
              <CardDescription className="font-manrope text-xs">Most booked times</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={popularTimeSlots.slice(0, 8)}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="time" {...axisStyle} />
                  <YAxis {...axisStyle} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => [v, 'Bookings']} />} />
                  <Bar dataKey="bookings" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case "checkin_rate":
        return (
          <Card className="h-full border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-manrope text-base font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Check-in Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="font-manrope text-4xl font-bold text-emerald-600 tabular-nums">{checkinRate.toFixed(0)}%</div>
                <p className="font-manrope text-sm text-muted-foreground mt-2">Guests checked in</p>
                <Progress value={checkinRate} className="h-3 mt-4" />
              </div>
            </CardContent>
          </Card>
        );

      case "avg_booking_value":
        return (
          <Card className="h-full border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-manrope text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Avg Booking Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="font-manrope text-4xl font-bold text-green-600 tabular-nums">{formatCurrency(avgBookingValue)}</div>
                <p className="font-manrope text-sm text-muted-foreground mt-2">Per booking</p>
                <TrendIndicator value={revenueTrend} />
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="h-[320px]">
            <CardHeader>
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-[200px] bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const sortedWidgets = [...enabledWidgets].sort((a, b) => a.position - b.position);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedWidgets.map(w => w.widgetId)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedWidgets.filter(w => w.enabled).map((config) => (
            <SortableWidget key={config.widgetId} id={config.widgetId}>
              {renderWidget(config)}
            </SortableWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default AttractionsDashboardWidgets;
