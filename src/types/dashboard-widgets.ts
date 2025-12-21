// Dashboard Widget Types and Registry

export type ChartType = "bar" | "line" | "area" | "pie" | "donut" | "stat" | "list" | "progress";

export type WidgetSize = "small" | "medium" | "large" | "full";

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: "revenue" | "tickets" | "orders" | "visitors" | "events" | "groups" | "insights";
  supportedChartTypes: ChartType[];
  defaultChartType: ChartType;
  defaultSize: WidgetSize;
  defaultEnabled: boolean;
}

export interface WidgetConfig {
  widgetId: string;
  enabled: boolean;
  chartType: ChartType;
  size: WidgetSize;
  position: number;
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
  layout: "grid" | "list";
  updatedAt: string;
}

// Available widgets registry
export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // Revenue widgets
  {
    id: "revenue_total",
    name: "Total Revenue",
    description: "Overall revenue from all events",
    category: "revenue",
    supportedChartTypes: ["stat"],
    defaultChartType: "stat",
    defaultSize: "small",
    defaultEnabled: false, // Already shown in overview cards
  },
  {
    id: "revenue_by_event",
    name: "Revenue by Event",
    description: "Revenue breakdown by event",
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
    defaultChartType: "bar",
    defaultSize: "large",
    defaultEnabled: true,
  },
  {
    id: "revenue_by_event_list",
    name: "Total Revenue by Event",
    description: "All-time revenue for each event",
    category: "revenue",
    supportedChartTypes: ["list"],
    defaultChartType: "list",
    defaultSize: "medium",
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

  // Ticket widgets
  {
    id: "tickets_sold",
    name: "Tickets Sold",
    description: "Total tickets sold count",
    category: "tickets",
    supportedChartTypes: ["stat"],
    defaultChartType: "stat",
    defaultSize: "small",
    defaultEnabled: false, // Already shown in overview cards
  },
  {
    id: "tickets_by_type",
    name: "Tickets by Type",
    description: "Breakdown of tickets sold by type",
    category: "tickets",
    supportedChartTypes: ["pie", "donut", "bar"],
    defaultChartType: "pie",
    defaultSize: "medium",
    defaultEnabled: false,
  },
  {
    id: "checkin_rate",
    name: "Check-in Rate",
    description: "Percentage of tickets checked in",
    category: "tickets",
    supportedChartTypes: ["stat", "progress"],
    defaultChartType: "progress",
    defaultSize: "small",
    defaultEnabled: false,
  },

  // Order widgets
  {
    id: "orders_total",
    name: "Total Orders",
    description: "Total number of orders",
    category: "orders",
    supportedChartTypes: ["stat"],
    defaultChartType: "stat",
    defaultSize: "small",
    defaultEnabled: false, // Already shown in overview cards
  },
  {
    id: "orders_avg_value",
    name: "Average Order Value",
    description: "Average order value by event with total",
    category: "orders",
    supportedChartTypes: ["list"],
    defaultChartType: "list",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "orders_over_time",
    name: "Orders Over Time",
    description: "Order count trend",
    category: "orders",
    supportedChartTypes: ["line", "bar", "area"],
    defaultChartType: "line",
    defaultSize: "medium",
    defaultEnabled: false,
  },

  // Visitor widgets (from widget tracking)
  {
    id: "visitors_device",
    name: "Device Breakdown",
    description: "Visitors by device type",
    category: "visitors",
    supportedChartTypes: ["pie", "donut", "bar", "progress"],
    defaultChartType: "donut",
    defaultSize: "medium",
    defaultEnabled: false,
  },
  {
    id: "visitors_location",
    name: "Visitor Locations",
    description: "Where your visitors are from",
    category: "visitors",
    supportedChartTypes: ["bar", "list"],
    defaultChartType: "bar",
    defaultSize: "medium",
    defaultEnabled: false,
  },
  {
    id: "visitors_funnel",
    name: "Conversion Funnel",
    description: "Widget visitor conversion rates",
    category: "visitors",
    supportedChartTypes: ["progress", "bar"],
    defaultChartType: "progress",
    defaultSize: "large",
    defaultEnabled: false,
  },

  // Event widgets
  {
    id: "events_upcoming",
    name: "Upcoming Events",
    description: "List of upcoming events",
    category: "events",
    supportedChartTypes: ["list"],
    defaultChartType: "list",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "events_capacity",
    name: "Capacity Utilization",
    description: "How full your events are",
    category: "events",
    supportedChartTypes: ["progress", "bar"],
    defaultChartType: "progress",
    defaultSize: "medium",
    defaultEnabled: false,
  },

  // Group widgets
  {
    id: "groups_sales_by_group",
    name: "Sales by Group",
    description: "Revenue breakdown by group",
    category: "groups",
    supportedChartTypes: ["bar", "list"],
    defaultChartType: "bar",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "groups_tickets_by_group",
    name: "Tickets by Group",
    description: "Tickets sold breakdown by group",
    category: "groups",
    supportedChartTypes: ["bar", "list"],
    defaultChartType: "bar",
    defaultSize: "medium",
    defaultEnabled: false,
  },
  {
    id: "groups_outstanding_invoices",
    name: "Outstanding Invoices",
    description: "Unpaid group invoices",
    category: "groups",
    supportedChartTypes: ["list"],
    defaultChartType: "list",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "groups_discounts_given",
    name: "Group Discounts Given",
    description: "Total discounts given to groups",
    category: "groups",
    supportedChartTypes: ["bar", "list"],
    defaultChartType: "list",
    defaultSize: "medium",
    defaultEnabled: false,
  },

  // Insights widgets (new)
  {
    id: "insights_goal_progress",
    name: "Revenue Goal",
    description: "Track progress towards your revenue goal",
    category: "insights",
    supportedChartTypes: ["progress"],
    defaultChartType: "progress",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "insights_live_activity",
    name: "Live Activity",
    description: "Real-time sales and activity feed",
    category: "insights",
    supportedChartTypes: ["list"],
    defaultChartType: "list",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "insights_sales_heatmap",
    name: "Peak Sales Times",
    description: "When your tickets sell best",
    category: "insights",
    supportedChartTypes: ["progress"],
    defaultChartType: "progress",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "insights_ai_recommendations",
    name: "Smart Insights",
    description: "AI-powered recommendations and alerts",
    category: "insights",
    supportedChartTypes: ["list"],
    defaultChartType: "list",
    defaultSize: "medium",
    defaultEnabled: true,
  },
  {
    id: "insights_quick_actions",
    name: "Action Items",
    description: "Tasks needing your attention",
    category: "insights",
    supportedChartTypes: ["list"],
    defaultChartType: "list",
    defaultSize: "medium",
    defaultEnabled: true,
  },
];

// Get default dashboard config
export const getDefaultDashboardConfig = (): DashboardConfig => {
  return {
    widgets: WIDGET_REGISTRY.map((widget, index) => ({
      widgetId: widget.id,
      enabled: widget.defaultEnabled,
      chartType: widget.defaultChartType,
      size: widget.defaultSize,
      position: index,
    })),
    layout: "grid",
    updatedAt: new Date().toISOString(),
  };
};

// Get widget definition by ID
export const getWidgetDefinition = (widgetId: string): WidgetDefinition | undefined => {
  return WIDGET_REGISTRY.find((w) => w.id === widgetId);
};

// Category labels for grouping
export const CATEGORY_LABELS: Record<string, string> = {
  insights: "Insights & Actions",
  revenue: "Revenue",
  tickets: "Tickets",
  orders: "Orders",
  visitors: "Visitors",
  events: "Events",
  groups: "Groups",
};
