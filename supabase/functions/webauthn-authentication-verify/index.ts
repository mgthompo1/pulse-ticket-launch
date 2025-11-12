import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  verifyAuthenticationResponse,
  type VerifyAuthenticationResponseOpts
} from "https://esm.sh/@simplewebauthn/server@9.0.3";
import type {
  AuthenticationResponseJSON
} from "https://esm.sh/@simplewebauthn/types@9.0.1";
import { decode as base64urlDecode } from "https://deno.land/std@0.190.0/encoding/base64url.ts";

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
    const { email, credential } = body as {
      email: string;
      credential: AuthenticationResponseJSON;
    };

    if (!email || !credential) {
      return new Response(JSON.stringify({ error: "Missing email or credential data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Use service role client for user operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Verifying authentication for email: ${email}`);

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

    // Get the stored challenge
    const { data: challengeData, error: challengeError } = await supabaseClient
      .rpc("webauthn_get_challenge", {
        p_user_id: user.id,
        p_challenge_type: "authentication"
      })
      .single();

    if (challengeError || !challengeData) {
      console.error("Challenge error:", challengeError);
      return new Response(JSON.stringify({ error: "Invalid or expired challenge" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the credential used for this authentication
    const credentialID = credential.id;
    const { data: storedCredential, error: credError } = await supabaseClient
      .rpc("webauthn_get_credential", {
        p_credential_id: credentialID
      })
      .single();

    if (credError || !storedCredential) {
      console.error("Credential lookup error:", credError);
      return new Response(JSON.stringify({ error: "Credential not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const expectedChallenge = (challengeData as any).challenge;

    // Get the origin from the request to determine the correct RP ID and expected origin
    const origin = req.headers.get("origin") || req.headers.get("referer");
    let rpID = "localhost"; // Default for development
    let expectedOrigin = "http://localhost:8081"; // Default for development

    if (origin) {
      try {
        const originUrl = new URL(origin);
        rpID = originUrl.hostname;
        expectedOrigin = origin;
        console.log(`Using RP ID from origin: ${rpID}, expected origin: ${expectedOrigin}`);
      } catch (error) {
        console.log("Could not parse origin, using localhost");
        rpID = "localhost";
        expectedOrigin = "http://localhost:8081";
      }
    }

    // Verify authentication response
    const credentialIDBuffer = (() => {
      try {
        return base64urlDecode(
          typeof (storedCredential as any).credential_id === "string"
            ? (storedCredential as any).credential_id
            : credentialID
        );
      } catch (decodeError) {
        console.error("Failed to decode stored credential id:", decodeError);
        throw new Error("Stored credential is invalid");
      }
    })();

    const credentialPublicKeyData = (storedCredential as any).credential_public_key;
    const credentialPublicKey = (() => {
      if (credentialPublicKeyData instanceof Uint8Array) {
        return credentialPublicKeyData;
      }
      if (Array.isArray(credentialPublicKeyData)) {
        return new Uint8Array(credentialPublicKeyData);
      }
      if (credentialPublicKeyData?.type === "Buffer" && Array.isArray(credentialPublicKeyData.data)) {
        return new Uint8Array(credentialPublicKeyData.data);
      }
      if (typeof credentialPublicKeyData === "string" && credentialPublicKeyData.startsWith("\\x")) {
        const hex = credentialPublicKeyData.slice(2);
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
      }
      throw new Error("Unsupported credential public key format");
    })();

    const opts: VerifyAuthenticationResponseOpts = {
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: credentialIDBuffer,
        credentialPublicKey,
        counter: Number((storedCredential as any).credential_counter) || 0,
        transports: Array.isArray((storedCredential as any).credential_transports)
          ? (storedCredential as any).credential_transports
          : []
      },
      requireUserVerification: false
    };

    const verification = await verifyAuthenticationResponse(opts);

    if (!verification.verified) {
      console.error("Authentication verification failed");
      return new Response(JSON.stringify({ 
        error: "Authentication verification failed",
        verified: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Authentication verified successfully");

    // Update credential counter and last used
    const { error: updateError } = await supabaseClient
      .rpc("webauthn_update_counter", {
        p_credential_id: credentialID,
        p_new_counter: verification.authenticationInfo?.newCounter || 0
      });

    if (updateError) {
      console.error("Error updating credential:", updateError);
      // Don't fail the authentication for this
    }

    // Mark challenge as used
    await supabaseClient
      .rpc("webauthn_mark_challenge_used", {
        p_challenge_id: (challengeData as any).id
      });

    // Create a session for the user
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
      options: {
        redirectTo: `${Deno.env.get("SUPABASE_URL")}/dashboard`
      }
    });

    if (sessionError || !sessionData) {
      console.error("Session creation error:", sessionError);
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const sessionProperties = (sessionData as any).properties ?? sessionData;
    const actionLink = sessionProperties?.action_link ?? (sessionData as any)?.action_link;

    if (!actionLink) {
      console.error("Magic link action URL not available in session response");
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let token: string | null = null;
    try {
      const actionUrl = new URL(actionLink);
      token = actionUrl.searchParams.get("token");
    } catch (parseError) {
      console.error("Failed to parse action link for token:", parseError);
    }

    if (!token) {
      console.error("Magic link token missing from action link");
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Session created successfully");

    return new Response(JSON.stringify({ 
      verified: true,
      message: "Authentication successful!",
      token,
      email: user.email,
      redirectTo: sessionProperties?.redirect_to ?? `${Deno.env.get("SUPABASE_URL")}/dashboard`,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Authentication verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});