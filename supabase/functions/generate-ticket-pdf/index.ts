import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "npm:jspdf@2.5.1";
import QRCode from "npm:qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketData {
  ticket_code: string;
  ticket_type_name: string;
  customer_name: string;
  event_name: string;
  event_date: string;
  venue?: string;
  price: number;
  order_id: string;
  status: string;
}

// Helper function to safely sanitize text
function sanitizeText(text: string, fallback: string = 'N/A'): string {
  if (!text || typeof text !== 'string') return fallback;
  return text.replace(/[^\w\s.-]/g, '').replace(/\s+/g, ' ').trim() || fallback;
}

// Generate QR code as base64 - simplified to avoid stack overflow
async function generateQR(ticket: TicketData): Promise<string> {
  try {
    const qrData = JSON.stringify({
      ticketId: ticket.ticket_code,
      ticketCode: ticket.ticket_code,
      eventName: ticket.event_name,
      customerName: ticket.customer_name,
      status: ticket.status
    });
    
    return await QRCode.toDataURL(qrData, {
      width: 128,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}

// Format date like the React component
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return dateString;
  }
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return '';
  }
}

// Create beautiful ticket design matching React component exactly
async function createTicketPage(pdf: jsPDF, ticket: TicketData, logoUrl?: string, ticketCustomization?: any): Promise<void> {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Card dimensions and positioning - matching React component size
  const cardWidth = 160;
  const cardHeight = 220;
  const cardX = (pageWidth - cardWidth) / 2;
  const cardY = (pageHeight - cardHeight) / 2;
  
  // Create gradient background effect (from-background to-accent/5)
  for (let i = 0; i < 8; i++) {
    const opacity = 0.03 - (i * 0.003);
    const offset = i * 0.3;
    pdf.setFillColor(99, 102, 241); // Primary/accent color
    pdf.setGState(new pdf.GState({opacity: opacity}));
    pdf.roundedRect(cardX - offset, cardY - offset, cardWidth + (offset * 2), cardHeight + (offset * 2), 12, 12, 'F');
  }
  
  // Reset opacity
  pdf.setGState(new pdf.GState({opacity: 1}));
  
  // Main card background (clean white)
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 8, 8, 'F');
  
  // Card border - 2px border with primary/20 opacity (border-2 border-primary/20)
  pdf.setDrawColor(99, 102, 241, 0.2);
  pdf.setLineWidth(2);
  pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 8, 8, 'S');
  
  // Shadow effect (shadow-lg)
  pdf.setFillColor(0, 0, 0, 0.05);
  pdf.roundedRect(cardX + 3, cardY + 3, cardWidth, cardHeight, 8, 8, 'F');
  
  // Reset for main content
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 8, 8, 'F');

  // Content area with proper padding (p-6)
  const contentX = cardX + 24;
  let currentY = cardY + 24;
  const contentWidth = cardWidth - 48;

  // Header section - logo and event name (text-center border-b border-border pb-4)
  const headerStartY = currentY;
  
  if (logoUrl && logoUrl.length > 10) {
    try {
      // Logo styling (h-12 w-auto mx-auto mb-3)
      const logoHeight = 20;
      const logoWidth = 80; // max-w-[200px] scaled down
      const logoX = contentX + (contentWidth - logoWidth) / 2;
      // Note: In real implementation, fetch and add the actual logo image
      currentY += logoHeight + 6; // mb-3
    } catch (error) {
      console.warn('Logo loading failed:', error);
    }
  }

  // Event name - main title (text-xl font-bold text-foreground)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16); // text-xl equivalent
  pdf.setTextColor(15, 23, 42); // foreground color
  const eventNameLines = pdf.splitTextToSize(ticket.event_name, contentWidth);
  pdf.text(eventNameLines, contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += (eventNameLines.length * 8) + 4;

  // Venue info (flex items-center justify-center gap-1 text-sm text-muted-foreground)
  if (ticket.venue) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10); // text-sm
    pdf.setTextColor(100, 116, 139); // muted-foreground
    const venueText = `📍 ${ticket.venue}`;
    pdf.text(venueText, contentX + contentWidth / 2, currentY, { align: 'center' });
    currentY += 8;
  }

  // Header border (border-b border-border pb-4)
  currentY += 6; // pb-4
  pdf.setDrawColor(229, 231, 235); // border color
  pdf.setLineWidth(1);
  pdf.line(contentX, currentY, contentX + contentWidth, currentY);
  currentY += 20; // space-y-6

  // Event details section (space-y-3)
  const itemSpacing = 18; // space-y-3 equivalent
  const iconSize = 12; // h-4 w-4
  const iconOffset = 18; // gap-3

  // Date and time (flex items-center gap-3)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(99, 102, 241); // text-primary
  pdf.text("📅", contentX, currentY + 3);
  
  // Date (font-medium)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42); // foreground
  pdf.text(formatDate(ticket.event_date), contentX + iconOffset, currentY);
  
  // Time (text-sm text-muted-foreground)
  const timeStr = formatTime(ticket.event_date);
  if (timeStr) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139); // muted-foreground
    pdf.text(timeStr, contentX + iconOffset, currentY + 8);
  }
  currentY += itemSpacing;

  // Ticket type section
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(99, 102, 241); // text-primary
  pdf.text("🎫", contentX, currentY + 3);
  
  // Ticket type name (font-medium)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text(ticket.ticket_type_name, contentX + iconOffset, currentY);
  
  // Label (text-xs text-muted-foreground)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Ticket Type", contentX + iconOffset, currentY + 8);
  currentY += itemSpacing;

  // Customer name section
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(99, 102, 241); // text-primary
  pdf.text("👤", contentX, currentY + 3);
  
  // Customer name (font-medium)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text(ticket.customer_name, contentX + iconOffset, currentY);
  
  // Label (text-xs text-muted-foreground)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Attendee", contentX + iconOffset, currentY + 8);
  currentY += 24; // Extra space before QR section

  // QR Code section (border-t border-border pt-4)
  pdf.setDrawColor(229, 231, 235); // border color
  pdf.setLineWidth(1);
  pdf.line(contentX, currentY, contentX + contentWidth, currentY);
  currentY += 16; // pt-4

  // QR section header (text-center space-y-3)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10); // text-sm font-medium
  pdf.setTextColor(100, 116, 139); // text-muted-foreground
  pdf.text("Scan QR Code at Event", contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += 12; // space-y-3

  // Generate and add QR code (mx-auto border border-border rounded)
  const qrCodeUrl = await generateQR(ticket);
  if (qrCodeUrl && qrCodeUrl.length > 50) {
    try {
      const qrSize = 40; // Larger QR code to match React component
      const qrX = contentX + (contentWidth - qrSize) / 2;
      
      // QR code border (border border-border rounded)
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(1);
      pdf.roundedRect(qrX - 2, currentY - 2, qrSize + 4, qrSize + 4, 2, 2, 'S');
      
      // Add QR code
      pdf.addImage(qrCodeUrl, 'PNG', qrX, currentY, qrSize, qrSize);
      currentY += qrSize + 12; // space-y-3
    } catch (qrError) {
      console.warn('Failed to add QR code:', qrError);
      currentY += 24;
    }
  } else {
    currentY += 24;
  }

  // Ticket details (text-xs text-muted-foreground space-y-1)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8); // text-xs
  pdf.setTextColor(100, 116, 139); // text-muted-foreground
  
  // Ticket code (font-mono font-medium)
  const ticketCodeText = `Ticket Code: ${ticket.ticket_code}`;
  pdf.text(ticketCodeText, contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += 6; // space-y-1
  
  // Status (capitalize font-medium text-green-600)
  pdf.setFont("helvetica", "bold"); // font-medium
  pdf.setTextColor(34, 197, 94); // text-green-600
  const statusText = `Status: ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}`;
  pdf.text(statusText, contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += 16;

  // Footer section (border-t border-border pt-4 text-center)
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(1);
  pdf.line(contentX, currentY, contentX + contentWidth, currentY);
  currentY += 16; // pt-4

  // Footer message (text-xs text-muted-foreground)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8); // text-xs
  pdf.setTextColor(100, 116, 139); // text-muted-foreground
  pdf.text("Please present this ticket at the event entrance", contentX + contentWidth / 2, currentY, { align: 'center' });
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== PDF Generation Function Started ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const { orderId } = await req.json();
    console.log(`Processing order: ${orderId}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch order data with ticket customization
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        events!inner(
          name,
          event_date,
          venue,
          logo_url,
          ticket_customization,
          organizations!inner(name, logo_url)
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.error('Order fetch error:', orderError);
      throw new Error(`Order not found: ${orderError.message}`);
    }
    
    if (!order) {
      throw new Error("Order not found");
    }

    console.log('Order data retrieved:', {
      customerName: order.customer_name,
      eventName: order.events.name,
      organizationName: order.events.organizations.name,
      venue: order.events.venue
    });

    // Fetch tickets with proper joins
    const { data: orderItems, error: orderItemsError } = await supabase
      .from("order_items")
      .select(`
        *,
        ticket_types!inner(name),
        tickets!inner(*)
      `)
      .eq("order_id", orderId);

    if (orderItemsError) {
      console.error('Order items fetch error:', orderItemsError);
      throw new Error(`Tickets not found: ${orderItemsError.message}`);
    }

    if (!orderItems?.length) {
      throw new Error("No tickets found for this order");
    }

    // Flatten tickets from order items
    const tickets = orderItems.flatMap(item => 
      item.tickets.map(ticket => ({
        ...ticket,
        order_item: item,
        ticket_type_name: item.ticket_types.name,
        unit_price: item.unit_price
      }))
    );

    console.log(`Found ${tickets.length} tickets to process`);

    // Create PDF with beautiful design matching React component
    const pdf = new jsPDF();
    
    // Process each ticket
    for (let i = 0; i < tickets.length; i++) {
      // Add new page for each ticket after the first
      if (i > 0) {
        pdf.addPage();
      }

      try {
        // Prepare ticket data with status
        const ticketData: TicketData = {
          ticket_code: sanitizeText(tickets[i].ticket_code, 'INVALID'),
          ticket_type_name: sanitizeText(tickets[i].ticket_type_name, 'General Admission'),
          customer_name: sanitizeText(order.customer_name, 'Guest'),
          event_name: sanitizeText(order.events.name, 'Event'),
          event_date: order.events.event_date || new Date().toISOString(),
          venue: sanitizeText(order.events.venue, 'TBA'),
          price: Number(tickets[i].unit_price) || 0,
          order_id: orderId,
          status: tickets[i].status || 'valid'
        };

        console.log(`Processing ticket ${i + 1}: ${ticketData.ticket_code}`);

        // Create beautiful ticket page matching React design
        await createTicketPage(pdf, ticketData, order.events.logo_url, order.events.ticket_customization);

        console.log(`Completed ticket ${i + 1}`);
        
      } catch (ticketError) {
        console.error(`Error processing ticket ${i + 1}:`, ticketError);
        // Continue with next ticket instead of failing completely
      }
    }

    // Generate PDF output
    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

    console.log("=== PDF Generation Completed Successfully ===");

    return new Response(
      JSON.stringify({
        pdf: pdfBase64,
        filename: `tickets-${orderId}.pdf`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("=== PDF Generation Error ===", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

Deno.serve(handler);