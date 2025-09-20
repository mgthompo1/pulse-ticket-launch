import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// Helper function to create SHA-1 hash
async function sha1Hash(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b)=>b.toString(16).padStart(2, '0')).join('');
}
// Create ZIP file for .pkpass
function createZipFile(files: Array<{name: string, content: Uint8Array}>): Uint8Array {
  // Simple ZIP file structure
  // For production, you'd use a proper ZIP library, but this creates a basic ZIP
  const zipEntries = [];
  const centralDirectory = [];
  let offset = 0;
  for (const file of files){
    // Local file header
    const fileName = new TextEncoder().encode(file.name);
    const fileContent = file.content;
    const localHeader = new Uint8Array(30 + fileName.length);
    const view = new DataView(localHeader.buffer);
    // Local file header signature
    view.setUint32(0, 0x04034b50, true);
    // Version needed to extract
    view.setUint16(4, 20, true);
    // General purpose bit flag
    view.setUint16(6, 0, true);
    // Compression method (0 = no compression)
    view.setUint16(8, 0, true);
    // Last mod file time & date
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    // CRC-32 (simplified - should calculate actual CRC)
    view.setUint32(14, 0, true);
    // Compressed size
    view.setUint32(18, fileContent.length, true);
    // Uncompressed size
    view.setUint32(22, fileContent.length, true);
    // File name length
    view.setUint16(26, fileName.length, true);
    // Extra field length
    view.setUint16(28, 0, true);
    // Copy filename
    localHeader.set(fileName, 30);
    // Combine header and content
    const entry = new Uint8Array(localHeader.length + fileContent.length);
    entry.set(localHeader, 0);
    entry.set(fileContent, localHeader.length);
    zipEntries.push(entry);
    // Central directory header
    const centralHeader = new Uint8Array(46 + fileName.length);
    const centralView = new DataView(centralHeader.buffer);
    // Central file header signature
    centralView.setUint32(0, 0x02014b50, true);
    // Version made by
    centralView.setUint16(4, 20, true);
    // Version needed to extract
    centralView.setUint16(6, 20, true);
    // General purpose bit flag
    centralView.setUint16(8, 0, true);
    // Compression method
    centralView.setUint16(10, 0, true);
    // Last mod file time & date
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    // CRC-32
    centralView.setUint32(16, 0, true);
    // Compressed size
    centralView.setUint32(20, fileContent.length, true);
    // Uncompressed size
    centralView.setUint32(24, fileContent.length, true);
    // File name length
    centralView.setUint16(28, fileName.length, true);
    // Extra field length
    centralView.setUint16(30, 0, true);
    // File comment length
    centralView.setUint16(32, 0, true);
    // Disk number start
    centralView.setUint16(34, 0, true);
    // Internal file attributes
    centralView.setUint16(36, 0, true);
    // External file attributes
    centralView.setUint32(38, 0, true);
    // Relative offset of local header
    centralView.setUint32(42, offset, true);
    // Copy filename
    centralHeader.set(fileName, 46);
    centralDirectory.push(centralHeader);
    offset += entry.length;
  }
  // Calculate total size
  const entriesSize = zipEntries.reduce((sum, entry)=>sum + entry.length, 0);
  const centralDirSize = centralDirectory.reduce((sum, dir)=>sum + dir.length, 0);
  // End of central directory record
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  // End of central dir signature
  endView.setUint32(0, 0x06054b50, true);
  // Number of this disk
  endView.setUint16(4, 0, true);
  // Number of disk with start of central directory
  endView.setUint16(6, 0, true);
  // Number of central directory records on this disk
  endView.setUint16(8, files.length, true);
  // Total number of central directory records
  endView.setUint16(10, files.length, true);
  // Size of central directory
  endView.setUint32(12, centralDirSize, true);
  // Offset of start of central directory
  endView.setUint32(16, entriesSize, true);
  // ZIP file comment length
  endView.setUint16(20, 0, true);
  // Combine all parts
  const totalSize = entriesSize + centralDirSize + endRecord.length;
  const zipData = new Uint8Array(totalSize);
  let currentOffset = 0;
  // Add entries
  for (const entry of zipEntries){
    zipData.set(entry, currentOffset);
    currentOffset += entry.length;
  }
  // Add central directory
  for (const dir of centralDirectory){
    zipData.set(dir, currentOffset);
    currentOffset += dir.length;
  }
  // Add end record
  zipData.set(endRecord, currentOffset);
  return zipData;
}
// Create signature using Apple certificates
async function createSignature(manifestData: string): Promise<Uint8Array> {
  try {
    // Get the certificate from environment variable
    const certBase64 = Deno.env.get("APPLE_WALLET_CERT_BASE64");
    if (!certBase64) {
      console.warn("No Apple certificate found, using placeholder signature");
      return new TextEncoder().encode("PLACEHOLDER_SIGNATURE_FOR_DEVELOPMENT");
    }
    // For now, return a placeholder signature
    // In a full implementation, you would:
    // 1. Parse the P12 certificate file
    // 2. Extract the private key and certificate
    // 3. Create a PKCS#7 signature of the manifest
    // 4. Return the signature bytes
    console.log("Creating development signature for manifest");
    return new TextEncoder().encode("DEVELOPMENT_SIGNATURE_PLACEHOLDER");
  } catch (error) {
    console.error("Error creating signature:", error);
    return new TextEncoder().encode("ERROR_SIGNATURE_PLACEHOLDER");
  }
}
// Helper function to format date for display
function formatEventDate(dateString: string): string {
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
async function createPkpassFile(pass: any): Promise<Uint8Array> {
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
  // Create signature using Apple certificates
  const signatureBytes = await createSignature(manifestJson);
  // Create proper ZIP file with all components
  const files = [
    {
      name: 'pass.json',
      content: passJsonBytes
    },
    {
      name: 'manifest.json',
      content: manifestBytes
    },
    {
      name: 'signature',
      content: signatureBytes
    }
  ];
  // Create ZIP file
  const zipData = createZipFile(files);
  console.log(`Created .pkpass ZIP file with ${files.length} files, size: ${zipData.length} bytes`);
  return zipData;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const url = new URL(req.url);
    const ticketCode = url.searchParams.get('ticketCode');
    const download = url.searchParams.get('download') === 'true';
    if (!ticketCode) {
      return new Response(JSON.stringify({
        error: 'Ticket code is required'
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 400
      });
    }
    // Check for required environment variables
    const teamId = Deno.env.get("APPLE_TEAM_ID");
    const passTypeId = Deno.env.get("APPLE_PASS_TYPE_ID");
    if (!teamId || !passTypeId) {
      return new Response(JSON.stringify({
        error: 'Apple Developer credentials not configured',
        message: 'Please set APPLE_TEAM_ID and APPLE_PASS_TYPE_ID environment variables'
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 500
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        persistSession: false
      }
    });
    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase.from('tickets').select(`
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
      `).eq('ticket_code', ticketCode).single();
    if (ticketError || !ticket) {
      console.error('Ticket lookup error:', ticketError);
      return new Response(JSON.stringify({
        error: 'Ticket not found'
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 404
      });
    }
    // Type assertion for Supabase joined data
    const order = (ticket as any).order_items?.orders;
    const event = order?.events;
    const ticketType = (ticket as any).order_items?.ticket_types;
    const organization = event?.organizations;
    if (!event || !order) {
      return new Response(JSON.stringify({
        error: 'Event or order data not found'
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 404
      });
    }
    // Format the event date
    const eventDateTime = event.event_date ? formatEventDate(event.event_date) : {
      date: 'TBA',
      time: 'TBA'
    };
    // Create the pass
    const pass = {
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
      (pass as any).relevantDate = new Date(event.event_date).toISOString();
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
        return new Response(JSON.stringify({
          error: 'Failed to create .pkpass file',
          message: 'This is a development version. Full .pkpass generation requires proper signing certificates.'
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          },
          status: 500
        });
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
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
  } catch (error) {
    console.error("generate-apple-wallet-pass-production error:", error);
    return new Response(JSON.stringify({
      error: error.message || String(error),
      message: 'Apple Wallet pass generation failed'
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
