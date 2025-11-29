/**
 * WidgetRouter - Routes to the appropriate checkout component based on event config
 *
 * If useCustomTemplate is enabled, routes to CustomTemplateCheckout
 * Otherwise, routes to the standard TicketWidget
 *
 * This keeps the existing checkout templates completely untouched
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import TicketWidget from "@/pages/TicketWidget";
import { CustomTemplateCheckout } from "@/components/CustomTemplateCheckout";

export default function WidgetRouter() {
  const { eventId } = useParams<{ eventId: string }>();
  const [loading, setLoading] = useState(true);
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkEventConfig();
  }, [eventId]);

  const checkEventConfig = async () => {
    if (!eventId) {
      setError("No event ID provided");
      setLoading(false);
      return;
    }

    try {
      const { data: event, error: fetchError } = await supabase
        .from("events")
        .select("widget_customization")
        .eq("id", eventId)
        .single();

      if (fetchError) throw fetchError;

      const customization = event?.widget_customization as {
        useCustomTemplate?: boolean;
        customTemplate?: unknown;
      } | null;

      // Only use custom template if:
      // 1. useCustomTemplate is explicitly true
      // 2. customTemplate exists and has pages
      const hasCustomTemplate =
        customization?.useCustomTemplate === true &&
        customization?.customTemplate &&
        typeof customization.customTemplate === "object" &&
        "pages" in (customization.customTemplate as object);

      setUseCustomTemplate(hasCustomTemplate);
    } catch (err) {
      console.error("Error checking event config:", err);
      // On error, fall back to standard widget
      setUseCustomTemplate(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  // Route to appropriate component
  if (useCustomTemplate && eventId) {
    return <CustomTemplateCheckout eventId={eventId} />;
  }

  // Default to existing TicketWidget (completely unchanged)
  return <TicketWidget />;
}
