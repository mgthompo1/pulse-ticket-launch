import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AbandonedCart {
  id: string;
  event_id: string;
  organization_id: string;
  customer_email: string;
  customer_name: string | null;
  cart_items: any[];
  cart_total: number;
  emails_sent: number;
  status: string;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  venue: string;
  abandoned_cart_email_subject: string;
  abandoned_cart_email_content: string | null;
  abandoned_cart_discount_enabled: boolean;
  abandoned_cart_discount_code: string | null;
  abandoned_cart_discount_percent: number;
  widget_customization: any;
}

interface Organization {
  id: string;
  name: string;
  email: string;
  logo_url: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cart_id, test_mode } = await req.json();

    // If cart_id provided, send for specific cart. Otherwise, process all pending carts
    let cartsToProcess: AbandonedCart[] = [];

    if (cart_id) {
      const { data: cart, error } = await supabase
        .from("abandoned_carts")
        .select("*")
        .eq("id", cart_id)
        .single();

      if (error || !cart) {
        throw new Error("Cart not found");
      }
      cartsToProcess = [cart];
    } else {
      // Get all pending carts that are ready for email
      // First email: after delay_minutes, Second email: after 24 hours, Third: after 48 hours
      const { data: carts, error } = await supabase
        .from("abandoned_carts")
        .select(`
          *,
          events!inner (
            abandoned_cart_enabled,
            abandoned_cart_delay_minutes
          )
        `)
        .in("status", ["pending", "email_sent"])
        .lt("emails_sent", 3)
        .gt("expires_at", new Date().toISOString()) // Only get non-expired carts
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        throw error;
      }

      // Filter carts that are ready for their next email
      cartsToProcess = (carts || []).filter((cart: any) => {
        if (!cart.events?.abandoned_cart_enabled) return false;

        const createdAt = new Date(cart.created_at);
        const lastEmailAt = cart.last_email_sent_at ? new Date(cart.last_email_sent_at) : null;
        const now = new Date();
        const delayMinutes = cart.events.abandoned_cart_delay_minutes || 60;

        if (cart.emails_sent === 0) {
          // First email: after delay_minutes
          const timeSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60);
          return timeSinceCreated >= delayMinutes;
        } else if (cart.emails_sent === 1 && lastEmailAt) {
          // Second email: 24 hours after first
          const timeSinceLastEmail = (now.getTime() - lastEmailAt.getTime()) / (1000 * 60 * 60);
          return timeSinceLastEmail >= 24;
        } else if (cart.emails_sent === 2 && lastEmailAt) {
          // Third email: 48 hours after second
          const timeSinceLastEmail = (now.getTime() - lastEmailAt.getTime()) / (1000 * 60 * 60);
          return timeSinceLastEmail >= 48;
        }
        return false;
      });
    }

    console.log(`Processing ${cartsToProcess.length} abandoned carts`);

    const results = [];

    for (const cart of cartsToProcess) {
      try {
        // Get event details
        const { data: event } = await supabase
          .from("events")
          .select("*")
          .eq("id", cart.event_id)
          .single();

        if (!event) continue;

        // Get organization details
        const { data: org } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", cart.organization_id)
          .single();

        if (!org) continue;

        // Build email content
        const customerName = cart.customer_name || "there";
        const firstName = customerName.split(" ")[0];

        // Determine which email to send (1st, 2nd, or 3rd)
        const emailNumber = cart.emails_sent + 1;

        let subject = event.abandoned_cart_email_subject || "You left something behind!";
        let discountMessage = "";

        // Add discount for 2nd and 3rd emails if enabled
        if (event.abandoned_cart_discount_enabled && event.abandoned_cart_discount_code && emailNumber >= 2) {
          discountMessage = `
            <div style="background: linear-gradient(135deg, #ff4d00 0%, #ff6b2c 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px;">Special offer just for you!</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold;">${event.abandoned_cart_discount_percent}% OFF</p>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Use code: <strong>${event.abandoned_cart_discount_code}</strong></p>
            </div>
          `;
          subject = emailNumber === 2
            ? `${event.abandoned_cart_discount_percent}% off - Complete your ${event.name} purchase`
            : `Last chance! ${event.abandoned_cart_discount_percent}% off ${event.name} tickets`;
        }

        // Build cart items HTML
        const cartItemsHtml = cart.cart_items.map((item: any) => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name || item.ticket_name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `).join("");

        // Build the complete email
        const primaryColor = event.widget_customization?.theme?.primaryColor || "#ff4d00";
        const eventDate = new Date(event.event_date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const widgetUrl = `${supabaseUrl.replace(".supabase.co", "")}/widget/${event.id}`;

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white;">
              <!-- Header -->
              <div style="background: ${primaryColor}; padding: 30px; text-align: center;">
                ${org.logo_url ? `<img src="${org.logo_url}" alt="${org.name}" style="max-height: 60px; margin-bottom: 15px;">` : ""}
                <h1 style="color: white; margin: 0; font-size: 24px;">${event.name}</h1>
              </div>

              <!-- Content -->
              <div style="padding: 30px;">
                <p style="font-size: 18px; margin: 0 0 20px 0;">Hi ${firstName},</p>

                ${emailNumber === 1 ? `
                  <p style="margin: 0 0 20px 0; color: #555;">
                    We noticed you didn't complete your ticket purchase for <strong>${event.name}</strong>.
                    Your tickets are still waiting for you!
                  </p>
                ` : emailNumber === 2 ? `
                  <p style="margin: 0 0 20px 0; color: #555;">
                    Your tickets for <strong>${event.name}</strong> are still in your cart.
                    Don't miss out on this event!
                  </p>
                ` : `
                  <p style="margin: 0 0 20px 0; color: #555;">
                    <strong>Last reminder!</strong> Your tickets for <strong>${event.name}</strong> won't be reserved much longer.
                    This is your final chance to secure your spot.
                  </p>
                `}

                ${discountMessage}

                <!-- Event Details -->
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Event Details</p>
                  <p style="margin: 0 0 5px 0; color: #666;">📅 ${eventDate}</p>
                  <p style="margin: 0; color: #666;">📍 ${event.venue || "Venue TBA"}</p>
                </div>

                <!-- Cart Summary -->
                <div style="margin: 20px 0;">
                  <p style="font-weight: bold; margin: 0 0 15px 0;">Your Cart:</p>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f5f5f5;">
                        <th style="padding: 12px; text-align: left;">Ticket</th>
                        <th style="padding: 12px; text-align: center;">Qty</th>
                        <th style="padding: 12px; text-align: right;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${cartItemsHtml}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2" style="padding: 12px; font-weight: bold;">Total</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold;">$${cart.cart_total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${widgetUrl}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Complete Your Purchase
                  </a>
                </div>

                ${event.abandoned_cart_email_content ? `
                  <div style="margin: 20px 0; color: #555;">
                    ${event.abandoned_cart_email_content}
                  </div>
                ` : ""}

                <p style="margin: 30px 0 0 0; color: #888; font-size: 14px;">
                  Questions? Reply to this email or contact ${org.email}
                </p>
              </div>

              <!-- Footer -->
              <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #888;">
                <p style="margin: 0 0 10px 0;">Sent by ${org.name}</p>
                <p style="margin: 0;">
                  <a href="${widgetUrl}?unsubscribe=true" style="color: #888;">Unsubscribe from these reminders</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        // Send email via Resend
        if (!test_mode && resendApiKey) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${org.name} <tickets@ticketflo.com>`,
              to: cart.customer_email,
              subject: subject,
              html: emailHtml,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            throw new Error(`Failed to send email: ${errorText}`);
          }
        }

        // Update cart status
        await supabase
          .from("abandoned_carts")
          .update({
            status: "email_sent",
            emails_sent: cart.emails_sent + 1,
            last_email_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", cart.id);

        results.push({
          cart_id: cart.id,
          email: cart.customer_email,
          email_number: emailNumber,
          success: true,
        });

        console.log(`Sent email ${emailNumber} to ${cart.customer_email} for cart ${cart.id}`);
      } catch (cartError) {
        console.error(`Error processing cart ${cart.id}:`, cartError);
        results.push({
          cart_id: cart.id,
          email: cart.customer_email,
          success: false,
          error: cartError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-abandoned-cart-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
