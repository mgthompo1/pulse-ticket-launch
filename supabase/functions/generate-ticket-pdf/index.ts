import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "npm:jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketData {
  ticketCode: string;
  ticketType: string;
  customerName: string;
  eventName: string;
  eventDate: string;
  venue: string;
  price: number;
  organizationName: string;
  logoUrl?: string;
}

function generateTicketPDF(tickets: TicketData[]): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  tickets.forEach((ticket, index) => {
    if (index > 0) {
      doc.addPage();
    }
    
    // Set background color
    doc.setFillColor(248, 249, 250);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Add border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(2);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(51, 51, 51);
    doc.text('EVENT TICKET', pageWidth / 2, 30, { align: 'center' });
    
    // Organization name
    doc.setFontSize(14);
    doc.setTextColor(102, 102, 102);
    doc.text(ticket.organizationName, pageWidth / 2, 45, { align: 'center' });
    
    // Event details section
    doc.setFillColor(255, 255, 255);
    doc.rect(20, 60, pageWidth - 40, 80, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(20, 60, pageWidth - 40, 80);
    
    // Event name
    doc.setFontSize(20);
    doc.setTextColor(51, 51, 51);
    doc.text(ticket.eventName, 30, 80);
    
    // Event date
    doc.setFontSize(12);
    doc.setTextColor(102, 102, 102);
    doc.text(`Date: ${new Date(ticket.eventDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 30, 95);
    
    // Venue
    doc.text(`Venue: ${ticket.venue || 'TBA'}`, 30, 105);
    
    // Ticket type
    doc.text(`Ticket Type: ${ticket.ticketType}`, 30, 115);
    
    // Price
    doc.text(`Price: $${ticket.price.toFixed(2)}`, 30, 125);
    
    // Customer details section
    doc.setFillColor(240, 249, 255);
    doc.rect(20, 160, pageWidth - 40, 40, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(20, 160, pageWidth - 40, 40);
    
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text('Ticket Holder', 30, 175);
    
    doc.setFontSize(12);
    doc.setTextColor(102, 102, 102);
    doc.text(`Name: ${ticket.customerName}`, 30, 190);
    
    // Ticket code section
    doc.setFillColor(255, 248, 220);
    doc.rect(20, 220, pageWidth - 40, 50, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(20, 220, pageWidth - 40, 50);
    
    doc.setFontSize(16);
    doc.setTextColor(51, 51, 51);
    doc.text('Ticket Code', 30, 240);
    
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(ticket.ticketCode, 30, 255);
    
    // Instructions
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.setFont(undefined, 'normal');
    const instructions = [
      '• Present this ticket at the event entrance',
      '• Digital or printed versions are accepted',
      '• This ticket is valid for one person only',
      '• Arrive early to avoid queues'
    ];
    
    instructions.forEach((instruction, i) => {
      doc.text(instruction, 20, 285 + (i * 8));
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(153, 153, 153);
    doc.text('Powered by TicketFlo Platform', pageWidth / 2, pageHeight - 10, { align: 'center' });
  });
  
  return doc.output('arraybuffer') as unknown as Uint8Array;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { orderId, download } = await req.json();

    // Get order details with tickets
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        events!inner(
          name,
          event_date,
          venue,
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
            name
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Get tickets for this order
    const ticketItems = order.order_items.filter((item: any) => item.item_type === 'ticket');
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from("tickets")
      .select("*")
      .in('order_item_id', ticketItems.map((item: any) => item.id));

    if (ticketsError || !tickets || tickets.length === 0) {
      throw new Error("No tickets found for this order");
    }

    // Prepare ticket data for PDF
    const ticketData: TicketData[] = tickets.map((ticket: any) => {
      const orderItem = ticketItems.find((item: any) => item.id === ticket.order_item_id);
      return {
        ticketCode: ticket.ticket_code,
        ticketType: orderItem?.ticket_types?.name || 'General Admission',
        customerName: order.customer_name,
        eventName: order.events.name,
        eventDate: order.events.event_date,
        venue: order.events.venue,
        price: orderItem?.unit_price || 0,
        organizationName: order.events.organizations.name,
        logoUrl: order.events.organizations.logo_url
      };
    });

    // Generate PDF
    const pdfBytes = generateTicketPDF(ticketData);

    if (download) {
      // Return PDF for download
      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="tickets-${orderId}.pdf"`,
        },
      });
    } else {
      // Return PDF data as base64 for email attachment
      const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
      return new Response(JSON.stringify({ 
        success: true, 
        pdfData: base64Pdf,
        filename: `tickets-${orderId}.pdf`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});