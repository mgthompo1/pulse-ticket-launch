import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LogoutRequest {
  token: string;
}

interface LogoutResponse {
  success: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { token }: LogoutRequest = await req.json();

    console.log("=== ADMIN LOGOUT ===");
    console.log("Invalidating token:", token ? "provided" : "missing");

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: "Token is required"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Invalidate session using the secure database function
    const { data: invalidated, error: logoutError } = await supabaseClient.rpc(
      'invalidate_admin_session',
      { token }
    );

    if (logoutError) {
      console.error("Logout error:", logoutError);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to invalidate session"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("Session invalidated:", invalidated ? "successfully" : "token not found");

    // Log security event
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    await supabaseClient.rpc("log_security_event", {
      p_user_id: null,
      p_admin_user_id: null, // We don't have admin ID after logout
      p_event_type: "admin_logout",
      p_event_data: { success: true },
      p_ip_address: clientIP,
      p_user_agent: userAgent
    });

    return new Response(JSON.stringify({
      success: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Admin logout error:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});