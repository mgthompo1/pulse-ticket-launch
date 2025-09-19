import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Apple Wallet pass template structure
interface AppleWalletPass {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  eventTicket: {
    primaryFields: Array<{
      key: string;
      label: string;
      value: string;
    }>;
    secondaryFields: Array<{
      key: string;
      label: string;
      value: string;
    }>;
    auxiliaryFields: Array<{
      key: string;
      label: string;
      value: string;
    }>;
    backFields: Array<{
      key: string;
      label: string;
      value: string;
    }>;
  };
  barcode: {
    message: string;
    format: string;
    messageEncoding: string;
  };
  locations?: Array<{
    latitude: number;
    longitude: number;
    relevantText: string;
  }>;
  relevantDate?: string;
}

// Google Pay pass structure
interface GooglePayPass {
  iss: string;
  aud: string;
  typ: string;
  iat: number;
  payload: {
    eventTicketObjects: Array<{
      id: string;
      classId: string;
      state: string;
      barcode: {
        type: string;
        value: string;
        alternateText: string;
      };
      ticketHolderName: string;
      seatInfo?: {
        seat: {
          seatNumber: string;
        };
        row: {
          rowLabel: string;
        };
      };
    }>;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ticketCode = url.searchParams.get('ticketCode');
    const format = url.searchParams.get('format') || 'apple'; // 'apple' or 'google'

    if (!ticketCode) {
      return new Response(
        JSON.stringify({ error: 'Ticket code is required' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        ticket_code,
        status,
        order_items (
          ticket_types (name, price),
          orders (
            customer_name,
            customer_email,
            events (
              name,
              event_date,
              venue,
              description,
              organization_id,
              organizations (name, logo_url)
            )
          )
        )
      `)
      .eq('ticket_code', ticketCode)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404
        }
      );
    }

    // Type assertion for Supabase joined data
    const order = (ticket.order_items as any)?.orders;
    const event = (order as any)?.events;
    const ticketType = (ticket.order_items as any)?.ticket_types;
    const organization = (event as any)?.organizations;

    if (format === 'apple') {
      // Generate Apple Wallet pass
      const applePass: AppleWalletPass = {
        formatVersion: 1,
        passTypeIdentifier: Deno.env.get("APPLE_PASS_TYPE_ID") || "pass.com.ticketflo.eventticket", // Your registered pass type identifier
        serialNumber: ticket.id,
        teamIdentifier: Deno.env.get("APPLE_TEAM_ID") || "DA3U3FH5FZ", // Your Apple Developer Team ID
        organizationName: organization?.name || "TicketFlo",
        description: event?.name || "Event Ticket",
        backgroundColor: "rgb(31, 41, 55)",
        foregroundColor: "rgb(255, 255, 255)",
        labelColor: "rgb(156, 163, 175)",
        eventTicket: {
          primaryFields: [
            {
              key: "event",
              label: "EVENT",
              value: event?.name || "Event"
            }
          ],
          secondaryFields: [
            {
              key: "date",
              label: "DATE",
              value: event?.event_date ? new Date(event.event_date).toLocaleDateString() : "TBA"
            },
            {
              key: "time",
              label: "TIME",
              value: event?.event_date ? new Date(event.event_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "TBA"
            }
          ],
          auxiliaryFields: [
            {
              key: "venue",
              label: "VENUE",
              value: event?.venue || "TBA"
            },
            {
              key: "ticket-type",
              label: "TYPE",
              value: ticketType?.name || "General Admission"
            }
          ],
          backFields: [
            {
              key: "ticket-code",
              label: "Ticket Code",
              value: ticket.ticket_code
            },
            {
              key: "holder",
              label: "Ticket Holder",
              value: order?.customer_name || "Guest"
            },
            {
              key: "email",
              label: "Email",
              value: order?.customer_email || ""
            },
            {
              key: "description",
              label: "Event Description",
              value: event?.description || ""
            },
            {
              key: "support",
              label: "Support",
              value: "For support, contact the event organizer"
            }
          ]
        },
        barcode: {
          message: ticket.ticket_code,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1"
        }
      };

      // Add location if venue has coordinates (would need to be added to the database)
      if (event?.venue) {
        // For now, we'll skip location as it requires geocoding
        // applePass.locations = [{ latitude: lat, longitude: lng, relevantText: event.venue }];
      }

      // Add relevant date
      if (event?.event_date) {
        applePass.relevantDate = new Date(event.event_date).toISOString();
      }

      // In a real implementation, you would:
      // 1. Create the pass.json file
      // 2. Add any images (icon.png, logo.png, etc.)
      // 3. Create a manifest.json file with file hashes
      // 4. Sign the manifest with your certificate
      // 5. Package everything into a .pkpass file
      // For now, we'll return the pass data structure

      return new Response(JSON.stringify({
        type: 'apple',
        pass: applePass,
        downloadUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-apple-wallet-pass?ticketCode=${ticket.ticket_code}`,
        message: 'Apple Wallet pass data generated. In production, this would generate a .pkpass file.'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (format === 'google') {
      // Generate Google Pay pass
      const now = Math.floor(Date.now() / 1000);

      const googlePass: GooglePayPass = {
        iss: "YOUR_SERVICE_ACCOUNT_EMAIL", // Your Google Pay API service account email
        aud: "google",
        typ: "savetowallet",
        iat: now,
        payload: {
          eventTicketObjects: [
            {
              id: `${ticket.id}.${order?.customer_email}`,
              classId: "YOUR_CLASS_ID", // Your registered class ID
              state: "active",
              barcode: {
                type: "qrCode",
                value: ticket.ticket_code,
                alternateText: ticket.ticket_code
              },
              ticketHolderName: order?.customer_name || "Guest"
            }
          ]
        }
      };

      return new Response(JSON.stringify({
        type: 'google',
        pass: googlePass,
        downloadUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-google-pay-pass?ticketCode=${ticket.ticket_code}`,
        message: 'Google Pay pass data generated. In production, this would generate a signed JWT.'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({ error: 'Unsupported wallet format' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );

  } catch (error: any) {
    console.error("generate-wallet-pass error:", error);
    return new Response(JSON.stringify({
      error: error.message || String(error),
      message: 'Wallet pass generation failed'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});