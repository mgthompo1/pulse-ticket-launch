import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a secure token
async function generateToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Hash a token for secure storage
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

    const { code, client_id, client_secret, grant_type } = await req.json();

    // Validate request
    if (grant_type !== "authorization_code") {
      return new Response(
        JSON.stringify({ error: "unsupported_grant_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (client_id !== "givvv") {
      return new Response(
        JSON.stringify({ error: "invalid_client" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate client secret (should match env var)
    const expectedSecret = Deno.env.get("GIVVV_CLIENT_SECRET");
    if (!expectedSecret || client_secret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "invalid_client", error_description: "Invalid client credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: "invalid_request", error_description: "Missing authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the authorization code
    const { data: authCode, error: codeError } = await supabaseClient
      .from("integration_auth_codes")
      .select("*")
      .eq("code", code)
      .eq("partner_platform", "givvv")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (codeError || !authCode) {
      console.error("Auth code lookup failed:", codeError);
      return new Response(
        JSON.stringify({ error: "invalid_grant", error_description: "Invalid or expired authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark the auth code as used
    await supabaseClient
      .from("integration_auth_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", authCode.id);

    // Generate a new access token
    const accessToken = await generateToken();
    const tokenHash = await hashToken(accessToken);

    // Deactivate any existing tokens for this org/platform
    await supabaseClient
      .from("integration_tokens")
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq("organization_id", authCode.organization_id)
      .eq("partner_platform", "givvv")
      .eq("is_active", true);

    // Create the new token
    const { error: tokenError } = await supabaseClient
      .from("integration_tokens")
      .insert({
        organization_id: authCode.organization_id,
        partner_platform: "givvv",
        access_token: accessToken,
        token_hash: tokenHash,
        scopes: authCode.scopes,
        is_active: true,
      });

    if (tokenError) {
      console.error("Token creation failed:", tokenError);
      return new Response(
        JSON.stringify({ error: "server_error", error_description: "Failed to create access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization info to return
    const { data: org } = await supabaseClient
      .from("organizations")
      .select("id, name")
      .eq("id", authCode.organization_id)
      .single();

    // Return the token response (OAuth 2.0 format)
    return new Response(
      JSON.stringify({
        access_token: accessToken,
        token_type: "Bearer",
        scope: authCode.scopes.join(" "),
        organization_id: authCode.organization_id,
        organization_name: org?.name || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Token exchange error:", error);
    return new Response(
      JSON.stringify({ error: "server_error", error_description: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
