import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash a token for lookup
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Validate the access token and return the organization ID
async function validateToken(
  supabase: any,
  authHeader: string | null
): Promise<{ valid: boolean; organizationId?: string; scopes?: string[]; error?: string }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const tokenHash = await hashToken(token);

  const { data: tokenRecord, error } = await supabase
    .from("integration_tokens")
    .select("organization_id, scopes, expires_at, last_used_at")
    .eq("token_hash", tokenHash)
    .eq("partner_platform", "givvv")
    .eq("is_active", true)
    .single();

  if (error || !tokenRecord) {
    return { valid: false, error: "Invalid or expired token" };
  }

  // Check expiration
  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    return { valid: false, error: "Token has expired" };
  }

  // Update last_used_at
  await supabase
    .from("integration_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  return {
    valid: true,
    organizationId: tokenRecord.organization_id,
    scopes: tokenRecord.scopes,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Validate token
    const authHeader = req.headers.get("authorization");
    const tokenValidation = await validateToken(supabaseClient, authHeader);

    if (!tokenValidation.valid) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: tokenValidation.error }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizationId = tokenValidation.organizationId!;
    const scopes = tokenValidation.scopes || [];

    // Parse the URL to determine the action
    const url = new URL(req.url);
    const path = url.pathname.replace("/givvv-api", "");

    // Route handlers
    if (path === "/events" || path === "/events/") {
      // Check scope
      if (!scopes.includes("events:read")) {
        return new Response(
          JSON.stringify({ error: "forbidden", message: "Missing events:read scope" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch events for this organization
      const { data: events, error } = await supabaseClient
        .from("events")
        .select(`
          id,
          name,
          description,
          event_date,
          event_end_date,
          venue,
          capacity,
          status,
          featured_image_url,
          logo_url,
          donations_enabled,
          created_at,
          updated_at
        `)
        .eq("organization_id", organizationId)
        .order("event_date", { ascending: false });

      if (error) {
        console.error("Error fetching events:", error);
        return new Response(
          JSON.stringify({ error: "server_error", message: "Failed to fetch events" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch ticket stats for each event
      const eventsWithStats = await Promise.all(
        (events || []).map(async (event) => {
          const { data: ticketTypes } = await supabaseClient
            .from("ticket_types")
            .select("quantity, sold, price")
            .eq("event_id", event.id);

          const capacity = ticketTypes?.reduce((sum, t) => sum + (t.quantity || 0), 0) || event.capacity || 0;
          const ticketsSold = ticketTypes?.reduce((sum, t) => sum + (t.sold || 0), 0) || 0;

          const { data: orders } = await supabaseClient
            .from("orders")
            .select("total_amount")
            .eq("event_id", event.id)
            .eq("status", "completed");

          const revenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

          return {
            ...event,
            capacity,
            tickets_sold: ticketsSold,
            revenue,
          };
        })
      );

      return new Response(
        JSON.stringify({ events: eventsWithStats }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/orders" || path === "/orders/") {
      // Check scope
      if (!scopes.includes("orders:read")) {
        return new Response(
          JSON.stringify({ error: "forbidden", message: "Missing orders:read scope" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get query params
      const eventId = url.searchParams.get("event_id");
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);

      let query = supabaseClient
        .from("orders")
        .select(`
          id,
          event_id,
          customer_name,
          customer_email,
          total_amount,
          status,
          created_at,
          events!inner(organization_id)
        `)
        .eq("events.organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (eventId) {
        query = query.eq("event_id", eventId);
      }

      const { data: orders, error } = await query;

      if (error) {
        console.error("Error fetching orders:", error);
        return new Response(
          JSON.stringify({ error: "server_error", message: "Failed to fetch orders" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove the nested events object from response
      const cleanOrders = (orders || []).map(({ events, ...order }) => order);

      return new Response(
        JSON.stringify({ orders: cleanOrders }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/organization" || path === "/organization/") {
      // Get organization info
      const { data: org, error } = await supabaseClient
        .from("organizations")
        .select("id, name, email, logo_url, currency")
        .eq("id", organizationId)
        .single();

      if (error) {
        console.error("Error fetching organization:", error);
        return new Response(
          JSON.stringify({ error: "server_error", message: "Failed to fetch organization" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ organization: org }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown endpoint
    return new Response(
      JSON.stringify({ error: "not_found", message: `Unknown endpoint: ${path}` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: "server_error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
