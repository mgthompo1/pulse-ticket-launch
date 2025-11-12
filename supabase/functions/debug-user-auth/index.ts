import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log("🔍 Debugging user auth for:", email);

    // Initialize Supabase with service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Check auth.users table
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw authError;
    }

    const user = authUsers.users.find((u) => u.email === email);

    if (!user) {
      return new Response(
        JSON.stringify({
          found: false,
          message: `No user found with email: ${email}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("✅ User found in auth.users:", user.id);

    // Check if email is confirmed
    const emailConfirmed = !!user.email_confirmed_at;
    console.log("Email confirmed:", emailConfirmed, user.email_confirmed_at);

    // Check if user is in organizations table
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, email")
      .eq("email", email);

    console.log("Organizations found:", orgData?.length || 0);

    // Check if user has any organization memberships
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id);

    console.log("Memberships found:", memberships?.length || 0);

    return new Response(
      JSON.stringify({
        found: true,
        user: {
          id: user.id,
          email: user.email,
          email_confirmed: emailConfirmed,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata,
        },
        organizations: orgData || [],
        memberships: memberships || [],
        issues: [
          !emailConfirmed && "❌ Email not confirmed",
          !orgData?.length && !memberships?.length && "⚠️ No organizations or memberships found",
        ].filter(Boolean),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to debug user auth",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
