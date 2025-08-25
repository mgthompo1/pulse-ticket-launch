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

// Helper function to safely sanitize text for PDF
function sanitizeText(text: string, fallback: string = 'N/A'): string {
  if (!text || typeof text !== 'string') return fallback;
  return text.replace(/[^\w\s.-]/g, '').replace(/\s+/g, ' ').trim() || fallback;
}

// Helper function to download and convert image to base64
async function downloadImage(url: string): Promise<string | null> {
  try {
    console.log(`Downloading image from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Image download error:', error);
    return null;
  }
}

// Generate QR code as base64
async function generateQR(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
  } catch (error) {
    console.error('QR generation error:', error);
    // Return a simple text fallback
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
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

    // Create PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Process each ticket
    for (let i = 0; i < tickets.length; i++) {
      
      // Add new page for each ticket after the first
      if (i > 0) {
        pdf.addPage();
      }

      try {
        // Safely extract data
        const ticketData: TicketData = {
          ticket_code: sanitizeText(tickets[i].ticket_code, 'INVALID'),
          ticket_type_name: sanitizeText(tickets[i].ticket_type_name, 'General Admission'),
          customer_name: sanitizeText(order.customer_name, 'Guest'),
          event_name: sanitizeText(order.events.name, 'Event'),
          event_date: order.events.event_date || new Date().toISOString(),
          venue: sanitizeText(order.events.venue, 'TBA'),
          price: Number(tickets[i].unit_price) || 0,
          order_id: orderId
        };

        console.log(`Processing ticket ${i + 1}: ${ticketData.ticket_code}`);

        // Draw ticket design
        const margin = 20;
        const cardWidth = pageWidth - (margin * 2);
        const cardHeight = 200;
        const cardY = 50;

        // Background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(margin, cardY, cardWidth, cardHeight, 'F');
        
        // Border
        pdf.setDrawColor(234, 234, 234);
        pdf.setLineWidth(1);
        pdf.rect(margin, cardY, cardWidth, cardHeight);

        // Header
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(ticketData.event_name, margin + 15, cardY + 25);

        // Date and venue
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        const eventDate = new Date(ticketData.event_date).toLocaleDateString();
        pdf.text(`${eventDate} • ${ticketData.venue}`, margin + 15, cardY + 40);

        // Ticket type
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(ticketData.ticket_type_name, margin + 15, cardY + 70);

        // Customer name
        pdf.setFontSize(16);
        pdf.text(ticketData.customer_name, margin + 15, cardY + 95);

        // QR Code
        const qrData = await generateQR(ticketData.ticket_code);
        if (qrData && qrData.length > 50) { // Basic validation
          const qrSize = 60;
          const qrX = pageWidth - margin - qrSize - 15;
          const qrY = cardY + 40;
          
          try {
            pdf.addImage(qrData, 'PNG', qrX, qrY, qrSize, qrSize);
          } catch (qrError) {
            console.warn('Failed to add QR code:', qrError);
          }
        }

        // Ticket code
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Ticket: ${ticketData.ticket_code}`, margin + 15, cardY + cardHeight - 15);

        // Price
        if (ticketData.price > 0) {
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          const priceText = `$${ticketData.price.toFixed(2)}`;
          const priceWidth = pdf.getTextWidth(priceText);
          pdf.text(priceText, pageWidth - margin - priceWidth - 15, cardY + cardHeight - 15);
        }

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