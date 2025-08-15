import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionValidationRequest {
  token: string;
}

interface SessionValidationResponse {
  valid: boolean;
  adminId?: string;
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

    const { token }: SessionValidationRequest = await req.json();

    console.log("=== ADMIN SESSION VALIDATION ===");
    console.log("Validating token:", token ? "provided" : "missing");

    if (!token) {
      return new Response(JSON.stringify({
        valid: false,
        error: "Token is required"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate session using the secure database function
    const { data: adminId, error: validationError } = await supabaseClient.rpc(
      'validate_admin_session',
      { token }
    );

    if (validationError) {
      console.error("Session validation error:", validationError);
      return new Response(JSON.stringify({
        valid: false,
        error: "Session validation failed"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const isValid = adminId !== null;
    console.log("Session validation result:", isValid ? "valid" : "invalid");

    return new Response(JSON.stringify({
      valid: isValid,
      adminId: isValid ? adminId : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Session validation error:", error);
    
    return new Response(JSON.stringify({
      valid: false,
      error: "Internal server error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});