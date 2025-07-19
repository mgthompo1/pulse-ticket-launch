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
    console.log("=== TESTING STRIPE IMPORT ===");
    const Stripe = await import("https://esm.sh/stripe@14.21.0");
    console.log("Stripe imported successfully");
    
    console.log("=== PARSING REQUEST ===");
    const requestBody = await req.json();
    const { eventId } = requestBody;
    console.log("Event ID:", eventId);
    
    console.log("=== TESTING SUPABASE ===");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    console.log("Supabase client created");

    console.log("=== TESTING EVENT FETCH ===");
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("id, name, organizations!inner(stripe_secret_key)")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      console.error("Event fetch error:", eventError);
      throw new Error(`Event fetch failed: ${eventError.message}`);
    }
    
    if (!event) {
      console.error("Event not found");
      throw new Error("Event not found");
    }
    
    console.log("Event found:", event.name);
    
    const secretKey = event.organizations.stripe_secret_key;
    if (!secretKey) {
      console.error("No secret key");
      throw new Error("No Stripe secret key configured");
    }
    
    console.log("Secret key exists, length:", secretKey.length);
    
    console.log("=== TESTING STRIPE CLIENT ===");
    const stripe = new Stripe.default(secretKey, {
      apiVersion: "2023-10-16",
    });
    console.log("Stripe client created successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "All components working",
      eventName: event.name,
      hasSecretKey: !!secretKey
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("=== ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});