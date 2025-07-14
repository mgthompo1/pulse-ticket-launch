import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting create-connect-account function");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header found");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Authenticating user...");
    
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) {
      console.error("Auth error:", authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    const user = data.user;
    if (!user) {
      console.error("No user found in auth response");
      throw new Error("User not authenticated");
    }
    
    console.log("User authenticated:", user.id);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not found in environment");
      throw new Error("Stripe configuration missing");
    }
    
    console.log("Stripe key found, initializing Stripe...");
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const requestBody = await req.json();
    console.log("Request body:", requestBody);
    
    const { organizationId } = requestBody;
    if (!organizationId) {
      console.error("No organizationId in request body");
      throw new Error("Organization ID is required");
    }

    console.log("Looking up organization:", organizationId);
    
    // Verify user owns this organization
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (orgError) {
      console.error("Organization lookup error:", orgError);
      throw new Error(`Organization lookup failed: ${orgError.message}`);
    }
    
    if (!org) {
      console.error("Organization not found or unauthorized");
      throw new Error("Organization not found or unauthorized");
    }

    console.log("Organization found:", org.name);

    // Create Stripe Connect account
    console.log("Creating Stripe Connect account...");
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: org.email,
      business_profile: {
        name: org.name,
        url: org.website || undefined,
      },
    });

    console.log("Stripe account created:", account.id);

    // Update organization with Stripe account ID
    console.log("Updating organization with Stripe account ID...");
    const { error: updateError } = await supabaseClient
      .from("organizations")
      .update({ 
        stripe_account_id: account.id,
        stripe_onboarding_complete: false 
      })
      .eq("id", organizationId);

    if (updateError) {
      console.error("Failed to update organization:", updateError);
      throw new Error(`Failed to update organization: ${updateError.message}`);
    }

    console.log("Organization updated successfully");

    // Create account link for onboarding
    console.log("Creating account link...");
    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/dashboard?tab=payments&refresh=true`,
      return_url: `${origin}/dashboard?tab=payments&connected=true`,
      type: "account_onboarding",
    });

    console.log("Account link created:", accountLink.url);

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-connect-account:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});