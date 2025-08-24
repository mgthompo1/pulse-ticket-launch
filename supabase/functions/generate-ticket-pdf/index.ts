import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "npm:jspdf@2.5.1";
import QRCode from "npm:qrcode@1.5.3";

// Helper function to download and convert image to base64
async function downloadAndConvertImage(url: string): Promise<string | null> {
  try {
    console.log(`Attempting to download image from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    console.log(`Image content type: ${contentType}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Determine image type from response headers or URL
    let finalContentType = contentType || 'image/png';
    
    // Ensure we have a valid image content type
    if (!finalContentType.startsWith('image/')) {
      // Try to guess from URL extension
      if (url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')) {
        finalContentType = 'image/jpeg';
      } else if (url.toLowerCase().includes('.png')) {
        finalContentType = 'image/png';
      } else if (url.toLowerCase().includes('.webp')) {
        finalContentType = 'image/webp';
      } else {
        finalContentType = 'image/png'; // Default fallback
      }
    }
    
    const dataUrl = `data:${finalContentType};base64,${base64}`;
    console.log(`Successfully converted image to base64. Content type: ${finalContentType}, Data URL length: ${dataUrl.length}`);
    
    return dataUrl;
  } catch (error) {
    console.log(`Error downloading image: ${error}`);
    return null;
  }
}

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

    // Sanitize and validate text data to prevent encoding issues
    const sanitizeText = (text: string): string => {
      if (!text) return '';
      // Normalize unicode and remove problematic characters
      let cleaned = text.normalize('NFD');
      // Remove any non-ASCII characters and control characters
      cleaned = cleaned.replace(/[^\x20-\x7E]/g, '');
      // Remove extra whitespace and trim
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      // Ensure it's not empty after cleaning
      return cleaned || 'Unknown';
    };

    // Sanitize order data
    order.customer_name = sanitizeText(order.customer_name);
    order.events.name = sanitizeText(order.events.name);
    if (order.events.venue) {
      order.events.venue = sanitizeText(order.events.venue);
    }
    if (order.events.organizations?.name) {
      order.events.organizations.name = sanitizeText(order.events.organizations.name);
    }

    logStep("Order details retrieved", { 
      customerName: order.customer_name,
      eventName: order.events.name,
      orgName: order.events.organizations?.name,
      venue: order.events.venue
    });

    // Get all tickets from ticket items
    const ticketItems = order.order_items.filter((item: any) => item.item_type === 'ticket');
    const allTickets: TicketData[] = [];

    for (const item of ticketItems) {
      for (const ticket of item.tickets || []) {
        allTickets.push({
          ticket_code: sanitizeText(ticket.ticket_code),
          ticket_type_name: sanitizeText(item.ticket_types?.name || 'General Admission'),
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

    logStep("Tickets to process", { 
      count: allTickets.length,
      sampleTicket: allTickets[0] 
    });

    // Download and prepare logo for PDF
    let logoDataUrl: string | null = null;
    
    try {
      // Try to get event logo first, then organization logo as fallback
      const logoUrl = order.events.logo_url || order.events.organizations?.logo_url;
      
      logStep("Logo URL check", { 
        eventLogoUrl: order.events.logo_url,
        orgLogoUrl: order.events.organizations?.logo_url,
        selectedLogoUrl: logoUrl
      });
      
      if (logoUrl && logoUrl !== 'placeholder.svg' && logoUrl !== '/placeholder.svg' && !logoUrl.includes('windcave')) {
        logStep("Downloading logo", { logoUrl });
        logoDataUrl = await downloadAndConvertImage(logoUrl);
        
        if (logoDataUrl) {
          logStep("Logo prepared successfully", { 
            logoUrl,
            dataUrlLength: logoDataUrl.length
          });
        } else {
          logStep("Logo download failed", { logoUrl });
        }
      } else {
        logStep("No logo URL available");
      }
    } catch (logoError) {
      logStep("Logo processing failed", { error: logoError });
      // Continue without logo if there's an error
    }

    // Create PDF with modern card-based design to match the React component
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const cardWidth = pageWidth - (2 * margin);
    const cardHeight = 140;

    for (let i = 0; i < allTickets.length; i++) {
      const ticket = allTickets[i];
      
      if (i > 0) {
        pdf.addPage();
      }

      // Generate QR code with better quality
      logStep("Generating QR code", { ticketCode: ticket.ticket_code });
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({
        ticketCode: ticket.ticket_code,
        eventName: ticket.event_name,
        customerName: ticket.customer_name,
        status: 'valid'
      }), {
        width: 400,
        margin: 1,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });

      const cardY = 40;
      
      // Modern card design with subtle shadow effect
      pdf.setFillColor(250, 250, 250); // Very light gray shadow
      pdf.roundedRect(margin + 2, cardY + 2, cardWidth, cardHeight, 8, 8, 'F');
      
      // Main card background
      pdf.setFillColor(255, 255, 255); // Pure white
      pdf.setDrawColor(229, 231, 235); // Light border
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin, cardY, cardWidth, cardHeight, 8, 8, 'FD');
      
      // Header gradient section
      pdf.setFillColor(248, 250, 252); // Very light blue
      pdf.roundedRect(margin + 1, cardY + 1, cardWidth - 2, 45, 7, 7, 'F');
      
      // Add orange accent line to match theme
      pdf.setDrawColor(255, 77, 0); // Orange theme color
      pdf.setLineWidth(3);
      pdf.line(margin + 1, cardY + 45, margin + cardWidth - 1, cardY + 45);

      // Header section with logo and event name
      let headerY = cardY + 15;
      let eventNameX = margin + 15;
      
      // Logo placement (improved positioning)
      if (logoDataUrl && logoDataUrl.length > 100) {
        try {
          const logoX = margin + 15;
          const logoY = headerY - 5;
          
          let imageFormat = 'PNG';
          if (logoDataUrl.includes('data:image/jpeg')) {
            imageFormat = 'JPEG';
          } else if (logoDataUrl.includes('data:image/png')) {
            imageFormat = 'PNG';
          }
          
          if (logoDataUrl.startsWith('data:image/')) {
            // Improved logo sizing
            const logoSize = 20;
            pdf.addImage(logoDataUrl, imageFormat, logoX, logoY, logoSize, logoSize);
            eventNameX = logoX + logoSize + 15;
            
            logStep("Logo added to PDF", { logoX, logoY, logoSize, format: imageFormat });
          }
        } catch (logoError) {
          logStep("Failed to add logo to PDF", { error: logoError });
          eventNameX = margin + 15;
        }
      }
      
      // Event name with modern typography
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55); // Dark gray
      
      let safeEventName = (ticket.event_name || 'Event')
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Event';
      
      try {
        pdf.text(safeEventName, eventNameX, headerY + 5);
      } catch (textError) {
        pdf.text('Event', eventNameX, headerY + 5);
      }
      
      // Venue information
      if (ticket.venue) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128); // Gray-500
        
        const safeVenue = (ticket.venue || 'TBA').replace(/[^\w\s.-]/g, '').trim() || 'TBA';
        try {
          // Using Unicode emoji for location pin
          pdf.text(`📍 ${safeVenue}`, eventNameX, headerY + 15);
        } catch (textError) {
          pdf.text(`Location: ${safeVenue}`, eventNameX, headerY + 15);
        }
      }

      // Content section with improved layout
      let contentY = cardY + 65;
      const leftColumnX = margin + 15;
      const rightColumnX = pageWidth - margin - 70;
      
      // Left column - Event details with colorful icons
      
      // Date and time section
      pdf.setFillColor(255, 77, 0); // Orange theme color
      pdf.circle(leftColumnX + 2, contentY - 1, 2, 'F');
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      
      const eventDate = new Date(ticket.event_date);
      const formattedDate = eventDate.toLocaleDateString('en-NZ', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const formattedTime = eventDate.toLocaleTimeString('en-NZ', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      pdf.text(`${formattedDate}`, leftColumnX + 8, contentY);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${formattedTime}`, leftColumnX + 8, contentY + 6);
      
      // Ticket type section
      contentY += 20;
      pdf.setFillColor(16, 185, 129); // Emerald
      pdf.circle(leftColumnX + 2, contentY - 1, 2, 'F');
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text(ticket.ticket_type_name, leftColumnX + 8, contentY);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Ticket Type', leftColumnX + 8, contentY + 6);
      
      // Attendee section
      contentY += 20;
      pdf.setFillColor(99, 102, 241); // Indigo
      pdf.circle(leftColumnX + 2, contentY - 1, 2, 'F');
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      
      let safeCustomerName = (ticket.customer_name || 'Attendee')
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Attendee';
      
      try {
        pdf.text(safeCustomerName, leftColumnX + 8, contentY);
      } catch (textError) {
        pdf.text('Attendee', leftColumnX + 8, contentY);
      }
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Attendee', leftColumnX + 8, contentY + 6);

      // Right column - QR Code with modern styling
      const qrSize = 55;
      const qrX = rightColumnX;
      const qrY = cardY + 55;
      
      // QR Code container with subtle border and orange accent
      pdf.setFillColor(249, 250, 251); // Gray-50
      pdf.setDrawColor(255, 77, 0); // Orange border
      pdf.setLineWidth(1);
      pdf.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 15, 4, 4, 'FD');
      
      // White background for QR
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(qrX, qrY, qrSize, qrSize, 2, 2, 'F');
      
      // Add QR code
      pdf.addImage(qrCodeDataUrl, 'PNG', qrX + 2, qrY + 2, qrSize - 4, qrSize - 4);
      
      // Ticket code below QR
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 77, 0); // Orange theme color
      
      const textWidth = pdf.getTextWidth(ticket.ticket_code);
      const centeredX = qrX + (qrSize / 2) - (textWidth / 2);
      pdf.text(ticket.ticket_code, centeredX, qrY + qrSize + 8);

      // Footer section with modern styling
      const footerY = cardY + cardHeight - 20;
      
      // Subtle divider
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 15, footerY, margin + cardWidth - 15, footerY);
      
      // Footer content
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Present this ticket for entry verification', margin + 15, footerY + 8);
      
      // Price badge (right aligned) with orange theme
      const priceText = `$${ticket.price.toFixed(2)}`;
      const priceWidth = pdf.getTextWidth(priceText);
      
      // Price background with orange theme
      pdf.setFillColor(255, 77, 0); // Orange theme color
      pdf.roundedRect(margin + cardWidth - priceWidth - 20, footerY + 2, priceWidth + 10, 10, 2, 2, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(priceText, margin + cardWidth - priceWidth - 15, footerY + 9);
    }

    logStep("PDF generation completed", { ticketCount: allTickets.length });

    // Get PDF as ArrayBuffer
    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

    return new Response(JSON.stringify({ 
      pdf: pdfBase64,
      filename: `tickets-${orderId}.pdf`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR", { 
      message: errorMessage, 
      stack: errorStack,
      error: error 
    });
    console.error("Full error details:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});