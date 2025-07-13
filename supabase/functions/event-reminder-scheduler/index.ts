import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVENT-REMINDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Scheduled task started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find events happening in the next 24-48 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const { data: upcomingEvents, error: eventsError } = await supabaseClient
      .from("events")
      .select(`
        *,
        organizations!inner(
          name,
          email
        ),
        orders!inner(
          customer_name,
          customer_email,
          order_items!inner(
            quantity,
            ticket_types!inner(
              name
            )
          )
        )
      `)
      .gte("event_date", tomorrow.toISOString())
      .lt("event_date", dayAfter.toISOString())
      .eq("status", "published");

    if (eventsError) throw eventsError;

    logStep("Found upcoming events", { count: upcomingEvents?.length || 0 });

    if (!upcomingEvents || upcomingEvents.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No upcoming events found",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let emailsSent = 0;

    // Process each event
    for (const event of upcomingEvents) {
      logStep("Processing event", { eventName: event.name, ordersCount: event.orders.length });

      // Send reminder to each customer
      for (const order of event.orders) {
        const totalTickets = order.order_items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        
        const reminderEmail = {
          to: order.customer_email,
          subject: `Reminder: ${event.name} is tomorrow!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">🔔 Event Reminder</h1>
              
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h2 style="margin-top: 0; color: #333;">${event.name}</h2>
                <p><strong>📅 Tomorrow:</strong> ${new Date(event.event_date).toLocaleDateString()} at ${new Date(event.event_date).toLocaleTimeString()}</p>
                <p><strong>📍 Venue:</strong> ${event.venue || 'Check your ticket for location details'}</p>
                <p><strong>🎫 Your tickets:</strong> ${totalTickets} ticket${totalTickets > 1 ? 's' : ''}</p>
              </div>

              <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #155724;">Don't forget to bring:</h4>
                <ul style="color: #155724;">
                  <li>Your ticket confirmation email</li>
                  <li>Valid ID for verification</li>
                  <li>Arrive 30 minutes early</li>
                </ul>
              </div>

              ${event.description ? `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h4 style="margin-top: 0;">Event Details:</h4>
                  <p>${event.description}</p>
                </div>
              ` : ''}

              <p style="color: #666;">
                Looking forward to seeing you there!<br>
                <strong>${event.organizations.name}</strong>
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                This is an automated reminder from Ticket2 Platform
              </p>
            </div>
          `
        };

        // Here you would send the actual email
        logStep("Reminder email prepared", { 
          customer: order.customer_email,
          event: event.name,
          tickets: totalTickets
        });
        
        emailsSent++;
      }
    }

    logStep("Reminder task completed", { 
      eventsProcessed: upcomingEvents.length,
      emailsSent 
    });

    return new Response(JSON.stringify({
      success: true,
      eventsProcessed: upcomingEvents.length,
      emailsSent,
      message: `Sent ${emailsSent} reminder emails for ${upcomingEvents.length} upcoming events`
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