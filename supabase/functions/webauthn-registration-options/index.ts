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
      .from("user_credentials")
      .select("credential_id")
      .eq("user_id", user.id);

    if (credError) {
      console.error("Error fetching existing credentials:", credError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Prepare registration options
    const rpName = "TicketFlo";
    const rpID = new URL(Deno.env.get("SUPABASE_URL") ?? "").hostname;
    
    const opts: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userName: user.email ?? "",
      userID: new TextEncoder().encode(user.id),
      userDisplayName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      timeout: 60000,
      attestationType: "none",
      excludeCredentials: existingCredentials?.map(cred => ({
        id: new TextEncoder().encode(cred.credential_id),
        type: "public-key",
        transports: ["usb", "ble", "nfc", "internal"]
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
      .from("challenges")
      .insert({
        user_id: user.id,
        challenge: options.challenge,
        challenge_type: "registration",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
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