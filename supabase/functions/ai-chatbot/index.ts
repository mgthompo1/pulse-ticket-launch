import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.32.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-CHATBOT] ${step}${detailsStr}`);
};

// TicketFlo Knowledge Base - Core information for the AI assistant
const KNOWLEDGE_BASE = `
# TicketFlo Platform Knowledge Base

## What is TicketFlo?
TicketFlo is a comprehensive event ticketing platform designed to help event organizers sell tickets, manage attendees, and grow their events. It offers two modes: Events Mode (for conferences, concerts, festivals) and Attractions Mode (for museums, tours, theme parks).

## Key Features
- Event Management: Create and manage multiple events from a single dashboard
- Customizable Ticketing: Multiple ticket types with flexible pricing
- Payment Processing: Integrated with Stripe and Windcave
- Real-time Analytics: Track sales, revenue, and attendee data
- Marketing Tools: Promotional codes, social media integration
- Integrations: Xero, HubSpot, Zapier compatibility
- Mobile-Friendly: Responsive ticket purchasing experience

## Creating Events
1. Navigate to Events tab in the sidebar
2. Click "Create New Event" button
3. Fill in: Event Name, Date, Venue, Capacity, Description
4. Save as Draft
5. Add ticket types and pricing
6. Customize the event page design
7. Configure confirmation emails
8. Publish when ready

## Ticket Types & Pricing
- Create multiple ticket types per event
- Set different prices and quantities for each
- Configure early bird pricing with date ranges
- Add ticket descriptions
- Set maximum tickets per order
- Enable/disable specific ticket types

## Payment Setup
### Stripe
1. Go to Payments tab
2. Click "Connect to Stripe"
3. Authorize TicketFlo access
4. Configure payment settings
5. Test with Stripe test mode first

### Windcave
1. Go to Payments tab
2. Select Windcave as provider
3. Enter your Windcave credentials
4. Test the connection

## Payment Fees
- Stripe fees: ~2.9% + $0.30 per transaction (varies by country)
- TicketFlo platform fee: Configurable per organization
- Booking fees can be passed to customers (1% + $0.50)

## Refunds
- Process refunds from the order details page
- Full or partial refunds available
- Refunds go back to original payment method
- 5-10 business days for customer to receive

## Event Customization
- Upload event logo and header image
- Set primary and background colors
- Choose fonts and layouts
- Add custom CSS (advanced users)
- Configure which sections appear
- Mobile-responsive design

## Confirmation Emails
- Customize sender name and email
- Personalize subject lines with variables like {{EVENT_NAME}}, {{ORDER_NUMBER}}
- Design email templates with branding
- Include QR codes for tickets
- Add custom information sections
- Send test emails before going live

## Marketing & Promotion
- Generate shareable event links
- Create promotional/discount codes
- Social media integration
- Email campaign tools
- Track traffic sources
- Affiliate program support

## Analytics & Reporting
- Real-time ticket sales tracking
- Revenue reports
- Attendee demographics
- Traffic source analysis
- Export data to CSV/Excel
- Custom date range reports

## User Roles & Permissions
- Owner: Full access, manages billing
- Admin: Nearly full access, manages team
- Editor: Create/edit events, view analytics
- Viewer: Read-only access

## Check-in & Event Day
- TicketFloLIVE for real-time check-in
- QR code scanning
- Attendee list management
- On-site ticket sales
- Real-time attendance tracking

## Integrations
- Xero: Accounting sync
- HubSpot: CRM integration
- Zapier: Workflow automation
- Facebook/Instagram: Social marketing
- LinkedIn: Professional events

## Support
- Email: support@ticketflo.com
- Help Center: /help on the website
- Support tickets via dashboard
- Priority support for premium plans

## Common Issues & Solutions

### Payments Not Working
- Verify payment gateway is connected
- Check test vs live mode
- Ensure Stripe account is fully activated
- Review payment settings

### Event Not Showing
- Check if event is published (not draft)
- Verify ticket sales dates
- Check capacity limits

### Emails Not Sending
- Verify sender email domain
- Check spam folders
- Review email template settings

### Can't Create Event
- Ensure you have Editor or higher role
- Check organization settings
- Verify billing status

## Pricing & Plans
TicketFlo offers different plans based on:
- Number of events
- Ticket volume
- Feature access
- Support level
Contact sales for custom enterprise pricing.

## Security
- PCI DSS compliant payment processing
- SSL encryption
- Two-factor authentication available
- Regular security audits
- GDPR compliant data handling
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Chatbot request started");

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { message, context, conversationHistory = [] } = await req.json();
    logStep("Processing message", { message, context, historyLength: conversationHistory.length });

    // Build context information
    let eventContext = "";
    if (context?.eventId) {
      const { data: event, error } = await supabaseClient
        .from("events")
        .select("name, event_date, venue, description, capacity")
        .eq("id", context.eventId)
        .single();

      if (!error && event) {
        eventContext = `\n\nCurrent Event Context: The user is viewing "${event.name}" scheduled for ${new Date(event.event_date).toLocaleDateString()}. Venue: ${event.venue || 'TBD'}. Capacity: ${event.capacity || 'Not set'}.`;
      }
    }

    // Build conversation history for Claude
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Add previous conversation (limited to last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.isBot ? "assistant" : "user",
        content: msg.content
      });
    }

    // Add current message
    messages.push({
      role: "user",
      content: message
    });

    const systemPrompt = `You are a helpful, friendly AI assistant for TicketFlo, an event ticketing platform. Your role is to help event organizers and attendees with questions about the platform.

${KNOWLEDGE_BASE}
${eventContext}

Guidelines for your responses:
1. Be concise but helpful - keep responses under 200 words unless detail is needed
2. Use a friendly, professional tone
3. If you don't know something specific, suggest contacting support@ticketflo.com
4. For technical issues, suggest checking the Help Center at /help
5. Never make up features that don't exist
6. If asked about pricing specifics you don't know, recommend contacting sales
7. Use bullet points and formatting for clarity when listing steps
8. If the user seems frustrated, acknowledge their concern and offer solutions
9. For refunds, always mention to contact the event organizer first
10. Recommend the dashboard sections relevant to their question

Remember: You're representing TicketFlo, so be helpful and make users feel supported!`;

    logStep("Calling Claude API");

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      system: systemPrompt,
      messages: messages,
    });

    const assistantMessage = response.content[0].type === "text"
      ? response.content[0].text
      : "I apologize, but I couldn't generate a response. Please try again.";

    logStep("Response generated", {
      responseLength: assistantMessage.length,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    });

    return new Response(JSON.stringify({
      response: assistantMessage,
      timestamp: new Date().toISOString(),
      helpful: true,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    // Provide a helpful fallback response
    let fallbackResponse = "I apologize, but I'm having technical difficulties right now. ";

    if (errorMessage.includes("API key")) {
      fallbackResponse += "Our AI service is being configured. Please try again later or contact support@ticketflo.com for immediate assistance.";
    } else {
      fallbackResponse += "Please try again in a moment, or you can:\n\n• Browse our Help Center at /help\n• Contact support@ticketflo.com\n• Submit a support ticket from your dashboard";
    }

    return new Response(JSON.stringify({
      response: fallbackResponse,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 to show user-friendly message
    });
  }
});
