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
  
  // Card dimensions and positioning - making it larger and more prominent
  const cardWidth = 140;
  const cardHeight = 180;
  const cardX = (pageWidth - cardWidth) / 2;
  const cardY = (pageHeight - cardHeight) / 2;
  
  // Background gradient simulation with multiple layers
  // Create gradient effect using multiple rectangles with decreasing opacity
  for (let i = 0; i < 5; i++) {
    const opacity = 0.05 - (i * 0.008);
    const offset = i * 0.5;
    pdf.setFillColor(99, 102, 241); // Primary color
    pdf.setGState(new pdf.GState({opacity: opacity}));
    pdf.roundedRect(cardX - offset, cardY - offset, cardWidth + (offset * 2), cardHeight + (offset * 2), 12, 12, 'F');
  }
  
  // Reset opacity for main card
  pdf.setGState(new pdf.GState({opacity: 1}));
  
  // Main card background
  pdf.setFillColor(255, 255, 255); // White background
  pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 8, 8, 'F');
  
  // Card border with primary color
  pdf.setDrawColor(99, 102, 241, 0.2); // Primary with opacity
  pdf.setLineWidth(1);
  pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 8, 8, 'S');
  
  // Add subtle shadow effect
  pdf.setFillColor(0, 0, 0, 0.1);
  pdf.roundedRect(cardX + 2, cardY + 2, cardWidth, cardHeight, 8, 8, 'F');
  
  // Reset for content
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 8, 8, 'F');

  const contentX = cardX + 12;
  let currentY = cardY + 20;
  const contentWidth = cardWidth - 24;

  // Header section with optional logo
  if (logoUrl && logoUrl.length > 10) {
    try {
      // Add logo with proper scaling
      const logoHeight = 16;
      const logoY = currentY;
      const logoX = contentX + (contentWidth - 60) / 2; // Center logo
      // Note: In a real implementation, you'd fetch and add the actual logo
      currentY += logoHeight + 8;
    } catch (error) {
      console.warn('Logo loading failed:', error);
    }
  }

  // Event name (main title)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42); // slate-900 equivalent
  const eventNameLines = pdf.splitTextToSize(ticket.event_name, contentWidth);
  const eventNameY = currentY;
  pdf.text(eventNameLines, contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += (eventNameLines.length * 6) + 8;

  // Venue with icon-like styling
  if (ticket.venue) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139); // slate-500 equivalent
    const venueText = `📍 ${ticket.venue}`;
    pdf.text(venueText, contentX + contentWidth / 2, currentY, { align: 'center' });
    currentY += 12;
  }

  // Header separator line
  pdf.setDrawColor(226, 232, 240); // border equivalent
  pdf.setLineWidth(0.5);
  pdf.line(contentX, currentY, contentX + contentWidth, currentY);
  currentY += 12;

  // Event details section with improved spacing and icons
  const detailSectionY = currentY;
  const itemSpacing = 16;
  const iconOffset = 8;

  // Date and time with calendar icon styling
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(99, 102, 241); // primary color for icons
  pdf.text("📅", contentX, currentY + 3);
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(formatDate(ticket.event_date), contentX + iconOffset, currentY);
  
  const timeStr = formatTime(ticket.event_date);
  if (timeStr) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(timeStr, contentX + iconOffset, currentY + 6);
  }
  currentY += itemSpacing;

  // Ticket type
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(99, 102, 241);
  pdf.text("🎫", contentX, currentY + 3);
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(ticket.ticket_type_name, contentX + iconOffset, currentY);
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Ticket Type", contentX + iconOffset, currentY + 6);
  currentY += itemSpacing;

  // Customer name
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(99, 102, 241);
  pdf.text("👤", contentX, currentY + 3);
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(ticket.customer_name, contentX + iconOffset, currentY);
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Attendee", contentX + iconOffset, currentY + 6);
  currentY += 18;

  // QR section separator
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(contentX, currentY, contentX + contentWidth, currentY);
  currentY += 12;

  // QR Code section with improved styling
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Scan QR Code at Event", contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // Generate and add QR code with border
  const qrCodeUrl = await generateQR(ticket);
  if (qrCodeUrl && qrCodeUrl.length > 50) {
    try {
      const qrSize = 32;
      const qrX = contentX + (contentWidth - qrSize) / 2;
      
      // QR code border
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.rect(qrX - 1, currentY - 1, qrSize + 2, qrSize + 2, 'S');
      
      // Add QR code
      pdf.addImage(qrCodeUrl, 'PNG', qrX, currentY, qrSize, qrSize);
      currentY += qrSize + 10;
    } catch (qrError) {
      console.warn('Failed to add QR code:', qrError);
      currentY += 20;
    }
  } else {
    currentY += 20;
  }

  // Ticket details with improved formatting
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  
  // Ticket code with monospace styling simulation
  const ticketCodeText = `Ticket Code: ${ticket.ticket_code}`;
  pdf.text(ticketCodeText, contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  
  // Status with color coding
  pdf.setTextColor(34, 197, 94); // green-500 for valid status
  const statusText = `Status: ${ticket.status.toUpperCase()}`;
  pdf.text(statusText, contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += 12;

  // Final separator
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(contentX, currentY, contentX + contentWidth, currentY);
  currentY += 8;

  // Footer message
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
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