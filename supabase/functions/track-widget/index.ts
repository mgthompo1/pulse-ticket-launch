import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FunnelStep =
  | "widget_loaded"
  | "ticket_selected"
  | "checkout_started"
  | "payment_initiated"
  | "purchase_completed";

interface TrackingPayload {
  event_id: string;
  session_id: string;
  step: FunnelStep;

  // Optional context
  tickets_selected?: Array<{
    ticket_type_id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  cart_value?: number;

  // Attribution
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;

  // Device info
  device_type?: string;
  browser?: string;

  // Metrics
  time_on_widget_seconds?: number;
}

interface GeoLocation {
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

// Get IP address from request headers
const getClientIP = (req: Request): string => {
  // Try various headers that might contain the real IP
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
};

// Lookup geolocation from IP address using free ip-api.com
const getGeoLocation = async (ip: string): Promise<GeoLocation | null> => {
  if (ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null; // Skip local/private IPs
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,lat,lon,timezone`);
    const data = await response.json();

    if (data.status === "success") {
      return {
        country: data.country,
        country_code: data.countryCode,
        region: data.region,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
      };
    }
  } catch (error) {
    console.error("Geolocation lookup failed:", error);
  }

  return null;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const payload: TrackingPayload = await req.json();
    const { event_id, session_id, step } = payload;

    if (!event_id || !session_id || !step) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event_id, session_id, step" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map step to database column
    const stepColumnMap: Record<FunnelStep, string> = {
      widget_loaded: "widget_loaded_at",
      ticket_selected: "ticket_selected_at",
      checkout_started: "checkout_started_at",
      payment_initiated: "payment_initiated_at",
      purchase_completed: "purchase_completed_at",
    };

    const stepColumn = stepColumnMap[step];
    if (!stepColumn) {
      return new Response(
        JSON.stringify({ error: "Invalid step" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if session exists
    const { data: existingSession } = await supabase
      .from("widget_sessions")
      .select("id")
      .eq("event_id", event_id)
      .eq("session_id", session_id)
      .single();

    if (existingSession) {
      // Update existing session
      const updateData: Record<string, unknown> = {
        [stepColumn]: new Date().toISOString(),
        exit_step: step,
      };

      // Add optional fields if provided
      if (payload.tickets_selected) {
        updateData.tickets_selected = payload.tickets_selected;
      }
      if (payload.cart_value !== undefined) {
        updateData.cart_value = payload.cart_value;
      }
      if (payload.time_on_widget_seconds !== undefined) {
        updateData.time_on_widget_seconds = payload.time_on_widget_seconds;
      }

      const { error: updateError } = await supabase
        .from("widget_sessions")
        .update(updateData)
        .eq("id", existingSession.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true, action: "updated", session_id: existingSession.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Create new session (only for widget_loaded step)
      if (step !== "widget_loaded") {
        // If session doesn't exist and not widget_loaded, create one anyway
        // This handles edge cases where the initial load wasn't tracked
      }

      // Get IP and geolocation for new sessions
      const clientIP = getClientIP(req);
      const geoLocation = await getGeoLocation(clientIP);

      const insertData: Record<string, unknown> = {
        event_id,
        session_id,
        [stepColumn]: new Date().toISOString(),
        exit_step: step,
        referrer: payload.referrer || null,
        utm_source: payload.utm_source || null,
        utm_medium: payload.utm_medium || null,
        utm_campaign: payload.utm_campaign || null,
        utm_content: payload.utm_content || null,
        utm_term: payload.utm_term || null,
        device_type: payload.device_type || null,
        browser: payload.browser || null,
        // IP and geolocation
        ip_address: clientIP !== "unknown" ? clientIP : null,
        country: geoLocation?.country || null,
        country_code: geoLocation?.country_code || null,
        region: geoLocation?.region || null,
        city: geoLocation?.city || null,
        latitude: geoLocation?.latitude || null,
        longitude: geoLocation?.longitude || null,
        visitor_timezone: geoLocation?.timezone || null,
      };

      if (payload.tickets_selected) {
        insertData.tickets_selected = payload.tickets_selected;
      }
      if (payload.cart_value !== undefined) {
        insertData.cart_value = payload.cart_value;
      }

      const { data: newSession, error: insertError } = await supabase
        .from("widget_sessions")
        .insert(insertData)
        .select("id")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, action: "created", session_id: newSession.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Tracking error:", error);

    // Return success anyway to not break the widget
    // Analytics failures should be silent
    return new Response(
      JSON.stringify({ success: false, error: "Tracking failed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
