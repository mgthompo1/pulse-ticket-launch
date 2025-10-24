import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const url = new URL(req.url);
    const ticketCode = url.searchParams.get("ticketCode");

    if (!ticketCode) {
      return new Response(JSON.stringify({ error: "Missing ticketCode parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Generating wallet pass for ticket: ${ticketCode}`);

    // Initialize Supabase client with service role for public access
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabaseClient
      .from("tickets")
      .select(`
        *,
        events (
          id,
          title,
          description,
          venue,
          date,
          image_url
        )
      `)
      .eq("code", ticketCode)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket lookup error:", ticketError);
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // For now, return a basic Apple Wallet pass structure
    // In a full implementation, you would:
    // 1. Use Apple's PassKit to generate a proper .pkpass file
    // 2. Sign the pass with your Apple Developer certificates
    // 3. Include proper pass.json structure

    const passData = {
      formatVersion: 1,
      passTypeIdentifier: "pass.com.ticketflo.eventticket",
      serialNumber: ticket.code,
      teamIdentifier: "YOUR_TEAM_ID", // Replace with your Apple Developer Team ID
      organizationName: "TicketFlo",
      description: ticket.events?.title || "Event Ticket",
      logoText: "TicketFlo",
      backgroundColor: "rgb(0, 122, 255)",
      foregroundColor: "rgb(255, 255, 255)",
      eventTicket: {
        primaryFields: [
          {
            key: "event",
            label: "EVENT",
            value: ticket.events?.title || "Event"
          }
        ],
        secondaryFields: [
          {
            key: "date",
            label: "DATE",
            value: ticket.events?.date ? new Date(ticket.events.date).toLocaleDateString() : "TBD"
          },
          {
            key: "venue",
            label: "VENUE",
            value: ticket.events?.venue || "TBD"
          }
        ],
        auxiliaryFields: [
          {
            key: "ticket",
            label: "TICKET",
            value: ticket.type
          },
          {
            key: "code",
            label: "CODE",
            value: ticket.code
          }
        ],
        backFields: [
          {
            key: "terms",
            label: "Terms and Conditions",
            value: "This ticket is non-transferable and non-refundable. Present this pass for admission."
          }
        ]
      },
      barcode: {
        message: ticket.code,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1"
      }
    };

    // For development, return the pass data as JSON
    // In production, this should generate and return a proper .pkpass file
    return new Response(JSON.stringify(passData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // For actual wallet pass: "Content-Type": "application/vnd.apple.pkpass",
        // "Content-Disposition": `attachment; filename="${ticket.code}.pkpass"`
      }
    });

  } catch (error) {
    console.error("Wallet pass generation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});