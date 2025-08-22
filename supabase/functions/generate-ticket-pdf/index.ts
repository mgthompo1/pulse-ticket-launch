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
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-TICKET-PDF] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { orderId } = await req.json();
    logStep("Processing order", { orderId });

    // Get order details with tickets
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        events!inner(
          name,
          event_date,
          venue,
          logo_url,
          ticket_customization,
          organizations!inner(
            name,
            logo_url
          )
        ),
        order_items!inner(
          id,
          quantity,
          unit_price,
          item_type,
          ticket_types(
            name,
            description
          ),
          tickets(
            id,
            ticket_code,
            status
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    logStep("Order details retrieved", { 
      customerName: order.customer_name,
      eventName: order.events.name 
    });

    // Get all tickets from ticket items
    const ticketItems = order.order_items.filter((item: any) => item.item_type === 'ticket');
    const allTickets: TicketData[] = [];

    for (const item of ticketItems) {
      for (const ticket of item.tickets || []) {
        allTickets.push({
          ticket_code: ticket.ticket_code,
          ticket_type_name: item.ticket_types?.name || 'General Admission',
          customer_name: order.customer_name,
          event_name: order.events.name,
          event_date: order.events.event_date,
          venue: order.events.venue,
          price: item.unit_price,
          order_id: orderId
        });
      }
    }

    if (allTickets.length === 0) {
      throw new Error("No tickets found for this order");
    }

    logStep("Tickets to process", { count: allTickets.length });

    // Create PDF with better styling to match browser UI
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const ticketWidth = pageWidth - (2 * margin);
    const ticketHeight = 120; // Increased height for better spacing

    for (let i = 0; i < allTickets.length; i++) {
      const ticket = allTickets[i];
      
      if (i > 0) {
        pdf.addPage();
      }

      // Generate QR code
      logStep("Generating QR code", { ticketCode: ticket.ticket_code });
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({
        ticketCode: ticket.ticket_code,
        eventName: ticket.event_name,
        customerName: ticket.customer_name,
        status: 'valid'
      }), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const ticketY = 40;
      
      // Main ticket card with rounded corners effect (using multiple rectangles)
      pdf.setDrawColor(59, 130, 246); // Primary blue border
      pdf.setLineWidth(1);
      pdf.setFillColor(255, 255, 255); // White background
      pdf.roundedRect(margin, ticketY, ticketWidth, ticketHeight, 3, 3, 'FD');
      
      // Gradient effect simulation with subtle fill
      pdf.setFillColor(248, 250, 252); // Very light blue/gray
      pdf.roundedRect(margin + 1, ticketY + 1, ticketWidth - 2, 25, 2, 2, 'F');

      // Header section with event name
      let currentY = ticketY + 12;
      
      // Organization/Event logo placeholder
      if (order.events.logo_url || order.events.organizations?.logo_url) {
        // Logo placeholder (since we can't easily load external images in jsPDF)
        pdf.setFillColor(240, 240, 240);
        pdf.circle(margin + 15, currentY - 3, 6, 'F');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text('LOGO', margin + 11, currentY);
      }
      
      // Event name with better typography
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42); // Dark slate
      const eventNameX = order.events.logo_url || order.events.organizations?.logo_url ? margin + 30 : margin + 8;
      pdf.text(ticket.event_name, eventNameX, currentY);
      
      // Venue with location icon effect
      if (ticket.venue) {
        currentY += 8;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139); // Muted text
        pdf.text('📍 ' + ticket.venue, eventNameX, currentY);
      }
      
      // Separator line
      currentY += 12;
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 8, currentY, margin + ticketWidth - 8, currentY);
      
      // Event details section with icons
      currentY += 15;
      const leftColumnX = margin + 8;
      const iconSize = 3;
      
      // Date and time with calendar icon
      pdf.setFillColor(59, 130, 246);
      pdf.circle(leftColumnX + iconSize/2, currentY - 2, iconSize/2, 'F');
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      
      const eventDate = new Date(ticket.event_date);
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      pdf.text(formattedDate, leftColumnX + 8, currentY);
      currentY += 6;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(formattedTime, leftColumnX + 8, currentY);
      
      // Ticket type with ticket icon
      currentY += 12;
      pdf.setFillColor(59, 130, 246);
      pdf.circle(leftColumnX + iconSize/2, currentY - 2, iconSize/2, 'F');
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(ticket.ticket_type_name, leftColumnX + 8, currentY);
      currentY += 6;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('Ticket Type', leftColumnX + 8, currentY);
      
      // Attendee with user icon
      currentY += 12;
      pdf.setFillColor(59, 130, 246);
      pdf.circle(leftColumnX + iconSize/2, currentY - 2, iconSize/2, 'F');
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(ticket.customer_name, leftColumnX + 8, currentY);
      currentY += 6;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('Attendee', leftColumnX + 8, currentY);
      
      // QR Code section (right side)
      const qrSize = 45;
      const qrX = pageWidth - margin - qrSize - 8;
      const qrY = ticketY + 35;
      
      // QR code background
      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 15, 2, 2, 'FD');
      
      // QR code
      pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      
      // QR code label
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 116, 139);
      const qrLabelX = qrX + (qrSize / 2);
      pdf.text('Scan QR Code at Event', qrLabelX, qrY + qrSize + 8, { align: 'center' });
      
      // Ticket code and status section
      const bottomSectionY = ticketY + ticketHeight - 25;
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 8, bottomSectionY, margin + ticketWidth - 8, bottomSectionY);
      
      // Ticket code
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('Ticket Code:', margin + 8, bottomSectionY + 8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(ticket.ticket_code, margin + 35, bottomSectionY + 8);
      
      // Status
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('Status:', margin + 8, bottomSectionY + 15);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(34, 197, 94); // Green for valid status
      pdf.text('Valid', margin + 25, bottomSectionY + 15);
      
      // Footer instruction
      const footerY = ticketY + ticketHeight - 8;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      const footerText = 'Please present this ticket at the event entrance';
      pdf.text(footerText, pageWidth / 2, footerY, { align: 'center' });
      
      // Price (if space allows)
      if (ticket.price > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(`$${ticket.price.toFixed(2)}`, qrX + qrSize - 20, bottomSectionY + 8);
      }
      
      // Page footer
      pdf.setFontSize(6);
      pdf.setTextColor(156, 163, 175);
      pdf.text('Powered by TicketFlo Platform', margin, pageHeight - 8);
      pdf.text(`Order ID: ${ticket.order_id}`, pageWidth - margin - 40, pageHeight - 8);
      
      // Reset colors
      pdf.setTextColor(0, 0, 0);
    }

    // Convert PDF to base64
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    
    logStep("PDF generated successfully", { 
      ticketCount: allTickets.length,
      pdfSize: pdfBase64.length 
    });

    return new Response(JSON.stringify({ 
      success: true,
      pdf: pdfBase64,
      ticketCount: allTickets.length,
      filename: `${order.events.name.replace(/[^a-zA-Z0-9]/g, '-')}-tickets.pdf`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    console.error("PDF generation error:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});