import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== FUNCTION STARTED ===");

  if (req.method === "OPTIONS") {
    console.log("OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Reading request body...");
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody));

    const { sessionId, eventId } = requestBody;
    console.log("SessionId:", sessionId);
    console.log("EventId:", eventId);

    if (!sessionId || !eventId) {
      console.log("Missing parameters");
      throw new Error("Missing required parameters");
    }

    // For now, just return a simple success to test if the function works at all
    console.log("Returning success");
    return new Response(JSON.stringify({
      success: true,
      message: "Function is working",
      receivedSessionId: sessionId,
      receivedEventId: eventId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});