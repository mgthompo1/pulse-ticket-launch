import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type FunnelStep =
  | "widget_loaded"
  | "ticket_selected"
  | "checkout_started"
  | "payment_initiated"
  | "purchase_completed";

interface TicketSelection {
  ticket_type_id: string;
  name: string;
  quantity: number;
  price: number;
}

interface UseWidgetTrackingProps {
  eventId: string;
  enabled?: boolean;
}

// Generate a unique session ID for this browser session
const generateSessionId = (): string => {
  const stored = sessionStorage.getItem("widget_session_id");
  if (stored) return stored;

  const newId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  sessionStorage.setItem("widget_session_id", newId);
  return newId;
};

// Detect device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
};

// Get browser name
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edge")) return "Edge";
  return "Other";
};

// Get UTM parameters from URL
const getUtmParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_content: params.get("utm_content") || undefined,
    utm_term: params.get("utm_term") || undefined,
  };
};

export const useWidgetTracking = ({ eventId, enabled = true }: UseWidgetTrackingProps) => {
  const sessionId = useRef<string>(generateSessionId());
  const loadTime = useRef<number>(Date.now());
  const hasTrackedLoad = useRef<boolean>(false);

  // Track a funnel step
  const trackStep = useCallback(
    async (
      step: FunnelStep,
      options?: {
        tickets_selected?: TicketSelection[];
        cart_value?: number;
      }
    ) => {
      if (!enabled || !eventId) return;

      try {
        const timeOnWidget = Math.floor((Date.now() - loadTime.current) / 1000);

        const payload = {
          event_id: eventId,
          session_id: sessionId.current,
          step,
          referrer: document.referrer || undefined,
          device_type: getDeviceType(),
          browser: getBrowser(),
          time_on_widget_seconds: timeOnWidget,
          ...getUtmParams(),
          ...options,
        };

        // Use edge function for tracking (fire and forget)
        await supabase.functions.invoke("track-widget", {
          body: payload,
        });
      } catch (error) {
        // Silent fail - don't break the widget for analytics
        console.debug("Widget tracking error:", error);
      }
    },
    [eventId, enabled]
  );

  // Track widget loaded on mount
  useEffect(() => {
    if (enabled && eventId && !hasTrackedLoad.current) {
      hasTrackedLoad.current = true;
      trackStep("widget_loaded");
    }
  }, [enabled, eventId, trackStep]);

  // Convenience methods for each step
  const trackTicketSelected = useCallback(
    (tickets: TicketSelection[], cartValue: number) => {
      trackStep("ticket_selected", {
        tickets_selected: tickets,
        cart_value: cartValue,
      });
    },
    [trackStep]
  );

  const trackCheckoutStarted = useCallback(
    (cartValue?: number) => {
      trackStep("checkout_started", { cart_value: cartValue });
    },
    [trackStep]
  );

  const trackPaymentInitiated = useCallback(
    (cartValue?: number) => {
      trackStep("payment_initiated", { cart_value: cartValue });
    },
    [trackStep]
  );

  const trackPurchaseCompleted = useCallback(
    (cartValue?: number) => {
      trackStep("purchase_completed", { cart_value: cartValue });
    },
    [trackStep]
  );

  return {
    trackStep,
    trackTicketSelected,
    trackCheckoutStarted,
    trackPaymentInitiated,
    trackPurchaseCompleted,
    sessionId: sessionId.current,
  };
};
