import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Apple Wallet pass structure
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
async function sha1Hash(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

// Create .pkpass file
async function createPkpassFile(pass: AppleWalletPass): Promise<Uint8Array> {
  const passJson = JSON.stringify(pass, null, 2);
  const passJsonBytes = new TextEncoder().encode(passJson);

  // Create manifest with SHA-1 hashes
  const manifest = {
    "pass.json": await sha1Hash(passJsonBytes)
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestBytes = new TextEncoder().encode(manifestJson);

  // In a real implementation, you would:
  // 1. Sign the manifest with your Apple certificate
  // 2. Create a ZIP file with pass.json, manifest.json, signature, and any images
  // 3. Return the ZIP as .pkpass file

  // For now, we'll create a basic structure
  // You'll need to implement proper PKCS#7 signing here
  const signatureBytes = new TextEncoder().encode("PLACEHOLDER_SIGNATURE");

  // Create a simple ZIP-like structure (in production, use a proper ZIP library)
  const files = [
    { name: "pass.json", data: passJsonBytes },
    { name: "manifest.json", data: manifestBytes },
    { name: "signature", data: signatureBytes }
  ];

  // This is a simplified version - you need proper ZIP creation
  // For production, use a ZIP library or implement proper ZIP format
  const combinedData = new Uint8Array(
    passJsonBytes.length + manifestBytes.length + signatureBytes.length
  );

  let offset = 0;
  combinedData.set(passJsonBytes, offset);
  offset += passJsonBytes.length;
  combinedData.set(manifestBytes, offset);
  offset += manifestBytes.length;
  combinedData.set(signatureBytes, offset);

  return combinedData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ticketCode = url.searchParams.get('ticketCode');
    const download = url.searchParams.get('download') === 'true';

    if (!ticketCode) {
      return new Response(
        JSON.stringify({ error: 'Ticket code is required' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    // Check for required environment variables
    const teamId = Deno.env.get("APPLE_TEAM_ID");
    const passTypeId = Deno.env.get("APPLE_PASS_TYPE_ID");

    if (!teamId || !passTypeId) {
      return new Response(
        JSON.stringify({
          error: 'Apple Developer credentials not configured',
          message: 'Please set APPLE_TEAM_ID and APPLE_PASS_TYPE_ID environment variables'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500
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

    // Type assertion for Supabase joined data
    const order = (ticket.order_items as any)?.orders;
    const event = (order as any)?.events;
    const ticketType = (ticket.order_items as any)?.ticket_types;
    const organization = (event as any)?.organizations;

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

    // Create the pass
    const pass: AppleWalletPass = {
      formatVersion: 1,
      passTypeIdentifier: passTypeId,
      serialNumber: ticket.id,
      teamIdentifier: teamId,
      organizationName: organization?.name || "TicketFlo",
      description: `${event.name} - Event Ticket`,
      backgroundColor: "rgb(17, 24, 39)",
      foregroundColor: "rgb(255, 255, 255)",
      labelColor: "rgb(156, 163, 175)",
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

    if (download) {
      // Generate and return the .pkpass file
      try {
        const pkpassData = await createPkpassFile(pass);

        return new Response(pkpassData, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/vnd.apple.pkpass",
            "Content-Disposition": `attachment; filename="${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_ticket.pkpass"`
          }
        });
      } catch (error) {
        console.error('Error creating .pkpass file:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to create .pkpass file',
            message: 'This is a development version. Full .pkpass generation requires proper signing certificates.'
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
          }
        );
      }
    } else {
      // Return pass data for preview
      return new Response(JSON.stringify({
        success: true,
        type: 'apple-wallet',
        pass: pass,
        downloadUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-apple-wallet-pass-production?ticketCode=${encodeURIComponent(ticketCode)}&download=true`,
        setupComplete: !!(teamId && passTypeId),
        instructions: [
          "Apple Wallet pass structure created successfully.",
          `Team ID: ${teamId}`,
          `Pass Type ID: ${passTypeId}`,
          "To complete setup:",
          "1. Configure signing certificates",
          "2. Implement proper PKCS#7 signature",
          "3. Add pass icons and images",
          "4. Test on iOS device"
        ]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error: any) {
    console.error("generate-apple-wallet-pass-production error:", error);
    return new Response(JSON.stringify({
      error: error.message || String(error),
      message: 'Apple Wallet pass generation failed'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});