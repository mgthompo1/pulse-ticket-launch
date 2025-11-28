import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye,
  ShoppingCart,
  UserCheck,
  CreditCard,
  CheckCircle2,
  TrendingDown,
  Monitor,
  Smartphone,
  Tablet,
  ArrowRight,
  Loader2,
  AlertCircle,
  Globe,
} from "lucide-react";

interface WidgetFunnelAnalyticsProps {
  eventId: string;
}

interface FunnelData {
  widget_loaded: number;
  ticket_selected: number;
  checkout_started: number;
  payment_initiated: number;
  purchase_completed: number;
}

interface DeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
}

interface AbandonmentData {
  step: string;
  count: number;
  avgCartValue: number;
}

interface LocationData {
  country: string;
  country_code: string;
  count: number;
}

const FUNNEL_STEPS = [
  { key: "widget_loaded", label: "Widget Views", icon: Eye, color: "bg-blue-500" },
  { key: "ticket_selected", label: "Ticket Selected", icon: ShoppingCart, color: "bg-indigo-500" },
  { key: "checkout_started", label: "Checkout Started", icon: UserCheck, color: "bg-purple-500" },
  { key: "payment_initiated", label: "Payment Initiated", icon: CreditCard, color: "bg-orange-500" },
  { key: "purchase_completed", label: "Purchase Completed", icon: CheckCircle2, color: "bg-green-500" },
];

export const WidgetFunnelAnalytics = ({ eventId }: WidgetFunnelAnalyticsProps) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [funnelData, setFunnelData] = useState<FunnelData>({
    widget_loaded: 0,
    ticket_selected: 0,
    checkout_started: 0,
    payment_initiated: 0,
    purchase_completed: 0,
  });
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceBreakdown>({
    desktop: 0,
    mobile: 0,
    tablet: 0,
  });
  const [abandonmentData, setAbandonmentData] = useState<AbandonmentData[]>([]);
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [avgTimeOnWidget, setAvgTimeOnWidget] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!eventId) return;

      setLoading(true);
      try {
        // Calculate date range
        const now = new Date();
        const startDate = new Date();
        switch (timeRange) {
          case "24h":
            startDate.setHours(startDate.getHours() - 24);
            break;
          case "7d":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "30d":
            startDate.setDate(startDate.getDate() - 30);
            break;
          case "90d":
            startDate.setDate(startDate.getDate() - 90);
            break;
        }

        // Fetch widget sessions
        const { data: sessions, error } = await supabase
          .from("widget_sessions")
          .select("*")
          .eq("event_id", eventId)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", now.toISOString());

        if (error) throw error;

        if (!sessions || sessions.length === 0) {
          setLoading(false);
          return;
        }

        setTotalSessions(sessions.length);

        // Calculate funnel data
        const funnel: FunnelData = {
          widget_loaded: sessions.filter((s) => s.widget_loaded_at).length,
          ticket_selected: sessions.filter((s) => s.ticket_selected_at).length,
          checkout_started: sessions.filter((s) => s.checkout_started_at).length,
          payment_initiated: sessions.filter((s) => s.payment_initiated_at).length,
          purchase_completed: sessions.filter((s) => s.purchase_completed_at).length,
        };
        setFunnelData(funnel);

        // Calculate device breakdown
        const devices: DeviceBreakdown = {
          desktop: sessions.filter((s) => s.device_type === "desktop").length,
          mobile: sessions.filter((s) => s.device_type === "mobile").length,
          tablet: sessions.filter((s) => s.device_type === "tablet").length,
        };
        setDeviceBreakdown(devices);

        // Calculate abandonment by step
        const abandonment: AbandonmentData[] = [];
        const stepOrder = ["widget_loaded", "ticket_selected", "checkout_started", "payment_initiated"];

        stepOrder.forEach((step) => {
          const abandonedAtStep = sessions.filter((s) => s.exit_step === step && !s.purchase_completed_at);
          if (abandonedAtStep.length > 0) {
            const avgCart =
              abandonedAtStep.reduce((sum, s) => sum + (s.cart_value || 0), 0) / abandonedAtStep.length;
            abandonment.push({
              step,
              count: abandonedAtStep.length,
              avgCartValue: avgCart,
            });
          }
        });
        setAbandonmentData(abandonment);

        // Calculate location breakdown
        const locationCounts: Record<string, { country: string; country_code: string; count: number }> = {};
        sessions.forEach((s) => {
          if (s.country && s.country_code) {
            if (!locationCounts[s.country_code]) {
              locationCounts[s.country_code] = { country: s.country, country_code: s.country_code, count: 0 };
            }
            locationCounts[s.country_code].count++;
          }
        });
        const locations = Object.values(locationCounts).sort((a, b) => b.count - a.count);
        setLocationData(locations);

        // Calculate average time on widget
        const sessionsWithTime = sessions.filter((s) => s.time_on_widget_seconds && s.time_on_widget_seconds > 0);
        if (sessionsWithTime.length > 0) {
          const avgTime =
            sessionsWithTime.reduce((sum, s) => sum + (s.time_on_widget_seconds || 0), 0) / sessionsWithTime.length;
          setAvgTimeOnWidget(Math.round(avgTime));
        }
      } catch (error) {
        console.error("Error fetching widget analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [eventId, timeRange]);

  const getConversionRate = (from: number, to: number): number => {
    if (from === 0) return 0;
    return Math.round((to / from) * 100);
  };

  const getStepLabel = (step: string): string => {
    const labels: Record<string, string> = {
      widget_loaded: "Widget Views",
      ticket_selected: "Ticket Selection",
      checkout_started: "Checkout",
      payment_initiated: "Payment",
    };
    return labels[step] || step;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (totalSessions === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Widget Data Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Widget analytics will appear here once visitors start viewing your ticket widget.
              Make sure you've published your event and shared the widget link.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallConversion = getConversionRate(funnelData.widget_loaded, funnelData.purchase_completed);

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Widget Funnel Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Track visitor behavior and identify drop-off points
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{totalSessions.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{overallConversion}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Purchases</p>
                <p className="text-2xl font-bold">{funnelData.purchase_completed.toLocaleString()}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Time on Widget</p>
                <p className="text-2xl font-bold">{formatTime(avgTimeOnWidget)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
          <CardDescription>Visitor journey from widget view to purchase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FUNNEL_STEPS.map((step, index) => {
              const count = funnelData[step.key as keyof FunnelData];
              const prevCount = index > 0 ? funnelData[FUNNEL_STEPS[index - 1].key as keyof FunnelData] : count;
              const dropOff = index > 0 ? prevCount - count : 0;
              const conversionFromPrev = index > 0 ? getConversionRate(prevCount, count) : 100;
              const widthPercent = funnelData.widget_loaded > 0
                ? (count / funnelData.widget_loaded) * 100
                : 0;

              return (
                <div key={step.key}>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`p-2 rounded-lg ${step.color} text-white`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{step.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">{count.toLocaleString()}</span>
                          {index > 0 && (
                            <Badge variant={conversionFromPrev >= 50 ? "default" : "secondary"} className="text-xs">
                              {conversionFromPrev}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Progress value={widthPercent} className="h-2" />
                    </div>
                  </div>
                  {index < FUNNEL_STEPS.length - 1 && dropOff > 0 && (
                    <div className="ml-12 flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <ArrowRight className="h-3 w-3" />
                      <span>{dropOff.toLocaleString()} dropped off</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Device Breakdown</CardTitle>
            <CardDescription>How visitors access your widget</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { type: "desktop", icon: Monitor, count: deviceBreakdown.desktop },
                { type: "mobile", icon: Smartphone, count: deviceBreakdown.mobile },
                { type: "tablet", icon: Tablet, count: deviceBreakdown.tablet },
              ].map((device) => {
                const percent = totalSessions > 0 ? Math.round((device.count / totalSessions) * 100) : 0;
                return (
                  <div key={device.type} className="flex items-center gap-4">
                    <device.icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm capitalize">{device.type}</span>
                        <span className="text-sm font-medium">{percent}%</span>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      {device.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Abandonment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Abandonment Analysis</CardTitle>
            <CardDescription>Where visitors drop off most</CardDescription>
          </CardHeader>
          <CardContent>
            {abandonmentData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No abandonment data available yet
              </p>
            ) : (
              <div className="space-y-3">
                {abandonmentData
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 4)
                  .map((item) => (
                    <div key={item.step} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{getStepLabel(item.step)}</p>
                        <p className="text-xs text-muted-foreground">
                          Avg. cart: ${item.avgCartValue.toFixed(2)}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {item.count} dropped
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visitor Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visitor Locations</CardTitle>
            <CardDescription>Where your visitors are from</CardDescription>
          </CardHeader>
          <CardContent>
            {locationData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No location data available yet
              </p>
            ) : (
              <div className="space-y-3">
                {locationData.slice(0, 6).map((location) => {
                  const percent = totalSessions > 0 ? Math.round((location.count / totalSessions) * 100) : 0;
                  return (
                    <div key={location.country_code} className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">{location.country}</span>
                          <span className="text-sm font-medium">{percent}%</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {location.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
