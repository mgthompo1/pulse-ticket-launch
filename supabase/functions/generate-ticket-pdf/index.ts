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

// Create beautiful ticket design matching React component
async function createTicketPage(pdf: jsPDF, ticket: TicketData, logoUrl?: string): Promise<void> {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const cardWidth = 160; // Fixed width for card
  const cardX = (pageWidth - cardWidth) / 2; // Center the card
  let currentY = 30;

  // Card background with subtle gradient effect (simulate with light gray)
  pdf.setFillColor(249, 250, 251); // Very light gray
  pdf.roundedRect(cardX, currentY, cardWidth, 200, 8, 8, 'F');
  
  // Card border
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(cardX, currentY, cardWidth, 200, 8, 8, 'S');

  const contentX = cardX + 15;
  currentY += 20;

  // Logo section (if available)
  if (logoUrl && logoUrl.length > 50) {
    try {
      // Add logo - simplified approach
      const logoY = currentY;
      currentY += 25; // Space for logo
    } catch (error) {
      console.warn('Logo loading failed:', error);
    }
  }

  // Event name (header)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  const eventNameLines = pdf.splitTextToSize(ticket.event_name, cardWidth - 30);
  pdf.text(eventNameLines, contentX, currentY);
  currentY += eventNameLines.length * 8 + 5;

  // Venue (if available)
  if (ticket.venue) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`📍 ${ticket.venue}`, contentX, currentY);
    currentY += 15;
  }

  // Border line
  pdf.setDrawColor(229, 231, 235);
  pdf.line(contentX, currentY, contentX + cardWidth - 30, currentY);
  currentY += 15;

  // Event details section
  const sectionSpacing = 12;

  // Date and time
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text("📅", contentX, currentY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(formatDate(ticket.event_date), contentX + 10, currentY);
  currentY += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  const timeStr = formatTime(ticket.event_date);
  if (timeStr) {
    pdf.text(timeStr, contentX + 10, currentY);
  }
  currentY += sectionSpacing;

  // Ticket type
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text("🎫", contentX, currentY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(ticket.ticket_type_name, contentX + 10, currentY);
  currentY += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text("Ticket Type", contentX + 10, currentY);
  currentY += sectionSpacing;

  // Customer name
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text("👤", contentX, currentY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(ticket.customer_name, contentX + 10, currentY);
  currentY += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text("Attendee", contentX + 10, currentY);
  currentY += 15;

  // Border line before QR section
  pdf.setDrawColor(229, 231, 235);
  pdf.line(contentX, currentY, contentX + cardWidth - 30, currentY);
  currentY += 15;

  // QR Code section
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text("Scan QR Code at Event", contentX + (cardWidth - 30) / 2, currentY, { align: 'center' });
  currentY += 10;

  // Generate and add QR code
  const qrCodeUrl = await generateQR(ticket);
  if (qrCodeUrl && qrCodeUrl.length > 50) {
    try {
      const qrSize = 40;
      const qrX = contentX + (cardWidth - 30 - qrSize) / 2;
      pdf.addImage(qrCodeUrl, 'PNG', qrX, currentY, qrSize, qrSize);
      currentY += qrSize + 8;
    } catch (qrError) {
      console.warn('Failed to add QR code:', qrError);
      currentY += 20;
    }
  } else {
    currentY += 20;
  }

  // Ticket code and status
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text(`Ticket Code: ${ticket.ticket_code}`, contentX + (cardWidth - 30) / 2, currentY, { align: 'center' });
  currentY += 6;
  pdf.setTextColor(34, 197, 94); // Green color for status
  pdf.text(`Status: ${ticket.status.toUpperCase()}`, contentX + (cardWidth - 30) / 2, currentY, { align: 'center' });
  currentY += 15;

  // Final border line
  pdf.setDrawColor(229, 231, 235);
  pdf.line(contentX, currentY, contentX + cardWidth - 30, currentY);
  currentY += 8;

  // Footer
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(107, 114, 128);
  pdf.text("Please present this ticket at the event entrance", contentX + (cardWidth - 30) / 2, currentY, { align: 'center' });
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

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        events!inner(
          name,
          event_date,
          venue,
          logo_url,
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
        await createTicketPage(pdf, ticketData, order.events.logo_url);

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