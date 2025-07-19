import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

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

    const { action, code, state, organizationId } = await req.json();

    const clientId = Deno.env.get("XERO_CLIENT_ID");
    const clientSecret = Deno.env.get("XERO_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Xero credentials not configured");
    }

    if (action === "getAuthUrl") {
      // Generate authorization URL
      const redirectUri = `${req.headers.get("origin")}/xero-callback`;
      const scope = "accounting.transactions accounting.contacts accounting.settings";
      const stateParam = `org_${organizationId}_${Date.now()}`;
      
      const authUrl = `https://login.xero.com/identity/connect/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${stateParam}`;

      return new Response(JSON.stringify({ authUrl, state: stateParam }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "exchangeCode") {
      // Exchange authorization code for tokens
      const redirectUri = `${req.headers.get("origin")}/xero-callback`;
      
      const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("Token exchange failed:", error);
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokens = await tokenResponse.json();

      // Get tenant information
      const connectionsResponse = await fetch("https://api.xero.com/connections", {
        headers: {
          "Authorization": `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json"
        }
      });

      if (!connectionsResponse.ok) {
        const errorText = await connectionsResponse.text();
        console.error("Failed to fetch Xero connections:", errorText);
        throw new Error("Failed to fetch Xero connections");
      }

      const connections = await connectionsResponse.json();
      
      if (!connections || connections.length === 0) {
        throw new Error("No Xero organizations found");
      }

      // Save connection for the first organization (or let user choose)
      const connection = connections[0];
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

      // Extract organization ID from state parameter
      const orgId = state.split('_')[1];

      if (!orgId) {
        throw new Error("Invalid state parameter");
      }

      const { error: insertError } = await supabaseClient
        .from("xero_connections")
        .upsert({
          organization_id: orgId,
          tenant_id: connection.tenantId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          connection_status: "connected",
          sync_settings: {
            auto_create_invoices: true,
            sync_customers: true,
            sync_products: false
          }
        }, { 
          onConflict: 'organization_id,tenant_id' 
        });

      if (insertError) {
        console.error("Error saving Xero connection:", insertError);
        throw new Error("Failed to save Xero connection");
      }

      return new Response(JSON.stringify({ 
        success: true, 
        tenantName: connection.tenantName,
        tenantId: connection.tenantId
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action");

  } catch (error) {
    console.error("Xero auth error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});