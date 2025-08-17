import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReceiptEmailRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  eventName: string;
  totalAmount: number;
  paymentDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      orderId, 
      customerEmail, 
      customerName, 
      eventName, 
      totalAmount, 
      paymentDate 
    }: ReceiptEmailRequest = await req.json();

    // Create Supabase client with service role key for database access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get detailed order information
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        events (
          name,
          event_date,
          venue,
          organizations (
            name,
            email,
            logo_url
          )
        ),
        order_items (
          id,
          quantity,
          unit_price,
          item_type,
          ticket_types (
            name,
            description
          ),
          merchandise (
            name,
            description
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    const organization = order.events?.organizations;
    const event = order.events;
    
    // Format order items for the email
    const orderItemsHtml = order.order_items?.map((item: any) => {
      const itemName = item.ticket_types?.name || item.merchandise?.name || 'Unknown Item';
      const itemDescription = item.ticket_types?.description || item.merchandise?.description || '';
      
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0;">
            <div style="font-weight: 600;">${itemName}</div>
            ${itemDescription ? `<div style="color: #6b7280; font-size: 14px;">${itemDescription}</div>` : ''}
          </td>
          <td style="padding: 12px 0; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 0; text-align: right;">$${item.unit_price.toFixed(2)}</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 600;">$${(item.quantity * item.unit_price).toFixed(2)}</td>
        </tr>
      `;
    }).join('') || '';

    // Format the payment date
    const formattedDate = new Date(paymentDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const formattedEventDate = event?.event_date ? new Date(event.event_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'TBD';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Receipt</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            ${organization?.logo_url ? `<img src="${organization.logo_url}" alt="${organization?.name}" style="max-height: 60px; margin-bottom: 20px;">` : ''}
            <h1 style="color: #1f2937; margin: 0;">Payment Receipt</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Thank you for your purchase!</p>
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Order Details</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div><strong>Order ID:</strong> ${orderId}</div>
              <div><strong>Payment Date:</strong> ${formattedDate}</div>
              <div><strong>Customer:</strong> ${customerName}</div>
              <div><strong>Email:</strong> ${customerEmail}</div>
            </div>
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Event Information</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div><strong>Event:</strong> ${eventName}</div>
              <div><strong>Date:</strong> ${formattedEventDate}</div>
              ${event?.venue ? `<div style="grid-column: 1 / -1;"><strong>Venue:</strong> ${event.venue}</div>` : ''}
            </div>
          </div>

          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
            <h2 style="margin: 0; padding: 20px 20px 10px 20px; color: #1f2937; font-size: 18px;">Items Purchased</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                  <th style="text-align: left; padding: 12px 20px; font-weight: 600;">Item</th>
                  <th style="text-align: center; padding: 12px 10px; font-weight: 600;">Qty</th>
                  <th style="text-align: right; padding: 12px 10px; font-weight: 600;">Price</th>
                  <th style="text-align: right; padding: 12px 20px; font-weight: 600;">Total</th>
                </tr>
              </thead>
              <tbody style="padding: 0 20px;">
                ${orderItemsHtml}
              </tbody>
            </table>
            <div style="padding: 20px; border-top: 2px solid #e5e7eb; background: #f9fafb;">
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 700; color: #1f2937;">
                  Total: $${totalAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 8px; color: #6b7280;">
            <p style="margin: 0 0 10px 0;">Questions about your order?</p>
            <p style="margin: 0;">
              Contact us at <a href="mailto:${organization?.email || 'support@example.com'}" style="color: #2563eb;">${organization?.email || 'support@example.com'}</a>
            </p>
            ${organization?.name ? `<p style="margin: 10px 0 0 0; font-size: 14px;">${organization.name}</p>` : ''}
          </div>
        </body>
      </html>
    `;

    // Initialize Resend inside the handler
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const emailResponse = await resend.emails.send({
      from: `${organization?.name || 'Event Organization'} <receipts@resend.dev>`,
      to: [customerEmail],
      subject: `Receipt for ${eventName} - Order #${orderId.slice(0, 8)}`,
      html: emailHtml,
    });

    console.log("Receipt email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-receipt-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);