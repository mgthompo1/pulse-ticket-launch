import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "npm:jspdf@2.5.1";
import QRCode from "npm:qrcode@1.5.3";
import React from "npm:react@18.3.1";
import { renderToString } from "npm:react-dom@18.3.1/server";

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

// Create PDF from React component with pixel-perfect layout
async function createTicketPageFromReact(pdf: jsPDF, ticket: TicketData, logoUrl?: string, ticketCustomization?: any): Promise<void> {
  const qrCodeUrl = await generateQR(ticket);
  
  const ticketProps = {
    ticket: {
      id: ticket.ticket_code,
      ticket_code: ticket.ticket_code,
      status: ticket.status,
      ticketTypeName: ticket.ticket_type_name,
      eventName: ticket.event_name,
      eventDate: ticket.event_date,
      customerName: ticket.customer_name
    },
    eventDetails: {
      venue: ticket.venue,
      logo_url: logoUrl
    },
    organizationDetails: {},
    ticketCustomization,
    qrCodeUrl
  };

  // Since we can't easily render HTML to canvas in Deno, we'll recreate the exact styling manually
  // but with pixel-perfect dimensions and colors from the React component
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Card dimensions matching max-w-md (448px) scaled for PDF
  const cardWidth = 160;
  const cardHeight = 220;
  const cardX = (pageWidth - cardWidth) / 2;
  const cardY = (pageHeight - cardHeight) / 2;
  
  // Background gradient (to bottom right, #ffffff, #f8fafc)
  for (let i = 0; i < 8; i++) {
    const opacity = 0.03 - (i * 0.003);
    const offset = i * 0.3;
    pdf.setFillColor(248, 250, 252); // #f8fafc
    pdf.setGState(new pdf.GState({opacity: opacity}));
    pdf.roundedRect(cardX - offset, cardY - offset, cardWidth + (offset * 2), cardHeight + (offset * 2), 8, 8, 'F');
  }
  
  pdf.setGState(new pdf.GState({opacity: 1}));
  
  // Main card background
  pdf.setFillColor(255, 255, 255); // #ffffff
  pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 8, 8, 'F');
  
  // Card border - 2px solid rgba(99, 102, 241, 0.2)
  pdf.setDrawColor(99, 102, 241, 0.2);
  pdf.setLineWidth(2);
  pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 8, 8, 'S');
  
  // Box shadow simulation
  pdf.setFillColor(0, 0, 0, 0.05);
  pdf.roundedRect(cardX + 3, cardY + 3, cardWidth, cardHeight, 8, 8, 'F');
  
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 8, 8, 'F');

  // Content (padding: 24px)
  const contentX = cardX + 24;
  let currentY = cardY + 24;
  const contentWidth = cardWidth - 48;

  // Header section
  if (logoUrl && logoUrl.length > 10) {
    // Logo height: 48px (scaled down for PDF)
    const logoHeight = 20;
    currentY += logoHeight + 6; // margin-bottom: 12px
  }

  // Event name (fontSize: 20px, fontWeight: bold, color: #0f172a)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42); // #0f172a
  const eventNameLines = pdf.splitTextToSize(ticket.event_name, contentWidth);
  pdf.text(eventNameLines, contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += (eventNameLines.length * 8) + 4;

  // Venue (fontSize: 14px, color: #64748b, marginTop: 4px)
  if (ticket.venue) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139); // #64748b
    const venueText = `📍 ${ticket.venue}`;
    pdf.text(venueText, contentX + contentWidth / 2, currentY, { align: 'center' });
    currentY += 8;
  }

  // Header border (borderBottom: 1px solid #e5e7eb, paddingBottom: 16px, marginBottom: 24px)
  currentY += 6;
  pdf.setDrawColor(229, 231, 235); // #e5e7eb
  pdf.setLineWidth(1);
  pdf.line(contentX, currentY, contentX + contentWidth, currentY);
  currentY += 20;

  // Event details section (marginBottom: 24px)
  const itemSpacing = 18; // gap: 12px + marginBottom: 12px
  const iconOffset = 18;

  // Date section (display: flex, alignItems: center, gap: 12px)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(99, 102, 241); // #6366f1
  pdf.text("📅", contentX, currentY + 3);
  
  // Date text (fontWeight: 500, color: #0f172a)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text(formatDate(ticket.event_date), contentX + iconOffset, currentY);
  
  // Time text (fontSize: 14px, color: #64748b)
  const timeStr = formatTime(ticket.event_date);
  if (timeStr) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(timeStr, contentX + iconOffset, currentY + 8);
  }
  currentY += itemSpacing;

  // Ticket type section
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(99, 102, 241);
  pdf.text("🎫", contentX, currentY + 3);
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text(ticket.ticket_type_name, contentX + iconOffset, currentY);
  
  // Label (fontSize: 12px, color: #64748b)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Ticket Type", contentX + iconOffset, currentY + 8);
  currentY += itemSpacing;

  // Customer name section
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(99, 102, 241);
  pdf.text("👤", contentX, currentY + 3);
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text(ticket.customer_name, contentX + iconOffset, currentY);
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Attendee", contentX + iconOffset, currentY + 8);
  currentY += 24;

  // QR Code section (borderTop: 1px solid #e5e7eb, paddingTop: 16px, marginBottom: 16px)
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(1);
  pdf.line(contentX, currentY, contentX + contentWidth, currentY);
  currentY += 16;

  // QR section header (fontSize: 14px, fontWeight: 500, color: #64748b, marginBottom: 12px)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Scan QR Code at Event", contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += 12;

  // QR code (border: 1px solid #e5e7eb, borderRadius: 4px, marginBottom: 12px)
  if (qrCodeUrl && qrCodeUrl.length > 50) {
    try {
      const qrSize = 40;
      const qrX = contentX + (contentWidth - qrSize) / 2;
      
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(1);
      pdf.roundedRect(qrX - 2, currentY - 2, qrSize + 4, qrSize + 4, 2, 2, 'S');
      
      pdf.addImage(qrCodeUrl, 'PNG', qrX, currentY, qrSize, qrSize);
      currentY += qrSize + 12;
    } catch (qrError) {
      console.warn('Failed to add QR code:', qrError);
      currentY += 24;
    }
  }

  // Ticket details (fontSize: 12px, color: #64748b)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  
  // Ticket code (fontFamily: monospace, fontWeight: 500, marginBottom: 4px)
  const ticketCodeText = `Ticket Code: ${ticket.ticket_code}`;
  pdf.text(ticketCodeText, contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += 6;
  
  // Status (textTransform: capitalize, fontWeight: 500, color: #16a34a)
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(34, 197, 94); // #16a34a
  const statusText = `Status: ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}`;
  pdf.text(statusText, contentX + contentWidth / 2, currentY, { align: 'center' });
  currentY += 16;

  // Footer (borderTop: 1px solid #e5e7eb, paddingTop: 16px)
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(1);
  pdf.line(contentX, currentY, contentX + contentWidth, currentY);
  currentY += 16;

  // Footer text (fontSize: 12px, color: #64748b)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Please present this ticket at the event entrance", contentX + contentWidth / 2, currentY, { align: 'center' });
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