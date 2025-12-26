// Attraction Dashboard Widget Types and Registry

export type ChartType = "bar" | "line" | "area" | "pie" | "donut" | "stat" | "list" | "progress";

export type WidgetSize = "small" | "medium" | "large" | "full";

export interface AttractionWidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: "revenue" | "bookings" | "capacity" | "performance";
  supportedChartTypes: ChartType[];
  defaultChartType: ChartType;
  defaultSize: WidgetSize;
  defaultEnabled: boolean;
}

export interface AttractionWidgetConfig {
  widgetId: string;
  enabled: boolean;
  chartType: ChartType;
  size: WidgetSize;
  position: number;
}

export interface AttractionDashboardConfig {
  widgets: AttractionWidgetConfig[];
  layout: "grid" | "list";
  updatedAt: string;
}

// Available attraction widgets registry
export const ATTRACTION_WIDGET_REGISTRY: AttractionWidgetDefinition[] = [
  // Revenue widgets
  {
    id: "revenue_total",
    name: "Total Revenue",
    description: "Overall revenue from all bookings",
    category: "revenue",
    supportedChartTypes: ["stat"],
    defaultChartType: "stat",
    defaultSize: "small",
    defaultEnabled: false,
  },
  {
    id: "revenue_by_attraction",
    name: "Revenue by Attraction",
    description: "Revenue breakdown by attraction",
    category: "revenue",
    supportedChartTypes: ["bar", "list"],
    defaultChartType: "bar",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "revenue_over_time",
    name: "Revenue Over Time",
    description: "Revenue trend over selected period",
    category: "revenue",
    supportedChartTypes: ["line", "bar", "area"],
    defaultChartType: "area",
    defaultSize: "large",
    defaultEnabled: true,
  },
  {
    id: "revenue_weekly",
    name: "Weekly Revenue",
    description: "Revenue for the past 7 days",
    category: "revenue",
    supportedChartTypes: ["bar", "line", "area"],
    defaultChartType: "bar",
    defaultSize: "medium",
    defaultEnabled: true,
  },

  // Bookings widgets
  {
    id: "bookings_total",
    name: "Total Bookings",
    description: "Total bookings count",
    category: "bookings",
    supportedChartTypes: ["stat"],
    defaultChartType: "stat",
    defaultSize: "small",
    defaultEnabled: false,
  },
  {
    id: "bookings_over_time",
    name: "Bookings Over Time",
    description: "Booking trends over time",
    category: "bookings",
    supportedChartTypes: ["line", "bar", "area"],
    defaultChartType: "line",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "bookings_by_attraction",
    name: "Bookings by Attraction",
    description: "Breakdown of bookings per attraction",
    category: "bookings",
    supportedChartTypes: ["bar", "pie", "list"],
    defaultChartType: "bar",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "party_size_distribution",
    name: "Party Size Distribution",
    description: "Distribution of party sizes",
    category: "bookings",
    supportedChartTypes: ["bar", "pie"],
    defaultChartType: "pie",
    defaultSize: "medium",
    defaultEnabled: true,
  },

  // Capacity widgets
  {
    id: "capacity_utilization",
    name: "Capacity Utilization",
    description: "How well capacity is being used",
    category: "capacity",
    supportedChartTypes: ["progress", "bar"],
    defaultChartType: "progress",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "popular_time_slots",
    name: "Popular Time Slots",
    description: "Most booked time slots",
    category: "capacity",
    supportedChartTypes: ["bar", "list"],
    defaultChartType: "bar",
    defaultSize: "medium",
    defaultEnabled: true,
  },

  // Performance widgets
  {
    id: "checkin_rate",
    name: "Check-in Rate",
    description: "Percentage of guests checked in",
    category: "performance",
    supportedChartTypes: ["stat", "progress"],
    defaultChartType: "progress",
    defaultSize: "small",
    defaultEnabled: true,
  },
  {
    id: "avg_booking_value",
    name: "Average Booking Value",
    description: "Average revenue per booking",
    category: "performance",
    supportedChartTypes: ["stat"],
    defaultChartType: "stat",
    defaultSize: "small",
    defaultEnabled: true,
  },
];

// Default widget configuration
export const DEFAULT_ATTRACTION_WIDGETS: AttractionWidgetConfig[] = ATTRACTION_WIDGET_REGISTRY
  .filter(w => w.defaultEnabled)
  .map((widget, index) => ({
    widgetId: widget.id,
    enabled: true,
    chartType: widget.defaultChartType,
    size: widget.defaultSize,
    position: index,
  }));

// Get widget definition by ID
export function getAttractionWidgetDefinition(id: string): AttractionWidgetDefinition | undefined {
  return ATTRACTION_WIDGET_REGISTRY.find(w => w.id === id);
}
