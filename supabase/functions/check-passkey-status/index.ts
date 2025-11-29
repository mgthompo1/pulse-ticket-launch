import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Use service role client to look up user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user by email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
    const user = userData?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      return new Response(JSON.stringify({
        hasPasskeys: false,
        passkeyCount: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if user has passkeys using RPC function
    const { data: credentialsData, error: credError } = await supabaseClient
      .rpc('webauthn_get_user_credentials', { p_user_id: user.id });

    if (credError) {
      console.error("Error checking passkeys:", credError);
      return new Response(JSON.stringify({
        hasPasskeys: false,
        passkeyCount: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const passkeyCount = credentialsData?.length || 0;

    return new Response(JSON.stringify({
      hasPasskeys: passkeyCount > 0,
      passkeyCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Check passkey status error:", error);
    return new Response(JSON.stringify({
      hasPasskeys: false,
      passkeyCount: 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
