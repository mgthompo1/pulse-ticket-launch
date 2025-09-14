import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { 
  verifyAuthenticationResponse,
  type VerifyAuthenticationResponseOpts
} from "https://esm.sh/@simplewebauthn/server@9.0.3";
import type { 
  AuthenticationResponseJSON 
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
      .from("challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("challenge_type", "authentication")
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

    // Get the credential used for this authentication
    const credentialID = credential.id;
    const { data: storedCredential, error: credError } = await supabaseClient
      .from("user_credentials")
      .select("*")
      .eq("user_id", user.id)
      .eq("credential_id", credentialID)
      .single();

    if (credError || !storedCredential) {
      console.error("Credential lookup error:", credError);
      return new Response(JSON.stringify({ error: "Credential not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const expectedChallenge = challengeData.challenge;
    const rpID = new URL(Deno.env.get("SUPABASE_URL") ?? "").hostname;
    const expectedOrigin = Deno.env.get("SUPABASE_URL") ?? "";

    // Verify authentication response
    const opts: VerifyAuthenticationResponseOpts = {
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: typeof storedCredential.credential_id === 'string'
          ? new TextEncoder().encode(storedCredential.credential_id)
          : storedCredential.credential_id,
        credentialPublicKey: new Uint8Array(storedCredential.credential_public_key),
        counter: Number(storedCredential.credential_counter) || 0,
        transports: Array.isArray(storedCredential.credential_transports)
          ? storedCredential.credential_transports
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
      .from("user_credentials")
      .update({
        credential_counter: verification.authenticationInfo?.newCounter || 0,
        last_used: new Date().toISOString()
      })
      .eq("id", storedCredential.id);

    if (updateError) {
      console.error("Error updating credential:", updateError);
      // Don't fail the authentication for this
    }

    // Mark challenge as used
    await supabaseClient
      .from("challenges")
      .update({ used: true })
      .eq("id", challengeData.id);

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

    console.log("Session created successfully");

    return new Response(JSON.stringify({ 
      verified: true,
      message: "Authentication successful!",
      accessToken: (sessionData.properties as any)?.access_token,
      refreshToken: (sessionData.properties as any)?.refresh_token,
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