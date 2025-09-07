import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { 
  verifyRegistrationResponse,
  type VerifyRegistrationResponseOpts
} from "https://esm.sh/@simplewebauthn/server@9.0.3";
import type { 
  RegistrationResponseJSON 
} from "https://esm.sh/@simplewebauthn/types@9.0.1";

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

    // Parse request body
    const body = await req.json();
    const { credential, credentialName } = body as {
      credential: RegistrationResponseJSON;
      credentialName?: string;
    };

    if (!credential) {
      return new Response(JSON.stringify({ error: "Missing credential data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Verifying registration for user: ${user.id}`);

    // Get the stored challenge
    const { data: challengeData, error: challengeError } = await supabaseClient
      .from("challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("challenge_type", "registration")
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeData) {
      console.error("Challenge error:", challengeError);
      return new Response(JSON.stringify({ error: "Invalid or expired challenge" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const expectedChallenge = challengeData.challenge;
    const rpID = new URL(Deno.env.get("SUPABASE_URL") ?? "").hostname;
    const expectedOrigin = Deno.env.get("SUPABASE_URL") ?? "";

    // Verify registration response
    const opts: VerifyRegistrationResponseOpts = {
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false
    };

    const verification = await verifyRegistrationResponse(opts);

    if (!verification.verified || !verification.registrationInfo) {
      console.error("Registration verification failed");
      return new Response(JSON.stringify({ 
        error: "Registration verification failed",
        verified: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { registrationInfo } = verification;
    console.log("Registration verified successfully");

    // Store the credential in the database
    const { error: storeError } = await supabaseClient
      .from("user_credentials")
      .insert({
        user_id: user.id,
        credential_id: registrationInfo.credentialID,
        credential_public_key: registrationInfo.credentialPublicKey,
        credential_counter: registrationInfo.counter,
        credential_device_type: registrationInfo.credentialDeviceType,
        credential_backed_up: registrationInfo.credentialBackedUp,
        credential_transports: credential.response.transports || [],
        credential_name: credentialName || "My Passkey",
        last_used: new Date().toISOString()
      });

    if (storeError) {
      console.error("Error storing credential:", storeError);
      return new Response(JSON.stringify({ error: "Failed to store credential" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Mark challenge as used
    await supabaseClient
      .from("challenges")
      .update({ used: true })
      .eq("id", challengeData.id);

    console.log("Credential stored successfully");

    return new Response(JSON.stringify({ 
      verified: true,
      message: "Passkey registered successfully!" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Registration verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});