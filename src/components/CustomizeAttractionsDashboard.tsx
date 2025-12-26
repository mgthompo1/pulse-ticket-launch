import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings2, RotateCcw, Loader2 } from "lucide-react";
import {
  AttractionDashboardConfig,
  AttractionWidgetConfig,
  ChartType,
  ATTRACTION_WIDGET_REGISTRY,
  getAttractionWidgetDefinition,
} from "@/types/attraction-dashboard-widgets";

interface CustomizeAttractionsDashboardProps {
  config: AttractionDashboardConfig;
  onUpdateEnabled: (widgetId: string, enabled: boolean) => void;
  onUpdateChartType: (widgetId: string, chartType: ChartType) => void;
  onResetDefaults: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: "Bar Chart",
  line: "Line Chart",
  area: "Area Chart",
  pie: "Pie Chart",
  donut: "Donut Chart",
  stat: "Stat Card",
  list: "List View",
  progress: "Progress Bars",
};

const CATEGORY_LABELS: Record<string, string> = {
  revenue: "Revenue",
  bookings: "Bookings",
  capacity: "Capacity",
  performance: "Performance",
};

export const CustomizeAttractionsDashboard = ({
  config,
  onUpdateEnabled,
  onUpdateChartType,
  onResetDefaults,
  onSave,
  isSaving,
}: CustomizeAttractionsDashboardProps) => {
  const [open, setOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Group widgets by category
  const widgetsByCategory = ATTRACTION_WIDGET_REGISTRY.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, typeof ATTRACTION_WIDGET_REGISTRY>);

  const getWidgetConfig = (widgetId: string): AttractionWidgetConfig | undefined => {
    return config.widgets.find((w) => w.widgetId === widgetId);
  };

  const handleEnabledChange = (widgetId: string, enabled: boolean) => {
    onUpdateEnabled(widgetId, enabled);
    setHasChanges(true);
  };

  const handleChartTypeChange = (widgetId: string, chartType: ChartType) => {
    onUpdateChartType(widgetId, chartType);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave();
    setHasChanges(false);
    setOpen(false);
  };

  const handleReset = () => {
    onResetDefaults();
    setHasChanges(true);
  };

  const enabledCount = config.widgets.filter((w) => w.enabled).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-manrope">
          <Settings2 className="h-4 w-4" />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-manrope">Customize Attractions Dashboard</DialogTitle>
          <DialogDescription className="font-manrope">
            Choose which widgets to display and how they appear.{" "}
            <Badge variant="secondary" className="ml-2">
              {enabledCount} widgets enabled
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {Object.entries(widgetsByCategory).map(([category, widgets]) => (
            <div key={category}>
              <h3 className="font-manrope font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="space-y-3">
                {widgets.map((widget) => {
                  const widgetConfig = getWidgetConfig(widget.id);
                  const isEnabled = widgetConfig?.enabled ?? widget.defaultEnabled;
                  const chartType = widgetConfig?.chartType ?? widget.defaultChartType;

                  return (
                    <div
                      key={widget.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isEnabled
                          ? "bg-background border-border"
                          : "bg-muted/30 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            handleEnabledChange(widget.id, checked)
                          }
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={widget.id}
                            className={`font-manrope font-medium ${
                              !isEnabled && "text-muted-foreground"
                            }`}
                          >
                            {widget.name}
                          </Label>
                          <p className="font-manrope text-xs text-muted-foreground mt-0.5">
                            {widget.description}
                          </p>
                        </div>
                      </div>

                      {isEnabled && widget.supportedChartTypes.length > 1 && (
                        <Select
                          value={chartType}
                          onValueChange={(value) =>
                            handleChartTypeChange(widget.id, value as ChartType)
                          }
                        >
                          <SelectTrigger className="w-36 font-manrope">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {widget.supportedChartTypes.map((type) => (
                              <SelectItem key={type} value={type} className="font-manrope">
                                {CHART_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>
              <Separator className="mt-4" />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-2 font-manrope"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => setOpen(false)} className="font-manrope">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="font-manrope">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
