import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AttractionDashboardConfig,
  AttractionWidgetConfig,
  ChartType,
  WidgetSize,
  DEFAULT_ATTRACTION_WIDGETS,
  ATTRACTION_WIDGET_REGISTRY,
} from "@/types/attraction-dashboard-widgets";

interface UseAttractionsDashboardConfigProps {
  organizationId: string | null;
}

interface UseAttractionsDashboardConfigReturn {
  config: AttractionDashboardConfig;
  isLoading: boolean;
  isSaving: boolean;
  enabledWidgets: AttractionWidgetConfig[];
  updateWidgetEnabled: (widgetId: string, enabled: boolean) => void;
  updateWidgetChartType: (widgetId: string, chartType: ChartType) => void;
  updateWidgetSize: (widgetId: string, size: WidgetSize) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  resetToDefaults: () => void;
  saveConfig: () => Promise<void>;
}

const getDefaultConfig = (): AttractionDashboardConfig => ({
  widgets: DEFAULT_ATTRACTION_WIDGETS,
  layout: "grid",
  updatedAt: new Date().toISOString(),
});

export const useAttractionsDashboardConfig = ({
  organizationId,
}: UseAttractionsDashboardConfigProps): UseAttractionsDashboardConfigReturn => {
  const [config, setConfig] = useState<AttractionDashboardConfig>(getDefaultConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load config from database
  useEffect(() => {
    const loadConfig = async () => {
      if (!organizationId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("attraction_dashboard_config")
          .eq("id", organizationId)
          .single();

        if (error) throw error;

        if (data?.attraction_dashboard_config) {
          // Merge saved config with defaults to handle new widgets
          const savedConfig = data.attraction_dashboard_config as AttractionDashboardConfig;
          const mergedWidgets = ATTRACTION_WIDGET_REGISTRY.map((widget, index) => {
            const savedWidget = savedConfig.widgets?.find(
              (w) => w.widgetId === widget.id
            );
            if (savedWidget) {
              return savedWidget;
            }
            // New widget not in saved config - use defaults
            return {
              widgetId: widget.id,
              enabled: widget.defaultEnabled,
              chartType: widget.defaultChartType,
              size: widget.defaultSize,
              position: index,
            };
          });

          setConfig({
            ...savedConfig,
            widgets: mergedWidgets,
          });
        }
      } catch (error) {
        console.error("Error loading attractions dashboard config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [organizationId]);

  // Get enabled widgets sorted by position
  const enabledWidgets = config.widgets
    .filter((w) => w.enabled)
    .sort((a, b) => a.position - b.position);

  // Update widget enabled state
  const updateWidgetEnabled = useCallback((widgetId: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.widgetId === widgetId ? { ...w, enabled } : w
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Update widget chart type
  const updateWidgetChartType = useCallback(
    (widgetId: string, chartType: ChartType) => {
      setConfig((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) =>
          w.widgetId === widgetId ? { ...w, chartType } : w
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    []
  );

  // Update widget size
  const updateWidgetSize = useCallback((widgetId: string, size: WidgetSize) => {
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.widgetId === widgetId ? { ...w, size } : w
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Reorder widgets
  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    setConfig((prev) => {
      const enabledIds = prev.widgets
        .filter((w) => w.enabled)
        .sort((a, b) => a.position - b.position)
        .map((w) => w.widgetId);

      // Move item in array
      const [movedId] = enabledIds.splice(fromIndex, 1);
      enabledIds.splice(toIndex, 0, movedId);

      // Update positions
      const newWidgets = prev.widgets.map((w) => {
        const newPosition = enabledIds.indexOf(w.widgetId);
        return {
          ...w,
          position: newPosition >= 0 ? newPosition : w.position,
        };
      });

      return {
        ...prev,
        widgets: newWidgets,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setConfig(getDefaultConfig());
  }, []);

  // Save config to database
  const saveConfig = useCallback(async () => {
    if (!organizationId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ attraction_dashboard_config: config as unknown as Record<string, unknown> })
        .eq("id", organizationId);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving attractions dashboard config:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [organizationId, config]);

  return {
    config,
    isLoading,
    isSaving,
    enabledWidgets,
    updateWidgetEnabled,
    updateWidgetChartType,
    updateWidgetSize,
    reorderWidgets,
    resetToDefaults,
    saveConfig,
  };
};
