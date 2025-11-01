import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceEmailRequest {
  invoiceId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { invoiceId }: SendInvoiceEmailRequest = await req.json();

    console.log("Sending invoice email for:", invoiceId);

    // 1. Get invoice details with group and event info
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("group_invoices")
      .select(`
        *,
        groups (
          name,
          contact_name,
          contact_email,
          billing_contact_name,
          billing_contact_email,
          organization_id,
          organizations (
            id,
            name
          )
        ),
        events (
          name
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Error fetching invoice:", invoiceError);
      throw new Error("Invoice not found");
    }

    console.log("Invoice details:", invoice);

    // Determine email recipient (prefer billing contact, fallback to main contact)
    const recipientEmail = (invoice as any).groups.billing_contact_email || (invoice as any).groups.contact_email;
    const recipientName = (invoice as any).groups.billing_contact_name || (invoice as any).groups.contact_name || (invoice as any).groups.name;

    if (!recipientEmail) {
      throw new Error("No email address found for group");
    }

    console.log("Sending to:", recipientEmail);

    // 2. Create Stripe Payment Link if amount_owed > 0
    let paymentLink = null;
    if (invoice.amount_owed > 0 && invoice.status !== "paid") {
      try {
        // Get organization's payment credentials
        const organizationId = (invoice as any).groups.organization_id;
        const { data: credentials, error: credError } = await supabaseClient
          .rpc('get_payment_credentials_for_processing', {
            p_organization_id: organizationId
          });

        if (credError || !credentials || credentials.length === 0) {
          console.error("Failed to get payment credentials:", credError);
          throw new Error("Payment credentials not found");
        }

        const orgStripeKey = credentials[0].stripe_secret_key;

        if (orgStripeKey) {
          const Stripe = await import("https://esm.sh/stripe@14.21.0");
          const stripe = new Stripe.default(orgStripeKey, { apiVersion: "2023-10-16" });

          // Create a payment link for the invoice amount
          const paymentLinkResponse = await stripe.paymentLinks.create({
            line_items: [
              {
                price_data: {
                  currency: "nzd", // TODO: Get from organization settings
                  product_data: {
                    name: `Invoice ${invoice.invoice_number} - ${(invoice as any).events?.name || "Group Ticket Discounts"}`,
                    description: `Payment for ${invoice.total_tickets_sold} tickets sold from ${invoice.billing_period_start} to ${invoice.billing_period_end}`,
                  },
                  unit_amount: Math.round(invoice.amount_owed * 100), // Convert to cents
                },
                quantity: 1,
              },
            ],
            metadata: {
              invoice_id: invoice.id,
              invoice_number: invoice.invoice_number,
              group_id: invoice.group_id,
            },
            after_completion: {
              type: 'hosted_confirmation',
              hosted_confirmation: {
                custom_message: `Thank you for your payment! Invoice ${invoice.invoice_number} has been paid.`,
              },
            },
          });

          paymentLink = paymentLinkResponse.url;
          console.log("Created payment link:", paymentLink);
        }
      } catch (stripeError) {
        console.error("Failed to create Stripe payment link:", stripeError);
        // Continue without payment link - email will still be sent
      }
    }

    // 3. Send email using Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Format currency
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #000; margin: 0 0 10px 0;">Group Ticket Invoice</h1>
    <p style="margin: 0; color: #666;">Invoice #${invoice.invoice_number}</p>
  </div>

  <div style="margin-bottom: 30px;">
    <p>Dear ${recipientName},</p>
    <p>Please find below the invoice for group ticket sales during the period ${new Date(invoice.billing_period_start).toLocaleDateString()} to ${new Date(invoice.billing_period_end).toLocaleDateString()}.</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
    <tr style="background-color: #f8f9fa;">
      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Event</strong></td>
      <td style="padding: 12px; border: 1px solid #dee2e6;">${(invoice as any).events?.name || "Multiple Events"}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Group</strong></td>
      <td style="padding: 12px; border: 1px solid #dee2e6;">${(invoice as any).groups.name}</td>
    </tr>
    <tr style="background-color: #f8f9fa;">
      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Billing Period</strong></td>
      <td style="padding: 12px; border: 1px solid #dee2e6;">${new Date(invoice.billing_period_start).toLocaleDateString()} - ${new Date(invoice.billing_period_end).toLocaleDateString()}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Tickets Sold</strong></td>
      <td style="padding: 12px; border: 1px solid #dee2e6;">${invoice.total_tickets_sold}</td>
    </tr>
    <tr style="background-color: #f8f9fa;">
      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Total Revenue</strong></td>
      <td style="padding: 12px; border: 1px solid #dee2e6;">${formatCurrency(invoice.total_revenue)}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Discounts Given</strong></td>
      <td style="padding: 12px; border: 1px solid #dee2e6;">${formatCurrency(invoice.total_discounts_given)}</td>
    </tr>
    <tr style="background-color: #fff3cd;">
      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Amount Owed</strong></td>
      <td style="padding: 12px; border: 1px solid #dee2e6; font-size: 18px; font-weight: bold;">${formatCurrency(invoice.amount_owed)}</td>
    </tr>
    ${invoice.due_date ? `
    <tr>
      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Due Date</strong></td>
      <td style="padding: 12px; border: 1px solid #dee2e6; color: #dc3545;">${new Date(invoice.due_date).toLocaleDateString()}</td>
    </tr>
    ` : ''}
  </table>

  ${paymentLink ? `
  <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin-bottom: 30px;">
    <p style="margin: 0 0 10px 0;"><strong>Pay Online</strong></p>
    <p style="margin: 0 0 15px 0;">You can pay this invoice securely online using the link below:</p>
    <a href="${paymentLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Pay Invoice Now</a>
  </div>
  ` : ''}

  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 30px;">
    <p style="margin: 0; font-size: 14px; color: #666;">
      <strong>Questions?</strong><br>
      If you have any questions about this invoice, please contact ${(invoice as any).groups.organizations?.name || "us"}.
    </p>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #999; text-align: center;">
    <p>This is an automated email from your ticketing system. Please do not reply to this email.</p>
  </div>
</body>
</html>
    `;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "invoices@ticketflo.org",
        to: [recipientEmail],
        subject: `Invoice ${invoice.invoice_number} - ${formatCurrency(invoice.amount_owed)} Due`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error(`Failed to send email: ${emailResult.message || 'Unknown error'}`);
    }

    console.log("Email sent successfully:", emailResult);

    // 4. Update invoice status to 'sent' if it was 'draft'
    if (invoice.status === 'draft') {
      await supabaseClient
        .from("group_invoices")
        .update({ status: 'sent' })
        .eq("id", invoiceId);
    }

    // 5. Store payment link if created
    if (paymentLink) {
      await supabaseClient
        .from("group_invoices")
        .update({ payment_link: paymentLink })
        .eq("id", invoiceId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice email sent successfully",
        recipient: recipientEmail,
        paymentLink: paymentLink,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-group-invoice-email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
