import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== FUNCTION STARTED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const Stripe = await import("https://esm.sh/stripe@14.21.0");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    
    console.log("=== GETTING SECRET KEY ===");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get organization first
    const { data: org } = await supabaseClient
      .from("organizations")
      .select("id")
      .eq("name", "Mitchs Ticket Company")
      .single();

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get payment credentials
    const { data: credentials } = await supabaseClient
      .from("payment_credentials")
      .select("stripe_secret_key")
      .eq("organization_id", org.id)
      .single();

    if (!credentials?.stripe_secret_key) {
      throw new Error("No Stripe secret key found");
    }

    console.log("=== TESTING STRIPE KEY ===");
    const stripe = new Stripe.default(credentials.stripe_secret_key, {
      apiVersion: "2023-10-16",
    });

    console.log("=== CREATING SIMPLE PAYMENT INTENT ===");
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // $10.00
      currency: "usd",
      metadata: {
        test: "simple_payment"
      },
    });

    console.log("Payment intent created:", paymentIntent.id);

    return new Response(JSON.stringify({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("=== ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error type:", error.constructor.name);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      type: error.constructor.name
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});