import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== FUNCTION STARTED - BASIC VERSION ===");

  if (req.method === "OPTIONS") {
    console.log("OPTIONS request received");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing POST request...");
    
    // Test basic request handling
    const url = new URL(req.url);
    console.log("Request URL:", url.toString());
    
    let requestBody;
    try {
      console.log("Reading request body...");
      requestBody = await req.json();
      console.log("Request body received:", JSON.stringify(requestBody));
    } catch (bodyError) {
      console.log("Error reading body:", bodyError.message);
      throw new Error(`Body parse error: ${bodyError.message}`);
    }

    const { sessionId, eventId } = requestBody;
    console.log("Extracted - SessionId:", sessionId, "EventId:", eventId);

    // Test environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log("Environment check - URL exists:", !!supabaseUrl, "Service key exists:", !!serviceKey);

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Don't import Supabase client yet, just test basic functionality
    console.log("Basic validation passed");

    return new Response(JSON.stringify({
      success: true,
      message: "Basic function test successful",
      receivedSessionId: sessionId,
      receivedEventId: eventId,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== FUNCTION ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});