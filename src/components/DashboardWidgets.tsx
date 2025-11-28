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
  Calendar,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  GripVertical,
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
  isLoading?: boolean;
}

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
    <div ref={setNodeRef} style={style} className={`relative group ${className}`}>
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
  isLoading = false,
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
              <div className="space-y-3">
                {revenueByEvent.slice(0, 5).map((event, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-medium truncate">{event.name}</span>
                    <span className="font-bold text-primary">${event.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueByEvent.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} activeBar={{ fill: CHART_HOVER_COLOR }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        );

      case "revenue_over_time":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Revenue Over Time"
            description="Revenue trend over selected period"
            className={sizeClass}
          >
            <ResponsiveContainer width="100%" height={250}>
              {widgetConfig.chartType === "line" ? (
                <LineChart data={revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                </LineChart>
              ) : widgetConfig.chartType === "area" ? (
                <AreaChart data={revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.2} />
                </AreaChart>
              ) : (
                <BarChart data={revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} activeBar={{ fill: CHART_HOVER_COLOR }} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartCard>
        );

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
                <LineChart data={weeklyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS[0]} strokeWidth={2} />
                </LineChart>
              ) : (
                <BarChart data={weeklyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} activeBar={{ fill: CHART_HOVER_COLOR }} />
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
                <BarChart data={ticketData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
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
                    innerRadius={widgetConfig.chartType === "donut" ? 50 : 0}
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {ticketData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
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
              <LineChart data={ordersOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke={CHART_COLORS[2]} strokeWidth={2} />
              </LineChart>
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
                      <device.icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">{device.name}</span>
                          <span className="text-sm font-medium">{percent.toFixed(0)}%</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">{device.value}</span>
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
                    innerRadius={widgetConfig.chartType === "donut" ? 40 : 0}
                    outerRadius={70}
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
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
              <div className="space-y-3">
                {visitorLocations.slice(0, 6).map((loc, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{loc.country}</span>
                    </div>
                    <Badge variant="secondary">{loc.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={visitorLocations.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="country" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} activeBar={{ fill: "#a78bfa" }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        );

      case "visitors_funnel":
        return (
          <ChartCard
            key={widgetConfig.widgetId}
            title="Conversion Funnel"
            description="Widget visitor conversion rates"
            className={sizeClass}
          >
            <div className="space-y-3">
              {conversionFunnel.map((step, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">{step.step}</span>
                    <span className="text-sm font-medium">{step.count.toLocaleString()}</span>
                  </div>
                  <Progress value={step.rate} className="h-2" />
                </div>
              ))}
            </div>
          </ChartCard>
        );

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
                      <div className="flex justify-between mb-1">
                        <span className="text-sm truncate">{event.name}</span>
                        <span className="text-sm font-medium">{percent.toFixed(0)}%</span>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={eventCapacity.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="sold" fill={CHART_COLORS[0]} name="Sold" radius={[4, 4, 0, 0]} activeBar={{ fill: CHART_HOVER_COLOR }} />
                  <Bar dataKey="capacity" fill={CHART_COLORS[4]} name="Capacity" radius={[4, 4, 0, 0]} opacity={0.3} activeBar={{ fill: "#f87171" }} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 auto-rows-fr">
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
}

const StatCard = ({ title, value, icon, description, className }: StatCardProps) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
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
  <Card className={className}>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);
