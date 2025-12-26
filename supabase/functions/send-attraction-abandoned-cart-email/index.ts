import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AbandonedCart {
  id: string;
  attraction_id: string;
  organization_id: string;
  customer_email: string;
  customer_name: string | null;
  party_size: number;
  cart_total: number;
  slot_date: string;
  slot_start_time: string;
  slot_end_time: string;
  emails_sent: number;
  status: string;
}

interface Attraction {
  id: string;
  name: string;
  venue: string;
  image_url: string | null;
  abandoned_cart_enabled: boolean;
  abandoned_cart_delay_minutes: number;
  abandoned_cart_email_subject: string;
  abandoned_cart_email_content: string | null;
  abandoned_cart_discount_enabled: boolean;
  abandoned_cart_discount_code: string | null;
  abandoned_cart_discount_percent: number;
  base_price: number;
  currency: string;
}

interface Organization {
  id: string;
  name: string;
  email: string;
  logo_url: string | null;
}

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const formatTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cart_id, test_mode } = await req.json();

    let cartsToProcess: AbandonedCart[] = [];

    if (cart_id) {
      const { data: cart, error } = await supabase
        .from("attraction_abandoned_carts")
        .select("*")
        .eq("id", cart_id)
        .single();

      if (error || !cart) {
        throw new Error("Cart not found");
      }
      cartsToProcess = [cart];
    } else {
      // Get all pending carts that are ready for email
      const { data: carts, error } = await supabase
        .from("attraction_abandoned_carts")
        .select(`
          *,
          attractions!inner (
            abandoned_cart_enabled,
            abandoned_cart_delay_minutes
          )
        `)
        .in("status", ["pending", "email_sent"])
        .lt("emails_sent", 3)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        throw error;
      }

      // Filter carts ready for next email
      cartsToProcess = (carts || []).filter((cart: any) => {
        if (!cart.attractions?.abandoned_cart_enabled) return false;

        const createdAt = new Date(cart.created_at);
        const lastEmailAt = cart.last_email_sent_at ? new Date(cart.last_email_sent_at) : null;
        const now = new Date();
        const delayMinutes = cart.attractions.abandoned_cart_delay_minutes || 60;

        if (cart.emails_sent === 0) {
          const timeSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60);
          return timeSinceCreated >= delayMinutes;
        } else if (cart.emails_sent === 1 && lastEmailAt) {
          const timeSinceLastEmail = (now.getTime() - lastEmailAt.getTime()) / (1000 * 60 * 60);
          return timeSinceLastEmail >= 24;
        } else if (cart.emails_sent === 2 && lastEmailAt) {
          const timeSinceLastEmail = (now.getTime() - lastEmailAt.getTime()) / (1000 * 60 * 60);
          return timeSinceLastEmail >= 48;
        }
        return false;
      });
    }

    console.log(`Processing ${cartsToProcess.length} attraction abandoned carts`);

    const results = [];

    for (const cart of cartsToProcess) {
      try {
        // Get attraction details
        const { data: attraction } = await supabase
          .from("attractions")
          .select("*")
          .eq("id", cart.attraction_id)
          .single();

        if (!attraction) continue;

        // Get organization details
        const { data: org } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", cart.organization_id)
          .single();

        if (!org) continue;

        const customerName = cart.customer_name || "there";
        const firstName = customerName.split(" ")[0];
        const emailNumber = cart.emails_sent + 1;
        const currency = attraction.currency || org.currency || 'USD';

        let subject = attraction.abandoned_cart_email_subject || "Complete your booking!";
        let discountMessage = "";

        // Add discount for 2nd and 3rd emails if enabled
        if (attraction.abandoned_cart_discount_enabled && attraction.abandoned_cart_discount_code && emailNumber >= 2) {
          discountMessage = `
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px;">Special offer just for you!</p>
              <p style="margin: 0; font-size: 28px; font-weight: bold;">${attraction.abandoned_cart_discount_percent}% OFF</p>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Use code: <strong>${attraction.abandoned_cart_discount_code}</strong></p>
            </div>
          `;
          subject = emailNumber === 2
            ? `${attraction.abandoned_cart_discount_percent}% off - Complete your ${attraction.name} booking`
            : `Last chance! ${attraction.abandoned_cart_discount_percent}% off your booking`;
        }

        const bookingDate = cart.slot_date
          ? new Date(cart.slot_date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "Date pending";

        const bookingTime = cart.slot_start_time && cart.slot_end_time
          ? `${formatTime(cart.slot_start_time)} - ${formatTime(cart.slot_end_time)}`
          : "Time pending";

        const primaryColor = "#3b82f6";
        const widgetUrl = `${supabaseUrl.replace(".supabase.co", "")}/attraction/${attraction.id}`;

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">
              <!-- Header -->
              <div style="background: ${primaryColor}; padding: 30px; text-align: center;">
                ${org.logo_url ? `<img src="${org.logo_url}" alt="${org.name}" style="max-height: 60px; margin-bottom: 15px;">` : ""}
                <h1 style="color: white; margin: 0; font-size: 24px;">${attraction.name}</h1>
              </div>

              ${attraction.image_url ? `
                <img src="${attraction.image_url}" alt="${attraction.name}" style="width: 100%; max-height: 200px; object-fit: cover;">
              ` : ""}

              <!-- Content -->
              <div style="padding: 30px;">
                <p style="font-size: 18px; margin: 0 0 20px 0;">Hi ${firstName},</p>

                ${emailNumber === 1 ? `
                  <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
                    We noticed you didn't complete your booking for <strong>${attraction.name}</strong>.
                    Your spot is still waiting for you!
                  </p>
                ` : emailNumber === 2 ? `
                  <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
                    Your booking for <strong>${attraction.name}</strong> is still incomplete.
                    Don't miss out on this experience!
                  </p>
                ` : `
                  <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
                    <strong>Final reminder!</strong> Your spot for <strong>${attraction.name}</strong> won't be available much longer.
                    This is your last chance to book.
                  </p>
                `}

                ${discountMessage}

                <!-- Booking Details -->
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <p style="margin: 0 0 15px 0; font-weight: 600; color: #1e293b; font-size: 16px;">Your Booking Details</p>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b;">📅 Date</span>
                    <span style="color: #1e293b; font-weight: 500;">${bookingDate}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b;">🕐 Time</span>
                    <span style="color: #1e293b; font-weight: 500;">${bookingTime}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b;">👥 Party Size</span>
                    <span style="color: #1e293b; font-weight: 500;">${cart.party_size} ${cart.party_size === 1 ? 'person' : 'people'}</span>
                  </div>
                  ${attraction.venue ? `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: #64748b;">📍 Location</span>
                      <span style="color: #1e293b; font-weight: 500;">${attraction.venue}</span>
                    </div>
                  ` : ""}
                  <div style="display: flex; justify-content: space-between; padding: 15px 0 0 0;">
                    <span style="color: #1e293b; font-weight: 600;">Total</span>
                    <span style="color: ${primaryColor}; font-weight: 700; font-size: 20px;">${formatCurrency(cart.cart_total, currency)}</span>
                  </div>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${widgetUrl}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 16px 48px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                    Complete Your Booking
                  </a>
                </div>

                ${attraction.abandoned_cart_email_content ? `
                  <div style="margin: 20px 0; color: #555; line-height: 1.6;">
                    ${attraction.abandoned_cart_email_content}
                  </div>
                ` : ""}

                <p style="margin: 30px 0 0 0; color: #94a3b8; font-size: 14px;">
                  Questions? Reply to this email or contact ${org.email}
                </p>
              </div>

              <!-- Footer -->
              <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 10px 0;">Sent by ${org.name}</p>
                <p style="margin: 0;">
                  <a href="${widgetUrl}?unsubscribe=true" style="color: #94a3b8;">Unsubscribe from these reminders</a>
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
              from: `${org.name} <bookings@ticketflo.com>`,
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
          .from("attraction_abandoned_carts")
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

        console.log(`Sent email ${emailNumber} to ${cart.customer_email} for attraction cart ${cart.id}`);
      } catch (cartError: any) {
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
  } catch (error: any) {
    console.error("Error in send-attraction-abandoned-cart-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
