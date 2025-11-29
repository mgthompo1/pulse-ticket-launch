import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// HubSpot OAuth configuration
const HUBSPOT_CLIENT_ID = Deno.env.get("HUBSPOT_CLIENT_ID");
const HUBSPOT_CLIENT_SECRET = Deno.env.get("HUBSPOT_CLIENT_SECRET");
const HUBSPOT_REDIRECT_URI = Deno.env.get("HUBSPOT_REDIRECT_URI") || "https://ticketflo.org/hubspot-callback";

// HubSpot OAuth scopes
// - crm.objects.contacts.read/write: Read and create/update contacts
// - crm.schemas.contacts.read: Read contact property definitions
// - crm.objects.contacts.read: Read contact lists
const HUBSPOT_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.schemas.contacts.read",
  "oauth",
].join(" ");

interface RequestBody {
  action: "getAuthUrl" | "exchangeCode" | "refreshToken" | "disconnect" | "testConnection";
  organizationId?: string;
  code?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { action, organizationId, code } = body;

    // Validate HubSpot credentials
    if (!HUBSPOT_CLIENT_ID || !HUBSPOT_CLIENT_SECRET) {
      console.error("Missing HubSpot credentials");
      return new Response(
        JSON.stringify({ error: "HubSpot integration not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (action) {
      case "getAuthUrl": {
        if (!organizationId) {
          return new Response(
            JSON.stringify({ error: "Organization ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate state parameter for CSRF protection
        const state = `org_${organizationId}_${Date.now()}`;

        // Build HubSpot authorization URL
        const authUrl = new URL("https://app.hubspot.com/oauth/authorize");
        authUrl.searchParams.set("client_id", HUBSPOT_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", HUBSPOT_REDIRECT_URI);
        authUrl.searchParams.set("scope", HUBSPOT_SCOPES);
        authUrl.searchParams.set("state", state);

        console.log(`Generated HubSpot auth URL for org: ${organizationId}`);

        return new Response(
          JSON.stringify({ authUrl: authUrl.toString(), state }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "exchangeCode": {
        if (!code || !organizationId) {
          return new Response(
            JSON.stringify({ error: "Code and organization ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Exchanging code for org: ${organizationId}`);

        // Exchange authorization code for tokens
        const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: HUBSPOT_CLIENT_ID,
            client_secret: HUBSPOT_CLIENT_SECRET,
            redirect_uri: HUBSPOT_REDIRECT_URI,
            code,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          console.error("Token exchange failed:", errorData);
          return new Response(
            JSON.stringify({ error: "Failed to exchange authorization code", details: errorData }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tokens = await tokenResponse.json();
        console.log("Token exchange successful");

        // Get HubSpot account info
        const accountInfoResponse = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + tokens.access_token);
        let hubId = "";
        let userEmail = "";
        let hubDomain = "";

        if (accountInfoResponse.ok) {
          const accountInfo = await accountInfoResponse.json();
          hubId = accountInfo.hub_id?.toString() || "";
          userEmail = accountInfo.user || "";
          hubDomain = accountInfo.hub_domain || "";
          console.log(`Connected to HubSpot portal: ${hubId}`);
        }

        // Calculate token expiration
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Upsert connection to database
        const { data: connection, error: dbError } = await supabaseAdmin
          .from("hubspot_connections")
          .upsert({
            organization_id: organizationId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt,
            hub_id: hubId,
            hub_domain: hubDomain,
            user_email: userEmail,
            connection_status: "connected",
            last_error: null,
          }, {
            onConflict: "organization_id",
          })
          .select()
          .single();

        if (dbError) {
          console.error("Database error:", dbError);
          return new Response(
            JSON.stringify({ error: "Failed to save connection", details: dbError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log the connection
        await supabaseAdmin.from("hubspot_sync_logs").insert({
          hubspot_connection_id: connection.id,
          operation_type: "connection_test",
          status: "success",
          response_data: { hub_id: hubId, hub_domain: hubDomain },
        });

        return new Response(
          JSON.stringify({
            success: true,
            connection: {
              id: connection.id,
              hubId,
              hubDomain,
              userEmail,
              status: "connected",
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "refreshToken": {
        if (!organizationId) {
          return new Response(
            JSON.stringify({ error: "Organization ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current connection
        const { data: connection, error: fetchError } = await supabaseAdmin
          .from("hubspot_connections")
          .select("*")
          .eq("organization_id", organizationId)
          .single();

        if (fetchError || !connection) {
          return new Response(
            JSON.stringify({ error: "No HubSpot connection found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Refresh the token
        const refreshResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: HUBSPOT_CLIENT_ID,
            client_secret: HUBSPOT_CLIENT_SECRET,
            refresh_token: connection.refresh_token,
          }),
        });

        if (!refreshResponse.ok) {
          const errorData = await refreshResponse.text();
          console.error("Token refresh failed:", errorData);

          // Update connection status
          await supabaseAdmin
            .from("hubspot_connections")
            .update({
              connection_status: "token_expired",
              last_error: "Token refresh failed",
            })
            .eq("id", connection.id);

          return new Response(
            JSON.stringify({ error: "Failed to refresh token", details: errorData }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const newTokens = await refreshResponse.json();
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

        // Update connection with new tokens
        await supabaseAdmin
          .from("hubspot_connections")
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            token_expires_at: newExpiresAt,
            connection_status: "connected",
            last_error: null,
          })
          .eq("id", connection.id);

        // Log the refresh
        await supabaseAdmin.from("hubspot_sync_logs").insert({
          hubspot_connection_id: connection.id,
          operation_type: "token_refresh",
          status: "success",
        });

        console.log(`Token refreshed for org: ${organizationId}`);

        return new Response(
          JSON.stringify({ success: true, expiresAt: newExpiresAt }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disconnect": {
        if (!organizationId) {
          return new Response(
            JSON.stringify({ error: "Organization ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete the connection (cascades to mappings, logs, etc.)
        const { error: deleteError } = await supabaseAdmin
          .from("hubspot_connections")
          .delete()
          .eq("organization_id", organizationId);

        if (deleteError) {
          console.error("Disconnect error:", deleteError);
          return new Response(
            JSON.stringify({ error: "Failed to disconnect" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Clear hubspot_contact_id from contacts
        await supabaseAdmin
          .from("contacts")
          .update({ hubspot_contact_id: null })
          .eq("organization_id", organizationId);

        console.log(`Disconnected HubSpot for org: ${organizationId}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "testConnection": {
        if (!organizationId) {
          return new Response(
            JSON.stringify({ error: "Organization ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get connection
        const { data: connection, error: fetchError } = await supabaseAdmin
          .from("hubspot_connections")
          .select("*")
          .eq("organization_id", organizationId)
          .single();

        if (fetchError || !connection) {
          return new Response(
            JSON.stringify({ error: "No HubSpot connection found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if token needs refresh
        const tokenExpiresAt = new Date(connection.token_expires_at);
        const now = new Date();
        const bufferMinutes = 5;

        let accessToken = connection.access_token;

        if (tokenExpiresAt.getTime() - now.getTime() < bufferMinutes * 60 * 1000) {
          // Token is about to expire, refresh it
          const refreshResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              client_id: HUBSPOT_CLIENT_ID,
              client_secret: HUBSPOT_CLIENT_SECRET,
              refresh_token: connection.refresh_token,
            }),
          });

          if (refreshResponse.ok) {
            const newTokens = await refreshResponse.json();
            accessToken = newTokens.access_token;

            // Update tokens in database
            await supabaseAdmin
              .from("hubspot_connections")
              .update({
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token,
                token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
              })
              .eq("id", connection.id);
          }
        }

        // Test the connection by fetching contact count
        const testResponse = await fetch(
          "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!testResponse.ok) {
          const errorData = await testResponse.text();
          console.error("Connection test failed:", errorData);

          await supabaseAdmin
            .from("hubspot_connections")
            .update({
              connection_status: "error",
              last_error: "API test failed",
            })
            .eq("id", connection.id);

          await supabaseAdmin.from("hubspot_sync_logs").insert({
            hubspot_connection_id: connection.id,
            operation_type: "connection_test",
            status: "failed",
            error_message: errorData,
          });

          return new Response(
            JSON.stringify({ error: "Connection test failed", details: errorData }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const testData = await testResponse.json();

        // Update connection status
        await supabaseAdmin
          .from("hubspot_connections")
          .update({
            connection_status: "connected",
            last_error: null,
          })
          .eq("id", connection.id);

        await supabaseAdmin.from("hubspot_sync_logs").insert({
          hubspot_connection_id: connection.id,
          operation_type: "connection_test",
          status: "success",
          response_data: { total_contacts: testData.total },
        });

        return new Response(
          JSON.stringify({
            success: true,
            hubId: connection.hub_id,
            hubDomain: connection.hub_domain,
            totalContacts: testData.total,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("HubSpot auth error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
