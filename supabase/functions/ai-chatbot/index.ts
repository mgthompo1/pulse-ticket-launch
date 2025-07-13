import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-CHATBOT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Chatbot request started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { message, context } = await req.json();
    logStep("Processing message", { message, context });

    // Simple rule-based chatbot for now - replace with actual AI
    let response = "";

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("ticket") || lowerMessage.includes("purchase")) {
      response = "To purchase tickets, browse the available events on our platform and select your preferred ticket type. You can pay securely with your credit card through our Stripe integration.";
    } else if (lowerMessage.includes("refund") || lowerMessage.includes("cancel")) {
      response = "For refunds and cancellations, please contact the event organizer directly. Their contact information is available on the event page or in your confirmation email.";
    } else if (lowerMessage.includes("event") || lowerMessage.includes("when")) {
      response = "You can find all upcoming events on our platform. Each event page shows the date, time, venue, and ticket availability. Use the search and filter options to find events that interest you.";
    } else if (lowerMessage.includes("payment") || lowerMessage.includes("pay")) {
      response = "We accept all major credit cards through our secure Stripe payment system. Your payment information is encrypted and secure. You'll receive a confirmation email after successful payment.";
    } else if (lowerMessage.includes("help") || lowerMessage.includes("support")) {
      response = "I'm here to help! You can ask me about:\n• Purchasing tickets\n• Event information\n• Payment methods\n• Refunds and cancellations\n• Account issues\n\nFor specific issues, contact the event organizer or our support team.";
    } else if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      response = "Hello! 👋 Welcome to Ticket2! I'm your AI assistant. How can I help you today? You can ask me about events, tickets, payments, or anything else!";
    } else {
      response = "I understand you're asking about: \"" + message + "\"\n\nI can help you with ticket purchases, event information, payments, and general support. Could you please be more specific about what you'd like to know?";
    }

    // If context is provided, try to give more specific help
    if (context && context.eventId) {
      const { data: event, error } = await supabaseClient
        .from("events")
        .select("name, event_date, venue, description")
        .eq("id", context.eventId)
        .single();

      if (!error && event) {
        response += `\n\nI see you're looking at "${event.name}" on ${new Date(event.event_date).toLocaleDateString()}. This event will be held at ${event.venue || 'the specified venue'}. Is there something specific you'd like to know about this event?`;
      }
    }

    logStep("Response generated", { responseLength: response.length });

    return new Response(JSON.stringify({
      response,
      timestamp: new Date().toISOString(),
      helpful: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      response: "I apologize, but I'm having technical difficulties right now. Please try again in a moment or contact our support team for immediate assistance.",
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 to show user-friendly message
    });
  }
});