import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-EVENT-GENERATOR] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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

    const { eventType, industry, audience, duration } = await req.json();
    logStep("Request data", { eventType, industry, audience, duration });

    // Mock AI response for now - replace with actual OpenAI call
    const aiResponse = {
      name: `${eventType} for ${industry} Professionals`,
      description: `Join us for an exciting ${eventType.toLowerCase()} focused on ${industry.toLowerCase()} industry trends. Perfect for ${audience.toLowerCase()} looking to network and learn about the latest innovations. This ${duration}-long event will feature expert speakers, interactive sessions, and valuable networking opportunities.`,
      suggestedTicketTypes: [
        {
          name: "Early Bird",
          price: 49,
          description: "Limited time offer for early registrants"
        },
        {
          name: "General Admission", 
          price: 79,
          description: "Standard entry to all sessions"
        },
        {
          name: "VIP Experience",
          price: 149,
          description: "Premium seating plus exclusive networking session"
        }
      ],
      suggestedCapacity: audience === "Large audience" ? 500 : audience === "Medium audience" ? 200 : 50,
      marketingTips: [
        `Target ${audience.toLowerCase()} in the ${industry.toLowerCase()} sector`,
        `Emphasize the ${duration} format for busy professionals`,
        "Highlight networking opportunities and expert speakers",
        "Use early bird pricing to drive initial registrations"
      ]
    };

    logStep("AI response generated", aiResponse);

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});