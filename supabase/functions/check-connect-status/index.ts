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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { organizationId } = await req.json();

    // Get organization with Stripe account ID
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (orgError || !org || !org.stripe_account_id) {
      return new Response(JSON.stringify({ 
        connected: false, 
        charges_enabled: false,
        details_submitted: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check Stripe account status
    const account = await stripe.accounts.retrieve(org.stripe_account_id);

    const isComplete = account.charges_enabled && account.details_submitted;

    // Update organization status if changed
    if (isComplete !== org.stripe_onboarding_complete) {
      await supabaseClient
        .from("organizations")
        .update({ stripe_onboarding_complete: isComplete })
        .eq("id", organizationId);
    }

    return new Response(JSON.stringify({
      connected: true,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      onboarding_complete: isComplete,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});