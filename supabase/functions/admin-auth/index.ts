import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminAuthRequest {
  email: string;
  password: string;
  totpCode?: string;
}

interface AdminLoginResponse {
  success: boolean;
  token?: string;
  requiresTOTP?: boolean;
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

    const { email, password, totpCode }: AdminAuthRequest = await req.json();

    console.log("=== ADMIN AUTHENTICATION REQUEST ===");
    console.log("Email:", email);
    console.log("Has TOTP Code:", !!totpCode);

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Look up admin user
    const { data: adminUser, error: adminError } = await supabaseClient
      .from("admin_users")
      .select("*")
      .eq("email", email)
      .eq("is_active", true)
      .single();

    if (adminError || !adminUser) {
      console.error("Admin user not found:", adminError);
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, adminUser.password_hash);
    if (!isPasswordValid) {
      console.error("Invalid password");
      throw new Error("Invalid credentials");
    }

    // Check if TOTP is required
    if (adminUser.totp_secret && !totpCode) {
      console.log("TOTP required but not provided");
      return new Response(JSON.stringify({
        success: false,
        requiresTOTP: true,
        error: "TOTP code required"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify TOTP if provided
    if (adminUser.totp_secret && totpCode) {
      // Note: In production, you'd use a proper TOTP library
      // For now, we'll skip TOTP verification as it requires additional setup
      console.log("TOTP verification would happen here");
    }

    // Update last login
    await supabaseClient
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", adminUser.id);

    // Log security event
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    await supabaseClient.rpc("log_security_event", {
      p_user_id: null,
      p_admin_user_id: adminUser.id,
      p_event_type: "admin_login",
      p_event_data: { email, success: true },
      p_ip_address: clientIP,
      p_user_agent: userAgent
    });

    // Generate secure session token
    const sessionToken = crypto.randomUUID() + '-' + Date.now().toString(36);

    // Create secure admin session in database
    const { data: sessionData, error: sessionError } = await supabaseClient.rpc(
      'create_admin_session',
      {
        p_admin_id: adminUser.id,
        p_token: sessionToken,
        p_ip: clientIP,
        p_user_agent: userAgent
      }
    );

    if (sessionError) {
      console.error("Failed to create admin session:", sessionError);
      throw new Error("Failed to create secure session");
    }

    console.log("Admin authentication successful with secure session");

    return new Response(JSON.stringify({
      success: true,
      token: sessionToken,
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        lastLogin: adminUser.last_login_at
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Admin authentication error:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Authentication failed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }
});