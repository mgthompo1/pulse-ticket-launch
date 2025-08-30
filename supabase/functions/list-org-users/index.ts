import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  const origin = req.headers.get("Origin") || req.headers.get("origin") || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  } as Record<string, string>;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }
  try {
    const { organizationId } = await req.json();
    if (!organizationId) throw new Error("organizationId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify caller: must be a member or owner of the organization
    const rawAuth =
      req.headers.get("x-supabase-authorization") ||
      req.headers.get("X-Supabase-Authorization") ||
      req.headers.get("Authorization") ||
      req.headers.get("authorization");
    if (!rawAuth) throw new Error("Authorization header is required");
    const token = rawAuth.replace("Bearer ", "");
    const { data: auth } = await supabase.auth.getUser(token);
    if (!auth?.user) throw new Error("Not authenticated");

    const { data: membership } = await supabase
      .from("organization_users")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", auth.user.id)
      .single();
    if (!membership) {
      // Fallback: allow organization owner
      const { data: org } = await supabase
        .from("organizations")
        .select("id, user_id")
        .eq("id", organizationId)
        .eq("user_id", auth.user.id)
        .single();
      if (!org) throw new Error("Not a member of this organization");
    }

    // Get org users
    const { data: orgUsers, error: orgErr } = await supabase
      .from("organization_users")
      .select("id, user_id, role, permissions, joined_at")
      .eq("organization_id", organizationId);
    if (orgErr) throw orgErr;

    // Map user_id -> email via admin list (service role)
    const emails: Record<string, string> = {};
    const { data: list } = await supabase.auth.admin.listUsers();
    list?.users?.forEach((u:any) => {
      emails[u.id] = u.email || "";
    });

    const result = (orgUsers || []).map((u:any) => ({
      ...u,
      email: emails[u.user_id] || "",
    }));

    return new Response(JSON.stringify({ users: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});


