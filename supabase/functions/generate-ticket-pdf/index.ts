import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

// Helper function to safely sanitize text
function sanitizeText(text: string, fallback: string = 'N/A'): string {
  if (!text || typeof text !== 'string') return fallback;
  return text.replace(/[<>&"']/g, (char) => {
    const entityMap: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entityMap[char] || char;
  }).trim() || fallback;
}

// Generate simple HTML ticket
function generateTicketHTML(tickets: TicketData[], orderInfo: any): string {
  const ticketsHTML = tickets.map(ticket => `
    <div style="page-break-after: always; padding: 40px; border: 2px solid #e5e7eb; margin: 20px; background: white; font-family: Arial, sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 10px 0; color: #1f2937;">
            ${sanitizeText(ticket.event_name)}
          </h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px 0;">
            ${new Date(ticket.event_date).toLocaleDateString()} • ${sanitizeText(ticket.venue || 'TBA')}
          </p>
          <div style="margin: 20px 0;">
            <h3 style="font-size: 16px; font-weight: bold; margin: 0 0 5px 0;">
              ${sanitizeText(ticket.ticket_type_name)}
            </h3>
            <p style="font-size: 18px; font-weight: bold; margin: 0;">
              ${sanitizeText(ticket.customer_name)}
            </p>
          </div>
        </div>
        <div style="text-align: center; padding-left: 20px;">
          <div style="width: 120px; height: 120px; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <span style="font-size: 10px; color: #9ca3af;">QR Code</span>
          </div>
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            ${ticket.ticket_code}
          </p>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <span style="font-size: 12px; color: #9ca3af;">
          Ticket: ${ticket.ticket_code}
        </span>
        ${ticket.price > 0 ? `<span style="font-size: 16px; font-weight: bold;">$${ticket.price.toFixed(2)}</span>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Tickets</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        @media print { 
          .ticket { page-break-after: always; }
          .ticket:last-child { page-break-after: avoid; }
        }
      </style>
    </head>
    <body>
      ${ticketsHTML}
    </body>
    </html>
  `;
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

    // Prepare ticket data
    const ticketDataArray: TicketData[] = tickets.map(ticket => ({
      ticket_code: sanitizeText(ticket.ticket_code, 'INVALID'),
      ticket_type_name: sanitizeText(ticket.ticket_type_name, 'General Admission'),
      customer_name: sanitizeText(order.customer_name, 'Guest'),
      event_name: sanitizeText(order.events.name, 'Event'),
      event_date: order.events.event_date || new Date().toISOString(),
      venue: sanitizeText(order.events.venue, 'TBA'),
      price: Number(ticket.unit_price) || 0,
      order_id: orderId
    }));

    // Generate HTML content
    const htmlContent = generateTicketHTML(ticketDataArray, order);

    // For now, return HTML instead of PDF to avoid library issues
    // This will display properly formatted tickets that can be printed
    return new Response(
      JSON.stringify({
        html: htmlContent,
        filename: `tickets-${orderId}.html`,
        message: "HTML ticket generated successfully. You can print this as PDF from your browser."
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