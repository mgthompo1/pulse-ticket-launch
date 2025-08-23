import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "npm:jspdf@2.5.1";
import QRCode from "npm:qrcode@1.5.3";

// Helper function to download and convert image to base64
async function downloadAndConvertImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Determine image type from response headers or URL
    const contentType = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${contentType};base64,${base64}`;
    
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
      customerNameOriginal: order.customer_name,
      eventName: order.events.name,
      eventNameOriginal: order.events.name,
      orgName: order.events.organizations?.name,
      venue: order.events.venue,
      orderData: {
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone
      }
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
    let logoWidth = 0;
    let logoHeight = 0;
    
    try {
      // Try to get event logo first, then organization logo as fallback
      const logoUrl = order.events.logo_url || order.events.organizations?.logo_url;
      
      logStep("Logo URL check", { 
        eventLogoUrl: order.events.logo_url,
        orgLogoUrl: order.events.organizations?.logo_url,
        selectedLogoUrl: logoUrl
      });
      
      if (logoUrl) {
        logStep("Downloading logo", { logoUrl });
        logoDataUrl = await downloadAndConvertImage(logoUrl);
        
        if (logoDataUrl) {
          // For PDF, we'll use standard logo dimensions
          // Most logos work well with these dimensions
          logoHeight = 20; // 20mm height
          logoWidth = 20;  // 20mm width (square aspect ratio)
          
          logStep("Logo prepared successfully", { 
            width: logoWidth, 
            height: logoHeight,
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
      
      // Display logo if available
      let eventNameX = margin + 8;
      
      if (logoDataUrl && logoWidth > 0 && logoHeight > 0) {
        try {
          // Add logo to the left of the event name
          const logoX = margin + 8;
          const logoY = currentY - logoHeight + 2;
          
          // Try to add the logo image to the PDF
          pdf.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
          
          // Move event name to the right of the logo
          eventNameX = logoX + logoWidth + 8;
          
          logStep("Logo added to PDF", { 
            logoX, 
            logoY, 
            logoWidth, 
            logoHeight 
          });
        } catch (logoError) {
          logStep("Failed to add logo to PDF", { error: logoError });
          // Fallback to no logo if there's an error
          eventNameX = margin + 8;
        }
      } else {
        logStep("No logo available for PDF", { 
          hasLogoData: !!logoDataUrl,
          logoWidth,
          logoHeight
        });
      }
      
      // Event name with better typography
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42); // Dark slate
      
      // Ensure event name is valid text before rendering
      let safeEventName = ticket.event_name || 'Event';
      
      // Additional sanitization for event name
      safeEventName = safeEventName
        .replace(/[^\w\s.-]/g, '') // Keep only alphanumeric, spaces, dots, and dashes
        .replace(/\s+/g, ' ')      // Normalize whitespace
        .trim();
      
      if (!safeEventName || safeEventName.length === 0) {
        safeEventName = 'Event';
      }
      
      logStep("Rendering event name", { 
        original: ticket.event_name,
        sanitized: safeEventName 
      });
      
      try {
        pdf.text(safeEventName, eventNameX, currentY);
      } catch (textError) {
        logStep("Text rendering error for event name", { 
          error: textError, 
          eventName: safeEventName,
          x: eventNameX,
          y: currentY
        });
        // Fallback to safe text
        pdf.text('Event', eventNameX, currentY);
      }
      
      // Venue with location icon effect
      if (ticket.venue) {
        currentY += 8;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139); // Muted text
        
        // Ensure venue is valid text before rendering
        const safeVenue = ticket.venue || 'TBA';
        try {
          pdf.text('Venue: ' + safeVenue, eventNameX, currentY);
        } catch (textError) {
          logStep("Text rendering error for venue", { 
            error: textError, 
            venue: safeVenue,
            x: eventNameX,
            y: currentY
          });
          // Fallback to safe text
          pdf.text('Venue: TBA', eventNameX, currentY);
        }
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
      
      // Ensure customer name is valid text before rendering
      let safeCustomerName = ticket.customer_name || 'Attendee';
      
      // Additional sanitization for customer name to prevent corruption
      safeCustomerName = safeCustomerName
        .replace(/[^\w\s.-]/g, '') // Keep only alphanumeric, spaces, dots, and dashes
        .replace(/\s+/g, ' ')      // Normalize whitespace
        .trim();
      
      if (!safeCustomerName || safeCustomerName.length === 0) {
        safeCustomerName = 'Attendee';
      }
      
      logStep("Rendering customer name", { 
        original: ticket.customer_name,
        sanitized: safeCustomerName 
      });
      
      try {
        pdf.text(safeCustomerName, leftColumnX + 8, currentY);
      } catch (textError) {
        logStep("Text rendering error for customer name", { 
          error: textError, 
          customerName: safeCustomerName,
          x: leftColumnX + 8,
          y: currentY
        });
        // Fallback to safe text
        pdf.text('Attendee', leftColumnX + 8, currentY);
      }
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