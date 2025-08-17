import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TICKET-EMAIL] ${step}${detailsStr}`);
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

    // Get order details with related data
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
            email,
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

    // Check delivery method from custom answers
    const customAnswers = order.custom_answers as any;
    const deliveryMethod = customAnswers?.deliveryMethod || 'qr_ticket';
    
    logStep("Processing delivery method", { deliveryMethod });

    // Generate tickets only for ticket items (not merchandise) and only if QR tickets are requested
    const ticketItems = order.order_items.filter((item: any) => item.item_type === 'ticket');
    let allTickets: any[] = [];

    if (deliveryMethod === 'qr_ticket') {
      const ticketPromises = ticketItems.map(async (item: any) => {
        const tickets = [];
        for (let i = 0; i < item.quantity; i++) {
          const { data: ticket, error: ticketError } = await supabaseClient
            .rpc("generate_ticket_code")
            .single();

          if (ticketError) throw ticketError;

          const { error: insertError } = await supabaseClient
            .from("tickets")
            .insert({
              order_item_id: item.id,
              ticket_code: ticket,
              status: "valid"
            });

          if (insertError) throw insertError;

          tickets.push({
            code: ticket,
            type: item.ticket_types?.name || 'General Admission',
            price: item.unit_price
          });
        }
        return tickets;
      });

      allTickets = (await Promise.all(ticketPromises)).flat();
      logStep("Tickets generated", { count: allTickets.length });
    } else {
      logStep("Skipping ticket generation for confirmation email");
    }

    // Get email customization
    const emailCustomization = order.events.email_customization as any;
    const orgLogo = order.events.organizations.logo_url;
    
    // Create customized email content based on delivery method
    let emailContent: any;
    
    if (deliveryMethod === 'qr_ticket') {
      emailContent = {
        to: order.customer_email,
        subject: emailCustomization?.content?.subject || `Your tickets for ${order.events.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: ${emailCustomization?.template?.backgroundColor || '#ffffff'};">
            ${orgLogo ? `<div style="text-align: center; padding: 20px 0;"><img src="${orgLogo}" alt="Organization Logo" style="max-width: 200px; height: auto;"></div>` : ''}
            
            <div style="padding: 20px;">
              <h1 style="color: ${emailCustomization?.template?.headerColor || '#333'};">🎫 ${emailCustomization?.content?.headerText || 'Your Tickets Are Ready!'}</h1>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #333;">${order.events.name}</h2>
                <p><strong>📅 Date:</strong> ${new Date(order.events.event_date).toLocaleDateString()}</p>
                <p><strong>📍 Venue:</strong> ${order.events.venue || 'TBA'}</p>
                <p><strong>👤 Name:</strong> ${order.customer_name}</p>
                <p><strong>📧 Email:</strong> ${order.customer_email}</p>
              </div>

              <h3 style="color: ${emailCustomization?.template?.textColor || '#000000'};">Your Tickets:</h3>
              ${allTickets.map(ticket => `
                <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                  <strong>${ticket.type}</strong><br>
                  <code style="background: #f0f0f0; padding: 5px; font-size: 14px;">${ticket.code}</code><br>
                  <small>Price: $${ticket.price}</small>
                </div>
              `).join('')}

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin-top: 0;">Important Information:</h4>
                <ul>
                  <li>Present your ticket codes at the event entrance</li>
                  <li>Screenshots or printed versions are accepted</li>
                  <li>Each ticket is valid for one person only</li>
                  <li>Arrive early to avoid queues</li>
                </ul>
              </div>

              <div style="color: ${emailCustomization?.template?.textColor || '#000000'}; padding: 15px; margin: 20px 0;">
                ${emailCustomization?.content?.bodyText || 'We are excited to see you at the event!'}
              </div>

              <p style="color: #666; font-size: 14px;">
                Questions? Contact the event organizer: ${order.events.organizations.email}
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                ${emailCustomization?.content?.footerText || 'Powered by TicketFlo Platform'}
              </p>
            </div>
          </div>
        `
      };
    } else {
      // Confirmation email with detailed event information
      emailContent = {
        to: order.customer_email,
        subject: emailCustomization?.content?.subject || `Event Confirmation: ${order.events.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: ${emailCustomization?.template?.backgroundColor || '#ffffff'};">
            ${orgLogo ? `<div style="text-align: center; padding: 20px 0;"><img src="${orgLogo}" alt="Organization Logo" style="max-width: 200px; height: auto;"></div>` : ''}
            
            <div style="padding: 20px;">
              <h1 style="color: ${emailCustomization?.template?.headerColor || '#333'};">✅ ${emailCustomization?.content?.headerText || 'Registration Confirmed!'}</h1>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #333;">${order.events.name}</h2>
                <p><strong>📅 Date & Time:</strong> ${new Date(order.events.event_date).toLocaleDateString()} at ${new Date(order.events.event_date).toLocaleTimeString()}</p>
                <p><strong>📍 Venue:</strong> ${order.events.venue || 'TBA'}</p>
                <p><strong>👤 Attendee:</strong> ${order.customer_name}</p>
                <p><strong>📧 Email:</strong> ${order.customer_email}</p>
                ${order.customer_phone ? `<p><strong>📞 Phone:</strong> ${order.customer_phone}</p>` : ''}
              </div>

              ${order.events.description ? `
              <div style="background: #fff9e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
                <h3 style="color: #333; margin-top: 0;">Event Details:</h3>
                <p style="color: #333; line-height: 1.6;">${order.events.description}</p>
              </div>
              ` : ''}

              <h3 style="color: ${emailCustomization?.template?.textColor || '#000000'};">Your Registration:</h3>
              ${ticketItems.map(item => `
                <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                  <strong>${item.ticket_types?.name || 'General Admission'}</strong> - ${item.quantity} ${item.quantity === 1 ? 'person' : 'people'}<br>
                  <small>Total: $${(item.unit_price * item.quantity).toFixed(2)}</small>
                </div>
              `).join('')}

              <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #2e7d32;">What to Expect:</h4>
                <ul style="color: #2e7d32;">
                  <li>Arrive 15-30 minutes before the event starts</li>
                  <li>Bring a valid ID for check-in</li>
                  <li>Check your email for any last-minute updates</li>
                  <li>Contact us if you have any questions</li>
                </ul>
              </div>

              <div style="color: ${emailCustomization?.template?.textColor || '#000000'}; padding: 15px; margin: 20px 0;">
                ${emailCustomization?.content?.bodyText || 'We look forward to seeing you at the event!'}
              </div>

              <p style="color: #666; font-size: 14px;">
                Questions? Contact the event organizer: ${order.events.organizations.email}
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                ${emailCustomization?.content?.footerText || 'Powered by TicketFlo Platform'}
              </p>
            </div>
          </div>
        `
      };
    }

    // Send email using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    
    const resend = new Resend(resendApiKey);
    
    logStep("Sending email", { 
      recipient: emailContent.to,
      subject: emailContent.subject,
      ticketCount: allTickets.length,
      hasApiKey: !!resendApiKey
    });

    const emailResponse = await resend.emails.send({
      from: "TicketFlo <onboarding@resend.dev>", // Using verified Resend domain
      to: [emailContent.to],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    logStep("Resend API response", { 
      response: emailResponse,
      hasError: !!emailResponse.error,
      hasData: !!emailResponse.data
    });

    if (emailResponse.error) {
      logStep("Resend error details", { 
        error: emailResponse.error,
        errorMessage: emailResponse.error.message,
        errorName: emailResponse.error.name
      });
      throw new Error(`Email failed: ${JSON.stringify(emailResponse.error)}`);
    }

    if (!emailResponse.data) {
      logStep("No data in email response", { fullResponse: emailResponse });
      throw new Error(`Email failed: No data returned from Resend API`);
    }

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    // Update order status
    await supabaseClient
      .from("orders")
      .update({ status: "completed" })
      .eq("id", orderId);

    // Send organiser notification if enabled
    try {
      logStep("Checking organiser notification settings");
      const emailCustomization = order.events.email_customization as any;
      const notificationsEnabled = emailCustomization?.notifications?.organiserNotifications;
      
      if (notificationsEnabled) {
        logStep("Sending organiser notification");
        await supabaseClient.functions.invoke('send-organiser-notification', {
          body: { orderId: orderId }
        });
      }
    } catch (notificationError) {
      logStep("ERROR sending organiser notification", { message: notificationError });
      // Don't fail the main function if notification fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      ticketsGenerated: allTickets.length,
      emailSent: true 
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