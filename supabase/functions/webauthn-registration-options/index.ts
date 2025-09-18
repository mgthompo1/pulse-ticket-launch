import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { 
  generateRegistrationOptions,
  type GenerateRegistrationOptionsOpts
} from "https://esm.sh/@simplewebauthn/server@9.0.3";

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
    // Get user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { 
        auth: { persistSession: false },
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Generating registration options for user: ${user.id}`);

    // Get existing credentials to exclude from registration
    const { data: existingCredentials, error: credError } = await supabaseClient
      .rpc("webauthn_get_existing_credentials", { p_user_id: user.id });

    if (credError) {
      console.error("Error fetching existing credentials:", credError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the origin from the request to determine the correct RP ID
    const origin = req.headers.get("origin") || req.headers.get("referer");
    let rpID = "localhost"; // Default for development
    
    if (origin) {
      try {
        rpID = new URL(origin).hostname;
        console.log(`Using RP ID from origin: ${rpID}`);
      } catch (error) {
        console.log("Could not parse origin, using localhost");
        rpID = "localhost";
      }
    }

    // Prepare registration options
    const rpName = "TicketFlo";
    
    const opts: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userName: user.email ?? "",
      userID: user.id,
      userDisplayName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      timeout: 60000,
      attestationType: "none",
      excludeCredentials: existingCredentials?.map((cred: any) => ({
        id: new TextEncoder().encode(cred.credential_id),
        type: "public-key",
        transports: ["internal"]
      })) || [],
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform"
      },
      supportedAlgorithmIDs: [-7, -257] // ES256 and RS256
    };

    const options = await generateRegistrationOptions(opts);

    console.log("Registration options generated successfully");

    // Store the challenge for verification
    const { error: challengeError } = await supabaseClient
      .rpc("webauthn_store_challenge", {
        p_user_id: user.id,
        p_challenge: options.challenge,
        p_challenge_type: "registration",
        p_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      });

    if (challengeError) {
      console.error("Error storing challenge:", challengeError);
      return new Response(JSON.stringify({ error: "Failed to store challenge" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Registration options error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});