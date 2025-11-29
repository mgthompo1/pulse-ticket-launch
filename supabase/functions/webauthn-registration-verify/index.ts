import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  verifyRegistrationResponse,
  type VerifyRegistrationResponseOpts
} from "https://esm.sh/@simplewebauthn/server@9.0.3";
import type {
  RegistrationResponseJSON
} from "https://esm.sh/@simplewebauthn/types@9.0.1";
import { encode as base64urlEncode } from "https://deno.land/std@0.190.0/encoding/base64url.ts";

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
      .rpc("webauthn_get_challenge", {
        p_user_id: user.id,
        p_challenge_type: "registration"
      })
      .single();

    if (challengeError || !challengeData) {
      console.error("Challenge error:", challengeError);
      return new Response(JSON.stringify({ error: "Invalid or expired challenge" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const expectedChallenge = (challengeData as any).challenge;

    // Use canonical rpID - always ticketflo.org regardless of www subdomain
    // This ensures passkeys work across both www.ticketflo.org and ticketflo.org
    const origin = req.headers.get("origin") || req.headers.get("referer");
    let rpID = "localhost"; // Default for development
    let expectedOrigin = "http://localhost:8081"; // Default for development

    if (origin) {
      try {
        const originUrl = new URL(origin);
        const hostname = originUrl.hostname;
        // Use canonical domain (strip www prefix)
        if (hostname.includes("ticketflo.org")) {
          rpID = "ticketflo.org";
          // Accept both www and non-www origins
          expectedOrigin = origin;
        } else {
          rpID = hostname;
          expectedOrigin = origin;
        }
        console.log(`Using canonical RP ID: ${rpID} (origin was: ${hostname}), expected origin: ${expectedOrigin}`);
      } catch (error) {
        console.log("Could not parse origin, using localhost");
        rpID = "localhost";
        expectedOrigin = "http://localhost:8081";
      }
    }

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
    const credentialID = base64urlEncode(registrationInfo.credentialID);
    const credentialPublicKey = registrationInfo.credentialPublicKey instanceof Uint8Array
      ? registrationInfo.credentialPublicKey
      : new Uint8Array(registrationInfo.credentialPublicKey);

    const { error: storeError } = await supabaseClient
      .rpc("webauthn_store_credential", {
        p_user_id: user.id,
        p_credential_id: credentialID,
        p_credential_public_key: credentialPublicKey,
        p_credential_counter: Number(registrationInfo.counter) || 0,
        p_credential_device_type: registrationInfo.credentialDeviceType || "unknown",
        p_credential_backed_up: Boolean(registrationInfo.credentialBackedUp),
        p_credential_transports: Array.isArray(credential.response.transports)
          ? credential.response.transports.filter((t) =>
            ["internal", "hybrid", "usb", "nfc", "ble"].includes(t)
          )
          : ["internal"],
        p_credential_name: credentialName || "My Passkey"
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
      .rpc("webauthn_mark_challenge_used", {
        p_challenge_id: (challengeData as any).id
      });

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