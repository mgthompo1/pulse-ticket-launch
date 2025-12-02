import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidatePasskeyRequest {
  slug: string;
  passkey: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { slug, passkey }: ValidatePasskeyRequest = await req.json();

    if (!slug || !passkey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing slug or passkey",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Validating passkey for group slug:", slug);

    // Fetch group by slug and compare passkey server-side
    const { data: group, error: groupError } = await supabaseClient
      .from("groups")
      .select("id, name, passkey, is_active")
      .eq("url_slug", slug)
      .single();

    if (groupError) {
      console.error("Error fetching group:", groupError);
      if (groupError.code === "PGRST116") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Group not found",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          }
        );
      }
      throw groupError;
    }

    if (!group.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This group has been deactivated",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    if (!group.passkey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This group has not set up a passkey yet",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Secure comparison (case-sensitive)
    const isValid = group.passkey === passkey;

    if (!isValid) {
      // Log failed attempt for security monitoring
      await supabaseClient.from("group_activity_log").insert({
        group_id: group.id,
        action: "passkey_failed",
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Incorrect passkey",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Log successful access
    await supabaseClient.from("group_activity_log").insert({
      group_id: group.id,
      action: "portal_accessed",
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });

    // Generate a simple session token (hash of group id + timestamp)
    const sessionToken = btoa(`${group.id}:${Date.now()}`);

    return new Response(
      JSON.stringify({
        success: true,
        groupId: group.id,
        groupName: group.name,
        sessionToken,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in validate-group-passkey:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An error occurred while validating passkey",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
