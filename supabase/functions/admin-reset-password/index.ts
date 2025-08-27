import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminPasswordResetRequest {
  email: string;
  newPassword: string;
  adminToken: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== ADMIN PASSWORD RESET FUNCTION STARTED ===");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { email, newPassword, adminToken }: AdminPasswordResetRequest = await req.json();

    console.log("Admin password reset request for:", email);

    if (!email || !newPassword || !adminToken) {
      throw new Error("Email, new password, and admin token are required");
    }

    // Validate admin session
    console.log("Validating admin session...");
    const { data: adminSession, error: adminError } = await supabaseClient.rpc(
      'validate_admin_session',
      { token: adminToken }
    );

    if (adminError || !adminSession) {
      console.error("Invalid admin session:", adminError);
      throw new Error("Unauthorized: Invalid admin session");
    }

    console.log("Admin session validated, proceeding with password reset");

    // Get user by email
    const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error fetching users:", userError);
      throw new Error("Failed to fetch user");
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      throw new Error("User not found");
    }

    console.log("User found, updating password...");

    // Update user password
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Failed to update password");
    }

    // Log security event
    const clientIP = req.headers.get("x-forwarded-for")?.split(',')[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    try {
      await supabaseClient.rpc("log_security_event", {
        p_user_id: user.id,
        p_admin_user_id: adminSession,
        p_event_type: "admin_password_reset",
        p_event_data: { email, admin_initiated: true },
        p_ip_address: clientIP,
        p_user_agent: userAgent
      });
      console.log("Security event logged successfully");
    } catch (logError) {
      console.error("Failed to log security event:", logError);
    }

    console.log("Password reset successful for:", email);

    return new Response(JSON.stringify({
      success: true,
      message: "Password updated successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== ADMIN PASSWORD RESET ERROR ===");
    console.error("Error details:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Password reset failed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});