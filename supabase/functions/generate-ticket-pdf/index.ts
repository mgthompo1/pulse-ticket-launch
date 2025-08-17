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

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const ticketWidth = pageWidth - (2 * margin);
    const ticketHeight = 80;

    for (let i = 0; i < allTickets.length; i++) {
      const ticket = allTickets[i];
      
      if (i > 0) {
        pdf.addPage();
      }

      // Generate QR code
      logStep("Generating QR code", { ticketCode: ticket.ticket_code });
      const qrCodeDataUrl = await QRCode.toDataURL(ticket.ticket_code, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Header with event name
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(ticket.event_name, margin, 40);

      // Event details
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const eventDate = new Date(ticket.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Date: ${eventDate}`, margin, 55);
      
      if (ticket.venue) {
        pdf.text(`Venue: ${ticket.venue}`, margin, 65);
      }

      // Ticket border
      const ticketY = 80;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, ticketY, ticketWidth, ticketHeight);

      // Ticket header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, ticketY, ticketWidth, 15, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TICKET', margin + 5, ticketY + 10);

      // Ticket details
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Ticket Type:', margin + 5, ticketY + 25);
      pdf.setFont('helvetica', 'normal');
      pdf.text(ticket.ticket_type_name, margin + 35, ticketY + 25);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Attendee:', margin + 5, ticketY + 35);
      pdf.setFont('helvetica', 'normal');
      pdf.text(ticket.customer_name, margin + 35, ticketY + 35);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Price:', margin + 5, ticketY + 45);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`$${ticket.price.toFixed(2)}`, margin + 35, ticketY + 45);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Ticket Code:', margin + 5, ticketY + 55);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(ticket.ticket_code, margin + 35, ticketY + 55);

      // Add QR code
      const qrSize = 50;
      const qrX = pageWidth - margin - qrSize;
      const qrY = ticketY + 15;
      
      pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // QR code label
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Scan at entrance', qrX + 5, qrY + qrSize + 8);

      // Instructions
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Instructions:', margin, ticketY + ticketHeight + 20);
      pdf.setFontSize(9);
      const instructions = [
        '• Present this ticket (printed or on mobile) at the event entrance',
        '• One ticket admits one person only',
        '• Arrive early to avoid queues',
        '• Keep your ticket safe - lost tickets cannot be replaced'
      ];
      
      let instructY = ticketY + ticketHeight + 30;
      for (const instruction of instructions) {
        pdf.text(instruction, margin + 5, instructY);
        instructY += 8;
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Powered by TicketFlo Platform', margin, pageHeight - 10);
      pdf.text(`Order ID: ${ticket.order_id}`, pageWidth - margin - 50, pageHeight - 10);
      
      // Reset text color
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