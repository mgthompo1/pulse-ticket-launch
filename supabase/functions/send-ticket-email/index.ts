import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
          organizations!inner(
            name,
            email
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

    // Generate tickets only for ticket items (not merchandise)
    const ticketItems = order.order_items.filter((item: any) => item.item_type === 'ticket');
    
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

    const allTickets = (await Promise.all(ticketPromises)).flat();
    logStep("Tickets generated", { count: allTickets.length });

    // Create email content
    const emailContent = {
      to: order.customer_email,
      subject: `Your tickets for ${order.events.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">🎫 Your Tickets Are Ready!</h1>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #333;">${order.events.name}</h2>
            <p><strong>📅 Date:</strong> ${new Date(order.events.event_date).toLocaleDateString()}</p>
            <p><strong>📍 Venue:</strong> ${order.events.venue || 'TBA'}</p>
            <p><strong>👤 Name:</strong> ${order.customer_name}</p>
            <p><strong>📧 Email:</strong> ${order.customer_email}</p>
          </div>

          <h3>Your Tickets:</h3>
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

          <p style="color: #666; font-size: 14px;">
            Questions? Contact the event organizer: ${order.events.organizations.email}
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Powered by Ticket2 Platform
          </p>
        </div>
      `
    };

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
      from: "TicketFlo Platform <onboarding@resend.dev>",
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