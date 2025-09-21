import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// Helper function to create SHA-1 hash
async function sha1Hash(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}
// CRC-32 calculation function
function crc32(data: Uint8Array): number {
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Create ZIP file for .pkpass
function createZipFile(files: Array<{name: string, content: Uint8Array}>): Uint8Array {
  // Simple ZIP file structure
  // For production, you'd use a proper ZIP library, but this creates a basic ZIP
  const zipEntries = [];
  const centralDirectory = [];
  let offset = 0;
  for (const file of files) {
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
    // Calculate CRC-32 for the file content
    const crc = crc32(fileContent);
    view.setUint32(14, crc, true);
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
    // CRC-32 (same as local header)
    centralView.setUint32(16, crc, true);
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
  const entriesSize = zipEntries.reduce(function(sum, entry) { return sum + entry.length; }, 0);
  const centralDirSize = centralDirectory.reduce(function(sum, dir) { return sum + dir.length; }, 0);
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
  for (const entry of zipEntries) {
    zipData.set(entry, currentOffset);
    currentOffset += entry.length;
  }
  // Add central directory
  for (const dir of centralDirectory) {
    zipData.set(dir, currentOffset);
    currentOffset += dir.length;
  }
  // Add end record
  zipData.set(endRecord, currentOffset);
  return zipData;
}
// Create signature using Railway microservice with OpenSSL
async function createSignature(manifestData: string): Promise<Uint8Array> {
  console.log("🔐 Creating Apple Wallet signature via Railway microservice...");

  const certBase64 = Deno.env.get("APPLE_WALLET_CERT_BASE64");
  const certPassword = Deno.env.get("APPLE_WALLET_CERT_PASSWORD");
  const signingServiceUrl = Deno.env.get("APPLE_WALLET_SIGNING_SERVICE_URL");
  const signingApiKey = Deno.env.get("APPLE_WALLET_SIGNING_API_KEY");

  console.log("📊 Environment check:");
  console.log("- certBase64:", certBase64 ? `${certBase64.length} chars` : "NOT SET");
  console.log("- certPassword:", certPassword ? "SET" : "NOT SET");
  console.log("- signingServiceUrl:", signingServiceUrl || "NOT SET");
  console.log("- signingApiKey:", signingApiKey ? "SET" : "NOT SET");

  try {

    if (!certBase64) {
      console.warn("❌ No certificate found, using fallback");
      return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(manifestData)));
    }

    if (!signingServiceUrl) {
      console.warn("❌ No signing service URL configured, using fallback");
      return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(manifestData)));
    }

    console.log(`🚀 Calling signing service at: ${signingServiceUrl}`);
    console.log(`🔑 Using API key: ${signingApiKey ? 'SET' : 'NOT SET'}`);

    // Call Railway microservice for signing
    const response = await fetch(`${signingServiceUrl}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0'
      },
      body: JSON.stringify({
        manifestJson: manifestData,
        cert: certBase64,
        password: certPassword,
        apiKey: signingApiKey
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Signing service error ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (!result.success || !result.signature) {
      throw new Error(`Signing failed: ${result.message || 'Unknown error'}`);
    }

    // Convert base64 signature back to Uint8Array
    const signatureBytes = Uint8Array.from(atob(result.signature), c => c.charCodeAt(0));

    console.log(`✅ Railway microservice signature: ${signatureBytes.length} bytes`);
    console.log(`📊 Signing service response: ${result.size} bytes at ${result.timestamp}`);

    // Validate signature size (should be much larger than 32 bytes for proper PKCS#7)
    if (signatureBytes.length < 100) {
      throw new Error(`Invalid signature size: ${signatureBytes.length} bytes (expected > 100)`);
    }

    return signatureBytes;

  } catch (error) {
    console.error("❌ Railway signing service failed:", error);
    console.log("🔄 Falling back to local signature...");
    console.log("📊 Debug info:", {
      signingServiceUrl,
      hasApiKey: !!signingApiKey,
      hasCert: !!certBase64,
      errorMessage: error.message,
      errorStack: error.stack
    });

    // Fallback to basic hash if microservice fails
    return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(manifestData)));
  }
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
async function createPkpassFile(pass: any, organization?: any): Promise<Uint8Array> {
  const passJson = JSON.stringify(pass, null, 2);
  const passJsonBytes = new TextEncoder().encode(passJson);

  // Use properly sized images from working Humanitix PKPass (100x100 icons, 140x24/280x48 logos)
  // Convert base64 to Uint8Array
  const iconBase64 = "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";
  const iconPng = Uint8Array.from(atob(iconBase64), c => c.charCodeAt(0));

  // Use same icon for @2x (Apple Wallet will scale appropriately)
  const icon2xPng = iconPng;

  // Try to fetch organization logo, fallback to default
  let logoPng: Uint8Array;

  try {
    const orgLogoUrl = organization?.logo_url;
    if (orgLogoUrl) {
      console.log(`Fetching organization logo from: ${orgLogoUrl}`);
      const logoResponse = await fetch(orgLogoUrl);
      if (logoResponse.ok && logoResponse.headers.get('content-type')?.includes('image')) {
        const logoArrayBuffer = await logoResponse.arrayBuffer();
        logoPng = new Uint8Array(logoArrayBuffer);
        console.log(`✅ Organization logo fetched: ${logoPng.length} bytes`);
      } else {
        throw new Error(`Invalid logo response: ${logoResponse.status}`);
      }
    } else {
      throw new Error('No organization logo URL provided');
    }
  } catch (logoError) {
    console.log(`⚠️ Could not fetch organization logo: ${logoError.message}, using default`);
    // Fallback to default 160x50 logo
    const logoBase64 = "iVBORw0KGgoAAAANSUhEUgAAAIwAAAAYCAYAAAAoNxVrAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAATlSURBVHgB7Vvhdts4DAbtvPtbbXDKBOdMEGeAq+MJ4k5Q+xY4ewLZE8SZIMl1gDoTxDdB1Amq/u1rpH6QKBuiRYlO2xfX0vcen2QBBCESAkmAVkmS9InoiraIUBZKqZAMgHeEy7l49D/KEryRpvu4vEfxbLLA09M8sr2ZkCHpm/pazwHKpZC/RpmAvi6he5rO9ZeW92AeX8jzRbtc9wblLtdN1/W0fr75fqIv+4LOct6Z/Wn0ZVHOh6BPSWFMXPCg3k6Waf3bwKMT6JiI93lGHw8nUUGH/4IAPGNSNEfdSYF2G/jUpWvQe9QB/e/JjJ8rKP5E247KwUbwjoovyB31eVfPdMDmmucjZZ0lwR0xFnIecekZPGwwUws91KVP5cgHxUY3dWSDuiV3hChnwqBHuFwb7S9R+LlXIYdlrCt0CEE/Ten3QdmY1COmCxjFCobAAz0q0PDRqLfjdExTg+qi/aTQZ2tdP0qNpUMfCzp0aMpG0yF3xTyH534J/Y2DnD8r6D5VG4NXQ2dcGfz7wEcZG7/N9sdULzcQ9z1LO2X37uhu6vmV8tkYkp0+Y0/yCGO73DEWRkxT9kgdagZ8cX9HmdfIEdHWi0WW+u/px9GjAwC8B+th08WHId2SzWAxfZ1YKva165X4i14PPJA80F8o8xZeBZ3XMb5B3/DrqeXU0g5PFzx1mQbi8ZQs1zIlWFFmdLU6/EJEdQyYctaY8hb0ko8gppnNYHwqztOvjYVY43DHmwvCh3zNBTp32r91ArWcsi/tjaUK81sHBO1fCNlOOliBgaGOGtDGyBKPSg1OLKQV1iDPyYocoAaTMTxNhKnHXccY68DhZH5Cx4HProx6J8cfQ58OFBiYKS7T/Dc8At+bgxuqwfiUXghuA0ZDDkYTaWNZ8o9jMZh9sLugayq68KZJLRfvqDberWrRy1vAlSgh/ebQcRK/hMRz+qkuC2oA9NZ77MZMAWJDqSeyeZh7zMmXhTqZK3+i/XGJuvf63qfD/LqnIs6ypiMHprjHNCC3D3hb/SGwGozzmsAB7M72CZS9BgIYygNluu4bYf2tULOtrgaM5mfHYQ796wwtz0eULYQ5uHYQ8ZJfBd5WY0d1V05UKxjFGdn6Cbs3NpjavfseuHfgKTOqL/TzENme6VzNDdUjtMlwbLOuTyPHZ/vKcKER8kZDipNiP8R0g9TBRWpQSBGQ2Qdxmoua8pTEizyx508ZdxZ+OgHIz88N3qXgWYKHbzko1BPKMx+7fE7krcAzFW0ybS6a4jaubG1Qtt3kVIIv6DNBv6PdwNlC6DhC+yEVk6S5nmsti+nXQsZCBO2WlPVBqXzBM6jgYXqPiolc+2I7Bn9XnYtkIu0MuMQzTcDvbfgV3uc5KeQG1fCfEaanMI33QBbHWLa0SQjaGScd8esc9Fm+rVbUYOjMeGq0Zdn5FrtotMG02CLNYP8Bj/SVIvYwNr6mJB9bVEAfZ3ikbygdespjLmVoDabhSA9rmccZsqMMpUG9JqYGGg19Gi9bcMeI9MaWLHpSHmBtDeZIIY5Y9mm7Rc6y3nFt9RA88zJCazDHig68x/ZUne9eMT2qObQtfNs1zLFCveDAG5/Dyc71hjaW1sMcL1wjx8x3w1NQlaHkaA3mWFGI9qYnDRgwDkSs+XReknyCkXBUfG3+/aQK3wEYnv8bksesuAAAAABJRU5ErkJggg==";
    logoPng = Uint8Array.from(atob(logoBase64), c => c.charCodeAt(0));
  }

  // Create manifest with SHA-1 hashes for all files except signature
  const manifest = {
    "pass.json": await sha1Hash(passJsonBytes),
    "icon.png": await sha1Hash(iconPng),
    "icon@2x.png": await sha1Hash(icon2xPng),
    "logo.png": await sha1Hash(logoPng),
    "logo@2x.png": await sha1Hash(logoPng)
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
    },
    {
      name: 'icon.png',
      content: iconPng
    },
    {
      name: 'icon@2x.png',
      content: icon2xPng
    },
    {
      name: 'logo.png',
      content: logoPng
    },
    {
      name: 'logo@2x.png',
      content: logoPng
    }
  ];
  // Create ZIP file
  const zipData = createZipFile(files);
  console.log(`Created .pkpass ZIP file with ${files.length} files, size: ${zipData.length} bytes`);

  // Add detailed validation logging
  console.log("PKPass file validation:");
  console.log(`- Files included: ${files.map(f => f.name).join(', ')}`);
  console.log(`- Pass.json size: ${files.find(f => f.name === 'pass.json')?.content.length} bytes`);
  console.log(`- Manifest.json size: ${files.find(f => f.name === 'manifest.json')?.content.length} bytes`);
  console.log(`- Signature size: ${files.find(f => f.name === 'signature')?.content.length} bytes`);
  console.log(`- Total ZIP size: ${zipData.length} bytes`);

  // Validate ZIP file structure
  if (zipData.length < 100) {
    console.error("WARNING: ZIP file unusually small - likely corrupted");
  }

  // Additional Apple Wallet validation
  console.log("Apple Wallet PKPass validation:");
  console.log(`- ZIP file starts with: ${Array.from(zipData.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  console.log(`- Expected ZIP signature: 50 4b 03 04`);

  // Validate pass.json structure
  const passJsonFile = files.find(f => f.name === 'pass.json');
  if (passJsonFile) {
    try {
      const passObj = JSON.parse(new TextDecoder().decode(passJsonFile.content));
      console.log("Pass.json validation:");
      console.log(`- Format version: ${passObj.formatVersion}`);
      console.log(`- Pass type: ${passObj.passTypeIdentifier}`);
      console.log(`- Team ID: ${passObj.teamIdentifier}`);
      console.log(`- Organization: ${passObj.organizationName}`);
      console.log(`- Serial number: ${passObj.serialNumber}`);
      console.log(`- Has eventTicket: ${!!passObj.eventTicket}`);
      console.log(`- Barcode format: ${passObj.barcodes?.[0]?.format || 'none'}`);

      // Check for potential issues
      if (!passObj.eventTicket) {
        console.error("ERROR: Missing eventTicket object - Apple Wallet requires this for event tickets");
      }
      if (!passObj.barcodes || !passObj.barcodes[0] || !passObj.barcodes[0].message) {
        console.error("ERROR: Missing or invalid barcodes - Apple Wallet requires valid barcode array");
      }
      if (passObj.serialNumber && passObj.serialNumber.length > 50) {
        console.error("WARNING: Serial number too long - Apple recommends max 50 characters");
      }
    } catch (e) {
      console.error("ERROR: Invalid pass.json structure:", e.message);
    }
  }

  return zipData;
}
serve(async function(req) {
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

    // Debug: Check pass type ID for truncation
    console.log(`Pass Type ID from env: "${passTypeId}" (length: ${passTypeId?.length})`);
    if (passTypeId && passTypeId.length > 40) {
      console.log("WARNING: Pass Type ID might be truncated - Apple Wallet requires exact match with certificate");
    }
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
    // Debug: Log the ticket code being searched
    console.log(`Searching for ticket with code: "${ticketCode}" (length: ${ticketCode.length})`);
    console.log(`Ticket code type: ${typeof ticketCode}`);
    console.log(`Ticket code chars: ${Array.from(ticketCode).map(c => c.charCodeAt(0)).join(',')}`);

    // Fetch ticket details
    let { data: ticket, error: ticketError } = await supabase.from('tickets').select('id,ticket_code,status,created_at,order_items(ticket_types(name,price,description),orders(id,customer_name,customer_email,created_at,events(name,event_date,venue,description,organization_id,logo_url,organizations(name,logo_url))))').eq('ticket_code', ticketCode).single();

    console.log(`Ticket lookup result: found=${!!ticket}, error=${!!ticketError}`);
    if (ticketError) {
      console.error('Ticket lookup error details:', JSON.stringify(ticketError, null, 2));
    }

    if (ticket) {
      console.log('Ticket data structure:');
      console.log(`- ticket.id: ${ticket.id}`);
      console.log(`- ticket.ticket_code: ${ticket.ticket_code}`);
      console.log(`- Using for serial number: ${ticket.ticket_code}`);
    }

    if (ticketError || !ticket) {
      // Check if this is a test ticket for PKI.js validation
      if (ticketCode === 'PKI-TEST-123') {
        console.log('🧪 Using test ticket for PKI.js signature validation');
        ticket = {
          id: 'test-id-123',
          ticket_code: 'PKI-TEST-123',
          status: 'confirmed',
          created_at: new Date().toISOString(),
          order_items: {
            ticket_types: {
              name: 'General Admission',
              price: 50,
              description: 'Test ticket type'
            },
            orders: {
              id: 'test-order-123',
              customer_name: 'Test Customer',
              customer_email: 'test@example.com',
              created_at: new Date().toISOString(),
              events: {
                name: 'PKI Test Event',
                event_date: '2024-03-15T19:30:00Z',
                venue: 'Test Venue',
                description: 'Test event for PKI.js signature validation',
                organization_id: 'test-org-id',
                logo_url: null,
                organizations: {
                  name: 'PKI Test Organization',
                  logo_url: null
                }
              }
            }
          }
        };
      } else {
        // Debug: Show what tickets actually exist
        console.log('Ticket not found. Checking available tickets...');
      try {
        const { data: allTickets, error: listError } = await supabase
          .from('tickets')
          .select('ticket_code, status, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (allTickets && allTickets.length > 0) {
          console.log(`Found ${allTickets.length} recent tickets in database:`);
          allTickets.forEach((t, i) => {
            console.log(`  ${i + 1}. "${t.ticket_code}" (status: ${t.status}, length: ${t.ticket_code.length})`);
            // Check if searched ticket code is similar to any existing ones
            if (t.ticket_code.toLowerCase() === ticketCode.toLowerCase()) {
              console.log(`    *** CASE MISMATCH: Found "${t.ticket_code}" vs searched "${ticketCode}"`);
            }
            if (decodeURIComponent(ticketCode) === t.ticket_code) {
              console.log(`    *** URL ENCODING MISMATCH: Found "${t.ticket_code}" vs encoded "${ticketCode}"`);
            }
          });

          // Try alternative search approaches
          console.log('Trying alternative searches...');

          // Try case-insensitive search
          const { data: caseInsensitive } = await supabase
            .from('tickets')
            .select('ticket_code')
            .ilike('ticket_code', ticketCode);

          if (caseInsensitive && caseInsensitive.length > 0) {
            console.log(`Found with case-insensitive search: ${caseInsensitive.map(t => t.ticket_code).join(', ')}`);
          }

          // Try URL decoded search
          const decodedTicketCode = decodeURIComponent(ticketCode);
          if (decodedTicketCode !== ticketCode) {
            const { data: decodedSearch } = await supabase
              .from('tickets')
              .select('ticket_code')
              .eq('ticket_code', decodedTicketCode);

            if (decodedSearch && decodedSearch.length > 0) {
              console.log(`Found with URL decoded search: ${decodedSearch.map(t => t.ticket_code).join(', ')}`);
            }
          }

        } else {
          console.log('No tickets found in database');
        }
      } catch (debugError) {
        console.log('Error checking tickets:', debugError);
      }

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
    const eventDateTime: { date: string; time: string } = event.event_date ? formatEventDate(event.event_date) : {
      date: 'TBA',
      time: 'TBA'
    };
    // Create the pass
    const pass = {
      formatVersion: 1,
      passTypeIdentifier: passTypeId,
      serialNumber: ticket.ticket_code,
      teamIdentifier: teamId,
      organizationName: organization?.name || "TicketFlo",
      description: `${event.name} - Event Ticket`,
      backgroundColor: "rgb(0, 0, 0)",
      foregroundColor: "rgb(255, 255, 255)",
      labelColor: "rgb(156, 163, 175)",
      eventTicket: {
        headerFields: [
          {
            key: "organizer",
            label: "ORGANIZER",
            value: organization?.name || "TicketFlo",
            textAlignment: "PKTextAlignmentLeft"
          },
          {
            key: "eventDate",
            label: eventDateTime.time,
            value: eventDateTime.date,
            textAlignment: "PKTextAlignmentRight"
          }
        ],
        primaryFields: [
          {
            key: "eventName",
            value: event.name,
            textAlignment: "PKTextAlignmentCenter"
          }
        ],
        secondaryFields: [
          {
            key: "ticket-holder",
            label: "TICKET HOLDER",
            value: order.customer_name || "Guest",
            textAlignment: "PKTextAlignmentLeft"
          },
          {
            key: "ticket-type",
            label: "TICKET TYPE",
            value: ticketType?.name || "General",
            textAlignment: "PKTextAlignmentRight"
          }
        ],
        auxiliaryFields: [
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
            textAlignment: "PKTextAlignmentCenter"
          },
          {
            key: "venue",
            label: "VENUE",
            value: event.venue || "Venue TBA",
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
      barcodes: [
        {
          message: ticket.ticket_code,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1"
        }
      ]
    };
    // Add relevant date for wallet notifications
    if (event.event_date) {
      (pass as any).relevantDate = new Date(event.event_date).toISOString();
    }

    // Validate pass structure
    console.log("Pass validation:");
    console.log(`- Format version: ${pass.formatVersion}`);
    console.log(`- Pass type ID: ${pass.passTypeIdentifier}`);
    console.log(`- Team ID: ${pass.teamIdentifier}`);
    console.log(`- Serial number: ${pass.serialNumber}`);
    console.log(`- Organization name: ${pass.organizationName}`);
    console.log(`- Has barcodes: ${!!pass.barcodes && pass.barcodes.length > 0}`);
    console.log(`- Event ticket fields: ${pass.eventTicket.headerFields?.length || 0} header, ${pass.eventTicket.primaryFields.length} primary, ${pass.eventTicket.secondaryFields.length} secondary, ${pass.eventTicket.backFields.length} back`);

    // Validate required fields are present
    const requiredFields = ['formatVersion', 'passTypeIdentifier', 'teamIdentifier', 'serialNumber', 'organizationName'];
    const missingFields = requiredFields.filter(field => !(pass as any)[field]);
    if (missingFields.length > 0) {
      console.error(`WARNING: Missing required fields: ${missingFields.join(', ')}`);
    }

    // Additional Apple Wallet validation checks
    console.log("Apple Wallet validation checks:");
    console.log(`- Pass type matches certificate: ${pass.passTypeIdentifier}`);
    console.log(`- Team ID matches certificate: ${pass.teamIdentifier}`);
    console.log(`- Serial number format: ${pass.serialNumber} (length: ${pass.serialNumber.length})`);
    console.log(`- Organization name: ${pass.organizationName} (length: ${pass.organizationName.length})`);

    // Check barcodes format
    if (pass.barcodes && pass.barcodes.length > 0) {
      const barcode = pass.barcodes[0];
      console.log(`- Barcode message: ${barcode.message} (length: ${barcode.message.length})`);
      console.log(`- Barcode format: ${barcode.format}`);
      console.log(`- Barcode encoding: ${barcode.messageEncoding}`);
    }
    if (download) {
      // Generate and return the .pkpass file
      try {
        const pkpassData = await createPkpassFile(pass, organization);

        // Detect if this is a browser request
        const userAgent = req.headers.get("User-Agent") || "";
        const isBrowser = userAgent.includes("Mozilla") || userAgent.includes("Safari") || userAgent.includes("Chrome");

        console.log("Download request details:", {
          userAgent: userAgent,
          isBrowser: isBrowser,
          pkpassSize: pkpassData.length
        });

        // Return the PKPass file with enhanced headers for browser compatibility
        return new Response(pkpassData, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/vnd.apple.pkpass",
            "Content-Disposition": `attachment; filename="ticket-${ticketCode}.pkpass"`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Content-Length": pkpassData.length.toString(),
            "X-Content-Type-Options": "nosniff"
          }
        });
      } catch (error) {
        console.error('Error creating .pkpass file:', error);
        return new Response(JSON.stringify({
          error: 'Failed to create .pkpass file',
          message: 'Apple Wallet pass generation failed. Please check certificate configuration.'
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
