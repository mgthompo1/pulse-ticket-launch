// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "npm:jspdf@2.5.1";
import QRCode from "npm:qrcode@1.5.3";
import React from "https://esm.sh/react@18.3.1";
import { renderToString } from "https://esm.sh/react-dom@18.3.1/server";

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

// Helper function to safely sanitize text for PDF
function sanitizeText(text: string, fallback: string = 'N/A'): string {
  if (!text || typeof text !== 'string') return fallback;
  // Only remove control characters and null bytes, but keep most printable characters
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim() || fallback;
}

// Generate QR code as base64
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

// Format date exactly like the React component
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  } catch {
    return dateString;
  }
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    };
    return date.toLocaleTimeString('en-US', options);
  } catch {
    return '';
  }
}

// Fetch an image URL and return a data URL usable by jsPDF
async function fetchImageAsDataUrl(url?: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
  try {
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const isJpeg = contentType.includes('jpeg') || contentType.includes('jpg');
    const format: 'PNG' | 'JPEG' = isJpeg ? 'JPEG' : 'PNG';
    const dataUrl = `data:${contentType || (isJpeg ? 'image/jpeg' : 'image/png')};base64,${base64}`;
    return { dataUrl, format };
  } catch {
    return null;
  }
}

// Create the exact TicketDisplay component in React
const TicketDisplay = ({ ticket, eventDetails, organizationDetails, ticketCustomization, qrCodeUrl }: {
  ticket: {
    id: string;
    ticket_code: string;
    status: string;
    ticketTypeName: string;
    eventName: string;
    eventDate: string;
    customerName: string;
  };
  eventDetails?: {
    venue?: string;
    logo_url?: string;
    description?: string;
  };
  organizationDetails?: {
    logo_url?: string;
    name?: string;
  };
  ticketCustomization?: {
    content: {
      showLogo: boolean;
      logoSource?: "event" | "organization" | "custom";
      customLogoUrl?: string;
    };
  };
  qrCodeUrl: string;
}) => {
  // Determine which logo to show based on ticket customization
  const getLogoUrl = () => {
    if (!ticketCustomization?.content.showLogo) {
      return null;
    }
    
    const logoSource = ticketCustomization.content.logoSource || 'event';
    
    switch (logoSource) {
      case 'organization':
        return organizationDetails?.logo_url;
      case 'custom':
        return ticketCustomization.content.customLogoUrl;
      case 'event':
      default:
        return eventDetails?.logo_url;
    }
  };

  const logoUrl = getLogoUrl();

  return React.createElement('div', {
    style: {
      maxWidth: '448px',
      margin: '0 auto',
      background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)',
      border: '2px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  }, 
    React.createElement('div', {
      style: { padding: '24px' }
    },
      // Header with logo and event name
      React.createElement('div', {
        style: {
          textAlign: 'center',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '16px',
          marginBottom: '24px'
        }
      },
        logoUrl ? React.createElement('img', {
          src: logoUrl,
          alt: 'Logo',
          style: {
            height: '48px',
            width: 'auto',
            margin: '0 auto 12px',
            display: 'block',
            objectFit: 'contain',
            maxWidth: '200px'
          }
        }) : null,
        React.createElement('h1', {
          style: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#0f172a',
            margin: '0'
          }
        }, ticket.eventName),
        eventDetails?.venue ? React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '14px',
            color: '#64748b',
            marginTop: '4px'
          }
        }, '📍 ', eventDetails.venue) : null
      ),
      
      // Event details
      React.createElement('div', {
        style: { marginBottom: '24px' }
      },
        // Date and time
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }
        },
          React.createElement('span', {
            style: { color: '#6366f1', fontSize: '16px' }
          }, '📅'),
          React.createElement('div', {},
            React.createElement('div', {
              style: { fontWeight: '500', color: '#0f172a' }
            }, formatDate(ticket.eventDate)),
            React.createElement('div', {
              style: { fontSize: '14px', color: '#64748b' }
            }, formatTime(ticket.eventDate))
          )
        ),
        
        // Ticket type
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }
        },
          React.createElement('span', {
            style: { color: '#6366f1', fontSize: '16px' }
          }, '🎫'),
          React.createElement('div', {},
            React.createElement('div', {
              style: { fontWeight: '500', color: '#0f172a' }
            }, ticket.ticketTypeName),
            React.createElement('div', {
              style: { fontSize: '12px', color: '#64748b' }
            }, 'Ticket Type')
          )
        ),
        
        // Customer name
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }
        },
          React.createElement('span', {
            style: { color: '#6366f1', fontSize: '16px' }
          }, '👤'),
          React.createElement('div', {},
            React.createElement('div', {
              style: { fontWeight: '500', color: '#0f172a' }
            }, ticket.customerName),
            React.createElement('div', {
              style: { fontSize: '12px', color: '#64748b' }
            }, 'Attendee')
          )
        )
      ),
      
      // QR Code section
      React.createElement('div', {
        style: {
          borderTop: '1px solid #e5e7eb',
          paddingTop: '16px',
          marginBottom: '16px'
        }
      },
        React.createElement('div', {
          style: { textAlign: 'center' }
        },
          React.createElement('div', {
            style: {
              fontSize: '14px',
              fontWeight: '500',
              color: '#64748b',
              marginBottom: '12px'
            }
          }, 'Scan QR Code at Event'),
          qrCodeUrl ? React.createElement('img', {
            src: qrCodeUrl,
            alt: 'QR Code',
            style: {
              margin: '0 auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              display: 'block',
              marginBottom: '12px'
            }
          }) : null,
          React.createElement('div', {
            style: {
              fontSize: '12px',
              color: '#64748b'
            }
          },
            React.createElement('div', {
              style: { marginBottom: '4px' }
            }, 'Ticket Code: ', React.createElement('span', {
              style: { fontFamily: 'monospace', fontWeight: '500' }
            }, ticket.ticket_code)),
            React.createElement('div', {}, 'Status: ', React.createElement('span', {
              style: { 
                textTransform: 'capitalize',
                fontWeight: '500',
                color: '#16a34a'
              }
            }, ticket.status))
          )
        )
      ),
      
      // Footer
      React.createElement('div', {
        style: {
          borderTop: '1px solid #e5e7eb',
          paddingTop: '16px',
          textAlign: 'center'
        }
      },
        React.createElement('div', {
          style: {
            fontSize: '12px',
            color: '#64748b'
          }
        }, 'Please present this ticket at the event entrance')
      )
    )
  );
};

// Create beautiful, professional ticket PDF with modern design
async function createTicketPageFromReact(pdf: jsPDF, ticket: TicketData, logoUrl?: string, ticketCustomization?: any): Promise<void> {
  const qrCodeUrl = await generateQR(ticket);
  
  // Use full page dimensions for a professional ticket
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Create a full-page ticket design (like a concert ticket)
  const margin = 20;
  const ticketWidth = pageWidth - (margin * 2);
  const ticketHeight = pageHeight - (margin * 2);
  const ticketX = margin;
  const ticketY = margin;
  
  // Modern gradient background
  pdf.setFillColor(248, 250, 252); // Light background
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Main ticket background with subtle gradient effect
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(ticketX, ticketY, ticketWidth, ticketHeight, 12, 12, 'F');
  
  // Elegant border
  pdf.setDrawColor(226, 232, 240); // #e2e8f0
  pdf.setLineWidth(2);
  pdf.roundedRect(ticketX, ticketY, ticketWidth, ticketHeight, 12, 12, 'S');
  
  // Header section with brand colors
  const headerHeight = 60;
  pdf.setFillColor(15, 23, 42); // Dark blue header #0f172a
  pdf.roundedRect(ticketX, ticketY, ticketWidth, headerHeight, 12, 12, 'F');
  pdf.setFillColor(15, 23, 42);
  pdf.rect(ticketX, ticketY + 40, ticketWidth, 20, 'F'); // Extend header down
  
  // Content areas
  const contentPadding = 30;
  const contentX = ticketX + contentPadding;
  let currentY = ticketY + 20;
  const contentWidth = ticketWidth - (contentPadding * 2);

  // Logo in header (white on dark background)
  if (logoUrl && logoUrl.length > 10) {
    try {
      const fetched = await fetchImageAsDataUrl(logoUrl);
      if (fetched) {
        const logoHeight = 30;
        const logoWidth = 80;
        const logoX = contentX;
        pdf.addImage(fetched.dataUrl, fetched.format, logoX, currentY, logoWidth, logoHeight);
      }
    } catch (logoError) {
      console.error('Logo processing error:', logoError);
    }
  }

  // Event name in header (white text)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(255, 255, 255); // White text on dark header
  const eventNameLines = pdf.splitTextToSize(ticket.event_name, contentWidth * 0.6);
  pdf.text(eventNameLines, contentX + contentWidth - 20, currentY + 15, { align: 'right' });
  
  // Move to main content area
  currentY = ticketY + headerHeight + 30;

  // Create main content in two columns
  const leftColumnX = contentX;
  const rightColumnX = contentX + (contentWidth * 0.6);
  const columnWidth = contentWidth * 0.35;
  
  // Left column - Event Details
  let leftY = currentY;
  
  // Date section with icon
  pdf.setFillColor(99, 102, 241, 0.1); // Light purple background
  pdf.roundedRect(leftColumnX - 10, leftY - 5, columnWidth + 20, 45, 8, 8, 'F');
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text("📅 DATE & TIME", leftColumnX, leftY + 5);
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  const dateText = formatDate(ticket.event_date);
  pdf.text(dateText, leftColumnX, leftY + 18);
  
  const timeStr = formatTime(ticket.event_date);
  if (timeStr) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(100, 116, 139);
    pdf.text(timeStr, leftColumnX, leftY + 30);
  }
  leftY += 60;

  // Venue section
  if (ticket.venue) {
    pdf.setFillColor(34, 197, 94, 0.1); // Light green background
    pdf.roundedRect(leftColumnX - 10, leftY - 5, columnWidth + 20, 35, 8, 8, 'F');
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text("📍 VENUE", leftColumnX, leftY + 5);
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    const venueLines = pdf.splitTextToSize(ticket.venue, columnWidth);
    pdf.text(venueLines, leftColumnX, leftY + 18);
    leftY += 50;
  }

  // Attendee section
  pdf.setFillColor(236, 72, 153, 0.1); // Light pink background
  pdf.roundedRect(leftColumnX - 10, leftY - 5, columnWidth + 20, 35, 8, 8, 'F');
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text("👤 ATTENDEE", leftColumnX, leftY + 5);
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text(ticket.customer_name, leftColumnX, leftY + 18);
  
  // Ticket type
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`🎫 ${ticket.ticket_type_name}`, leftColumnX, leftY + 30);

  // Right column - QR Code and ticket details
  let rightY = currentY;
  
  // QR Code section with elegant styling
  const qrSectionWidth = columnWidth + 40;
  pdf.setFillColor(248, 250, 252); // Light background
  pdf.roundedRect(rightColumnX - 20, rightY - 10, qrSectionWidth, 140, 12, 12, 'F');
  
  // QR section border
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(2);
  pdf.roundedRect(rightColumnX - 20, rightY - 10, qrSectionWidth, 140, 12, 12, 'S');

  // QR section header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Your Ticket", rightColumnX + (qrSectionWidth/2) - 20, rightY + 5, { align: 'center' });
  rightY += 25;

  // QR code with professional styling
  if (qrCodeUrl && qrCodeUrl.length > 50) {
    try {
      const qrSize = 60;
      const qrX = rightColumnX + (qrSectionWidth/2) - 20 - (qrSize/2);
      
      // QR background
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(qrX - 5, rightY - 5, qrSize + 10, qrSize + 10, 8, 8, 'F');
      
      // QR border
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(2);
      pdf.roundedRect(qrX - 5, rightY - 5, qrSize + 10, qrSize + 10, 8, 8, 'S');
      
      pdf.addImage(qrCodeUrl, 'PNG', qrX, rightY, qrSize, qrSize);
      rightY += qrSize + 15;
    } catch (qrError) {
      console.warn('Failed to add QR code:', qrError);
      rightY += 30;
    }
  }

  // Ticket code with monospace styling
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text("TICKET CODE", rightColumnX + (qrSectionWidth/2) - 20, rightY, { align: 'center' });
  
  pdf.setFont("courier", "bold"); // Monospace font
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text(ticket.ticket_code, rightColumnX + (qrSectionWidth/2) - 20, rightY + 12, { align: 'center' });
  rightY += 25;
  
  // Status badge
  pdf.setFillColor(34, 197, 94, 0.2); // Green background
  pdf.roundedRect(rightColumnX - 5, rightY - 3, qrSectionWidth - 30, 15, 6, 6, 'F');
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(34, 197, 94);
  const statusText = `✓ ${ticket.status.toUpperCase()}`;
  pdf.text(statusText, rightColumnX + (qrSectionWidth/2) - 20, rightY + 5, { align: 'center' });

  // Footer section
  const footerY = ticketY + ticketHeight - 40;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(1);
  pdf.line(contentX, footerY - 20, contentX + contentWidth, footerY - 20);

  // Footer text with better styling
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Please present this ticket at the event entrance", contentX + contentWidth / 2, footerY - 5, { align: 'center' });
  
  // Price information (if available)
  if (ticket.price > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`$${ticket.price.toFixed(2)}`, contentX + contentWidth - 20, footerY - 5, { align: 'right' });
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== PDF Generation Function Started ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    console.log(`Processing order: ${orderId}`);

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

    // Fetch tickets
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
    
    for (let i = 0; i < tickets.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      try {
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

        await createTicketPageFromReact(pdf, ticketData, order.events.logo_url, order.events.ticket_customization);

        console.log(`Completed ticket ${i + 1}`);
        
      } catch (ticketError) {
        console.error(`Error processing ticket ${i + 1}:`, ticketError);
      }
    }

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