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

    console.log("🔧 Fixing organization membership for:", email);

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

    // Get user from auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const user = authUsers.users.find((u) => u.email === email);
    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    console.log("✅ User found:", user.id);

    // Get all organizations for this email
    const { data: orgs, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: true }); // Oldest first

    if (orgError) throw orgError;

    console.log(`Found ${orgs.length} organization(s)`);

    if (orgs.length === 0) {
      throw new Error("No organizations found for this email");
    }

    // Use the oldest organization (first one created)
    const primaryOrg = orgs[0];
    console.log("Primary organization:", primaryOrg.id, primaryOrg.name);

    // Skip duplicate deletion for now - focus on creating membership
    let duplicatesRemoved = 0;
    if (orgs.length > 1) {
      console.log("⚠️  Warning: Found", orgs.length, "organizations - will create membership for oldest one");
      // TODO: Clean up duplicates later via dashboard
    }

    // Check if membership already exists
    const { data: existingMembership } = await supabaseAdmin
      .from("organization_members")
      .select("*")
      .eq("organization_id", primaryOrg.id)
      .eq("user_id", user.id)
      .single();

    if (existingMembership) {
      console.log("✅ Membership already exists");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Membership already exists",
          organization: primaryOrg,
          membership: existingMembership,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create organization membership
    console.log("Creating organization_members record...");
    const { data: membership, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: primaryOrg.id,
        user_id: user.id,
        role: "owner", // Set as owner since they signed up for this org
      })
      .select()
      .single();

    if (memberError) {
      console.error("Error creating membership:", memberError);
      throw memberError;
    }

    console.log("✅ Membership created successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Organization membership created successfully",
        organization: primaryOrg,
        membership: membership,
        duplicatesFound: orgs.length - 1,
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
        error: error.message || "Failed to fix user organization membership",
        details: error.toString(),
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
