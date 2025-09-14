import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHash } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Apple Wallet pass template
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
      textAlignment?: string;
    }>;
    secondaryFields: Array<{
      key: string;
      label: string;
      value: string;
      textAlignment?: string;
    }>;
    auxiliaryFields: Array<{
      key: string;
      label: string;
      value: string;
      textAlignment?: string;
    }>;
    backFields: Array<{
      key: string;
      label: string;
      value: string;
      textAlignment?: string;
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
  logoText?: string;
  webServiceURL?: string;
  authenticationToken?: string;
}

// Helper function to create SHA-1 hash
function sha1Hash(data: string): string {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const hash = createHash("sha1");
  hash.update(dataBytes);
  return hash.toString("hex");
}

// Helper function to format date for display
function formatEventDate(dateString: string): { date: string; time: string } {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ticketCode = url.searchParams.get('ticketCode');

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

    // Fetch ticket details with all related information
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        ticket_code,
        status,
        created_at,
        order_items (
          ticket_types (name, price, description),
          orders (
            id,
            customer_name,
            customer_email,
            created_at,
            events (
              name,
              event_date,
              venue,
              description,
              organization_id,
              logo_url,
              organizations (name, logo_url)
            )
          )
        )
      `)
      .eq('ticket_code', ticketCode)
      .single();

    if (ticketError || !ticket) {
      console.error('Ticket lookup error:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404
        }
      );
    }

    const order = ticket.order_items?.orders;
    const event = order?.events;
    const ticketType = ticket.order_items?.ticket_types;
    const organization = event?.organizations;

    if (!event || !order) {
      return new Response(
        JSON.stringify({ error: 'Event or order data not found' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404
        }
      );
    }

    // Format the event date
    const eventDateTime = event.event_date ? formatEventDate(event.event_date) : { date: 'TBA', time: 'TBA' };

    // Create the pass structure
    const pass: AppleWalletPass = {
      formatVersion: 1,
      passTypeIdentifier: "pass.com.ticketflo.eventticket", // In production, use your registered pass type
      serialNumber: ticket.id,
      teamIdentifier: "YOUR_TEAM_ID", // Replace with your Apple Developer Team ID
      organizationName: organization?.name || "TicketFlo",
      description: `${event.name} - Event Ticket`,
      backgroundColor: "rgb(17, 24, 39)", // Dark background
      foregroundColor: "rgb(255, 255, 255)", // White text
      labelColor: "rgb(156, 163, 175)", // Gray labels
      logoText: organization?.name || event.name,
      eventTicket: {
        primaryFields: [
          {
            key: "event-name",
            label: "",
            value: event.name,
            textAlignment: "PKTextAlignmentCenter"
          }
        ],
        secondaryFields: [
          {
            key: "date",
            label: "DATE",
            value: eventDateTime.date,
            textAlignment: "PKTextAlignmentLeft"
          },
          {
            key: "time",
            label: "TIME",
            value: eventDateTime.time,
            textAlignment: "PKTextAlignmentRight"
          }
        ],
        auxiliaryFields: [
          {
            key: "venue",
            label: "VENUE",
            value: event.venue || "Venue TBA",
            textAlignment: "PKTextAlignmentLeft"
          },
          {
            key: "ticket-type",
            label: "TICKET TYPE",
            value: ticketType?.name || "General",
            textAlignment: "PKTextAlignmentRight"
          }
        ],
        backFields: [
          {
            key: "ticket-code",
            label: "Ticket Code",
            value: ticket.ticket_code
          },
          {
            key: "ticket-holder",
            label: "Ticket Holder",
            value: order.customer_name || "Guest"
          },
          {
            key: "email",
            label: "Email",
            value: order.customer_email || ""
          },
          {
            key: "order-id",
            label: "Order ID",
            value: order.id
          },
          {
            key: "ticket-price",
            label: "Price",
            value: ticketType?.price ? `$${ticketType.price}` : "N/A"
          },
          {
            key: "purchase-date",
            label: "Purchase Date",
            value: new Date(order.created_at).toLocaleDateString()
          },
          {
            key: "event-description",
            label: "Event Description",
            value: event.description || "No description available"
          },
          {
            key: "organizer",
            label: "Event Organizer",
            value: organization?.name || "Event Organizer"
          },
          {
            key: "support-info",
            label: "Support",
            value: "For support, please contact the event organizer. Present this pass at the event entrance."
          },
          {
            key: "terms",
            label: "Terms & Conditions",
            value: "This ticket is non-transferable and non-refundable. Valid for single entry only."
          }
        ]
      },
      barcode: {
        message: ticket.ticket_code,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1"
      }
    };

    // Add relevant date for wallet notifications
    if (event.event_date) {
      pass.relevantDate = new Date(event.event_date).toISOString();
    }

    // In a production environment, you would need to:
    // 1. Create pass.json file
    // 2. Add icon.png, logo.png (if you have them)
    // 3. Create manifest.json with SHA-1 hashes of all files
    // 4. Sign the manifest with your Apple Developer certificate
    // 5. Package everything into a .pkpass (ZIP) file

    // For now, we'll create the basic structure and return the pass data
    const passJson = JSON.stringify(pass, null, 2);

    // Create a basic manifest (in production, you'd hash actual files)
    const manifest = {
      "pass.json": sha1Hash(passJson)
    };

    // Store the pass data (you might want to cache this)
    try {
      const { error: storageError } = await supabase.storage
        .from('wallet-passes')
        .upload(`apple/${ticket.id}/pass.json`, passJson, {
          contentType: 'application/json',
          upsert: true
        });

      if (storageError) {
        console.error('Storage error:', storageError);
      }
    } catch (e) {
      // Ignore storage errors for now
      console.log('Storage not available, continuing...');
    }

    return new Response(JSON.stringify({
      success: true,
      type: 'apple-wallet',
      ticketId: ticket.id,
      pass: pass,
      manifest: manifest,
      downloadUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/download-wallet-pass?ticketId=${ticket.id}&format=apple`,
      addToWalletUrl: `data:application/vnd.apple.pkpass;base64,${btoa(passJson)}`,
      instructions: [
        "This is a preview of your Apple Wallet pass.",
        "In production, this would generate a proper .pkpass file.",
        "You would need Apple Developer certificates to create valid passes.",
        "The pass would be automatically added to Apple Wallet when tapped on iOS."
      ]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("generate-apple-wallet-pass error:", error);
    return new Response(JSON.stringify({
      error: error.message || String(error),
      message: 'Apple Wallet pass generation failed'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});