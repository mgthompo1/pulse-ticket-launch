import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-ORGANISER-NOTIFICATION] ${step}${detailsStr}`);
};

serve(async (req) => {
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
    logStep("Processing organiser notification for order", { orderId });

    // Get order details with related data including custom answers
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        events!inner(
          name,
          event_date,
          venue,
          description,
          email_customization,
          organizations!inner(
            name,
            email
          )
        ),
        order_items!inner(
          quantity,
          unit_price,
          item_type,
          ticket_types(
            name,
            description
          ),
          merchandise(
            name
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    logStep("Order details retrieved", { 
      customerEmail: order.customer_email,
      eventName: order.events.name 
    });

    // Check if organiser notifications are enabled
    const emailCustomization = order.events.email_customization as any;
    const notificationsEnabled = emailCustomization?.notifications?.organiserNotifications;
    const organiserEmail = emailCustomization?.notifications?.organiserEmail;

    if (!notificationsEnabled || !organiserEmail) {
      logStep("Organiser notifications not enabled or no email provided");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Organiser notifications not enabled" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Organiser notifications enabled", { organiserEmail });

    // Get tickets for this order
    const { data: tickets } = await supabaseClient
      .from("tickets")
      .select(`
        *,
        order_items!inner(
          ticket_types(name)
        )
      `)
      .in("order_item_id", order.order_items.map((item: any) => item.id));

    // Format custom answers if they exist
    const customAnswers = order.custom_answers as Record<string, any> || {};
    const customAnswersHtml = Object.keys(customAnswers).length > 0 
      ? `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="margin-top: 0;">Custom Answers:</h4>
          ${Object.entries(customAnswers).map(([question, answer]) => 
            `<p><strong>${question}:</strong> ${answer}</p>`
          ).join('')}
        </div>
      ` 
      : '';

    // Format ticket details
    const ticketDetails = tickets?.map(ticket => {
      const ticketType = ticket.order_items?.ticket_types?.name || 'General Admission';
      return `
        <div style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 3px;">
          <strong>Ticket Code:</strong> ${ticket.ticket_code}<br>
          <strong>Type:</strong> ${ticketType}
        </div>
      `;
    }).join('') || '';

    // Create email content for organiser
    const emailContent = {
      to: organiserEmail,
      subject: `New ticket sale for ${order.events.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">🎫 New Ticket Sale!</h1>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #333;">${order.events.name}</h2>
            <p><strong>📅 Event Date:</strong> ${new Date(order.events.event_date).toLocaleDateString()}</p>
            <p><strong>📍 Venue:</strong> ${order.events.venue || 'TBA'}</p>
          </div>

          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Customer Details:</h3>
            <p><strong>Name:</strong> ${order.customer_name}</p>
            <p><strong>Email:</strong> ${order.customer_email}</p>
            ${order.customer_phone ? `<p><strong>Phone:</strong> ${order.customer_phone}</p>` : ''}
            <p><strong>Total Amount:</strong> $${order.total_amount}</p>
            <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
          </div>

          ${customAnswersHtml}

          <h3>Tickets Purchased:</h3>
          ${ticketDetails}

          <h3>Order Items:</h3>
          ${order.order_items.map((item: any) => `
            <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
              <strong>${item.item_type === 'ticket' ? (item.ticket_types?.name || 'General Admission') : (item.merchandise?.name || 'Merchandise')}</strong><br>
              <small>Quantity: ${item.quantity} | Unit Price: $${item.unit_price}</small>
            </div>
          `).join('')}
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This notification was sent because you have organiser notifications enabled for this event.
          </p>
        </div>
      `
    };

    // Send email using Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    logStep("Sending organiser notification email", { 
      recipient: emailContent.to,
      subject: emailContent.subject
    });

    const emailResponse = await resend.emails.send({
      from: "Ticket2 <onboarding@resend.dev>",
      to: [emailContent.to],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (emailResponse.error) {
      throw new Error(`Email failed: ${emailResponse.error.message}`);
    }

    logStep("Organiser notification email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({ 
      success: true, 
      emailSent: true,
      organiserEmail: organiserEmail
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});