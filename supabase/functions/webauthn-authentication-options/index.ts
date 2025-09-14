import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { 
  generateAuthenticationOptions,
  type GenerateAuthenticationOptionsOpts
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
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Use service role client to look up user and credentials
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Generating authentication options for email: ${email}`);

    // Get user by email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
    const user = userData?.users.find(u => u.email === email);

    if (userError || !user) {
      console.error("User lookup error:", userError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get user's credentials using RPC function
    const { data: credentialsData, error: credError } = await supabaseClient
      .rpc('webauthn_get_user_credentials', { p_user_id: user.id });
    
    const userCredentials = credentialsData || [];

    if (credError) {
      console.error("Error fetching user credentials:", credError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!userCredentials || userCredentials.length === 0) {
      return new Response(JSON.stringify({ error: "No passkeys found for this user" }), {
        status: 404,
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

    // Prepare authentication options
    const opts: GenerateAuthenticationOptionsOpts = {
      rpID,
      timeout: 60000,
      allowCredentials: userCredentials.map((cred: any) => ({
        id: new TextEncoder().encode(cred.credential_id),
        type: "public-key",
        transports: cred.credential_transports || ["internal", "usb", "ble", "nfc"]
      })),
      userVerification: "preferred"
    };

    const options = await generateAuthenticationOptions(opts);

    console.log("Authentication options generated successfully");

    // Store the challenge for verification
    const { error: challengeError } = await supabaseClient
      .rpc('webauthn_insert_challenge', {
        p_user_id: user.id,
        p_challenge: options.challenge,
        p_challenge_type: "authentication",
        p_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      });

    if (challengeError) {
      console.error("Error storing challenge:", challengeError);
      return new Response(JSON.stringify({ error: "Failed to store challenge" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      ...options,
      userExists: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Authentication options error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});