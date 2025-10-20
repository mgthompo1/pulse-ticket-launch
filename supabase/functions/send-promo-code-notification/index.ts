// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROMO-CODE-NOTIFICATION] ${step}${detailsStr}`);
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

    const { promoCodeId, orderId } = await req.json();
    logStep("Processing promo code notification", { promoCodeId, orderId });

    // Get promo code details with notification email
    const { data: promoCode, error: promoError } = await supabaseClient
      .from("promo_codes")
      .select(`
        *,
        organizations(
          id,
          name,
          email
        )
      `)
      .eq("id", promoCodeId)
      .single();

    if (promoError || !promoCode) {
      logStep("Promo code not found", { error: promoError });
      throw new Error(`Promo code not found: ${promoError?.message}`);
    }

    // Check if notification email is set
    if (!promoCode.notification_email) {
      logStep("No notification email configured for this promo code");
      return new Response(JSON.stringify({
        success: true,
        message: "No notification email configured"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        events(
          name,
          event_date,
          venue,
          organizations(
            name
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      logStep("Order not found", { error: orderError });
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    logStep("Data retrieved successfully", {
      promoCode: promoCode.code,
      notificationEmail: promoCode.notification_email,
      customerEmail: order.customer_email,
      eventName: order.events.name
    });

    // Prepare email content
    const emailSubject = `Promo Code "${promoCode.code}" Used - ${order.events.name}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Promo Code Notification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">🎫 Promo Code Used!</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Someone just used your promo code</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 32px 24px;">

            <!-- Promo Code Info -->
            <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <div style="background: #6366f1; color: #ffffff; border-radius: 8px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; margin-right: 16px; font-size: 24px;">
                  🏷️
                </div>
                <div>
                  <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Promo Code</div>
                  <div style="font-size: 20px; font-weight: 700; color: #1f2937;">${promoCode.code}</div>
                </div>
              </div>

              ${promoCode.description ? `
                <div style="padding: 12px; background: #ffffff; border-radius: 8px; margin-top: 12px;">
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Description</div>
                  <div style="color: #374151; font-size: 14px;">${promoCode.description}</div>
                </div>
              ` : ''}
            </div>

            <!-- Event Details -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1e40af;">📅 Event Details</h2>
              <div style="space-y: 12px;">
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 12px; color: #3b82f6; margin-bottom: 4px; font-weight: 500;">Event Name</div>
                  <div style="color: #1e40af; font-weight: 600; font-size: 15px;">${order.events.name}</div>
                </div>
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 12px; color: #3b82f6; margin-bottom: 4px; font-weight: 500;">Event Date</div>
                  <div style="color: #1e40af;">${new Date(order.events.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
                ${order.events.venue ? `
                  <div style="margin-bottom: 12px;">
                    <div style="font-size: 12px; color: #3b82f6; margin-bottom: 4px; font-weight: 500;">Venue</div>
                    <div style="color: #1e40af;">${order.events.venue}</div>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Order Details -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #16a34a;">💳 Order Information</h2>
              <div style="space-y: 12px;">
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 12px; color: #22c55e; margin-bottom: 4px; font-weight: 500;">Customer</div>
                  <div style="color: #16a34a; font-weight: 600;">${order.customer_name || 'N/A'}</div>
                  <div style="color: #16a34a; font-size: 13px; margin-top: 2px;">${order.customer_email}</div>
                </div>
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 12px; color: #22c55e; margin-bottom: 4px; font-weight: 500;">Order Total</div>
                  <div style="color: #16a34a; font-weight: 700; font-size: 18px;">$${parseFloat(order.total_amount || 0).toFixed(2)}</div>
                </div>
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 12px; color: #22c55e; margin-bottom: 4px; font-weight: 500;">Discount Applied</div>
                  <div style="color: #16a34a; font-weight: 700; font-size: 18px;">-$${parseFloat(order.promo_code_discount || 0).toFixed(2)}</div>
                </div>
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 12px; color: #22c55e; margin-bottom: 4px; font-weight: 500;">Purchase Date</div>
                  <div style="color: #16a34a;">${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
              </div>
            </div>

            <!-- Usage Stats -->
            <div style="background: #fef3c7; border: 1px solid #fde047; border-radius: 12px; padding: 20px;">
              <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #ca8a04;">📊 Promo Code Usage</h2>
              <div style="display: flex; justify-content: space-around; text-align: center;">
                <div>
                  <div style="font-size: 28px; font-weight: 700; color: #ca8a04;">${promoCode.current_uses}</div>
                  <div style="font-size: 12px; color: #a16207; margin-top: 4px;">Total Uses</div>
                </div>
                ${promoCode.max_uses ? `
                  <div>
                    <div style="font-size: 28px; font-weight: 700; color: #ca8a04;">${promoCode.max_uses - promoCode.current_uses}</div>
                    <div style="font-size: 12px; color: #a16207; margin-top: 4px;">Remaining</div>
                  </div>
                ` : ''}
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">
              This is an automated notification from TicketFlo<br>
              You're receiving this because your promo code was used for a ticket purchase
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    // Send email using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const resend = new Resend(resendApiKey);

    logStep("Sending notification email", {
      to: promoCode.notification_email,
      subject: emailSubject
    });

    const emailResponse = await resend.emails.send({
      from: `TicketFlo Notifications <noreply@ticketflo.org>`,
      to: [promoCode.notification_email],
      subject: emailSubject,
      html: emailHtml,
    });

    logStep("Resend API response", {
      response: emailResponse,
      hasError: !!emailResponse.error
    });

    if (emailResponse.error) {
      throw new Error(`Email failed: ${JSON.stringify(emailResponse.error)}`);
    }

    logStep("Notification email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({
      success: true,
      emailSent: true,
      notificationEmail: promoCode.notification_email
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    console.error("Full error details:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
