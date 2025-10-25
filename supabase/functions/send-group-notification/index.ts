import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "ticket_purchased" | "low_inventory" | "invoice_generated" | "invoice_due" | "invoice_overdue";
  groupId: string;
  data: any;
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

    const { type, groupId, data }: NotificationRequest = await req.json();

    console.log("Sending notification:", { type, groupId });

    // 1. Get group details with contacts
    const { data: group, error: groupError } = await supabaseClient
      .from("groups")
      .select("*, organizations(name, email)")
      .eq("id", groupId)
      .single();

    if (groupError) {
      console.error("Error fetching group:", groupError);
      throw new Error("Failed to fetch group details");
    }

    // 2. Prepare email based on notification type
    let subject = "";
    let htmlBody = "";
    let recipients: string[] = [];

    switch (type) {
      case "ticket_purchased":
        subject = `New Ticket Purchase - ${group.name}`;
        recipients = [group.contact_email];
        htmlBody = `
          <h2>New Ticket Purchase</h2>
          <p>A member of <strong>${group.name}</strong> has purchased a ticket.</p>
          <h3>Details:</h3>
          <ul>
            <li><strong>Event:</strong> ${data.eventName || "N/A"}</li>
            <li><strong>Tickets:</strong> ${data.ticketCount || 1}</li>
            <li><strong>Amount Paid:</strong> $${data.paidPrice?.toFixed(2) || "0.00"}</li>
            <li><strong>Full Price:</strong> $${data.fullPrice?.toFixed(2) || "0.00"}</li>
            <li><strong>Discount Given:</strong> $${data.discountAmount?.toFixed(2) || "0.00"}</li>
            <li><strong>Customer:</strong> ${data.customerName || "N/A"} (${data.customerEmail || "N/A"})</li>
          </ul>
          <p>You can view all sales and allocations in your group dashboard.</p>
        `;
        break;

      case "low_inventory":
        subject = `Low Inventory Alert - ${group.name}`;
        recipients = [group.contact_email];
        htmlBody = `
          <h2>Low Inventory Alert</h2>
          <p>Your group <strong>${group.name}</strong> is running low on allocated tickets.</p>
          <h3>Details:</h3>
          <ul>
            <li><strong>Event:</strong> ${data.eventName}</li>
            <li><strong>Ticket Type:</strong> ${data.ticketTypeName}</li>
            <li><strong>Remaining:</strong> ${data.remaining} out of ${data.allocated} tickets</li>
            <li><strong>Sold:</strong> ${data.used} tickets</li>
          </ul>
          <p>${data.remaining} tickets remaining - consider requesting more allocation if needed.</p>
        `;
        break;

      case "invoice_generated":
        subject = `New Invoice Generated - ${group.name}`;
        recipients = [group.billing_contact_email || group.contact_email];
        htmlBody = `
          <h2>New Invoice Generated</h2>
          <p>A new invoice has been generated for <strong>${group.name}</strong>.</p>
          <h3>Invoice Details:</h3>
          <ul>
            <li><strong>Invoice Number:</strong> ${data.invoiceNumber}</li>
            <li><strong>Billing Period:</strong> ${data.periodStart} to ${data.periodEnd}</li>
            <li><strong>Total Tickets:</strong> ${data.totalTickets}</li>
            <li><strong>Amount Owed:</strong> $${data.amountOwed?.toFixed(2)}</li>
            <li><strong>Due Date:</strong> ${data.dueDate || "Not specified"}</li>
          </ul>
          <p>This invoice represents the discount difference between the full ticket price and what your members paid.</p>
        `;
        break;

      case "invoice_due":
        subject = `Payment Reminder - Invoice ${data.invoiceNumber}`;
        recipients = [group.billing_contact_email || group.contact_email];
        htmlBody = `
          <h2>Payment Reminder</h2>
          <p>This is a friendly reminder that invoice <strong>${data.invoiceNumber}</strong> for <strong>${group.name}</strong> is due soon.</p>
          <h3>Invoice Details:</h3>
          <ul>
            <li><strong>Invoice Number:</strong> ${data.invoiceNumber}</li>
            <li><strong>Amount Owed:</strong> $${data.amountOwed?.toFixed(2)}</li>
            <li><strong>Amount Paid:</strong> $${data.amountPaid?.toFixed(2)}</li>
            <li><strong>Balance Due:</strong> $${(data.amountOwed - data.amountPaid).toFixed(2)}</li>
            <li><strong>Due Date:</strong> ${data.dueDate}</li>
          </ul>
          <p>Please ensure payment is submitted by the due date to avoid late fees.</p>
        `;
        break;

      case "invoice_overdue":
        subject = `Overdue Invoice - ${data.invoiceNumber}`;
        recipients = [group.billing_contact_email || group.contact_email];
        htmlBody = `
          <h2>Overdue Invoice Notice</h2>
          <p>Invoice <strong>${data.invoiceNumber}</strong> for <strong>${group.name}</strong> is now overdue.</p>
          <h3>Invoice Details:</h3>
          <ul>
            <li><strong>Invoice Number:</strong> ${data.invoiceNumber}</li>
            <li><strong>Amount Owed:</strong> $${data.amountOwed?.toFixed(2)}</li>
            <li><strong>Amount Paid:</strong> $${data.amountPaid?.toFixed(2)}</li>
            <li><strong>Balance Due:</strong> $${(data.amountOwed - data.amountPaid).toFixed(2)}</li>
            <li><strong>Due Date:</strong> ${data.dueDate}</li>
            <li><strong>Days Overdue:</strong> ${data.daysOverdue || "N/A"}</li>
          </ul>
          <p>Please contact us immediately to arrange payment.</p>
        `;
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    // 3. Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "TicketFlo <hello@ticketflo.org>";

    let emailSent = false;
    let emailError = null;

    if (resendApiKey) {
      try {
        console.log("📧 Sending email via Resend...");
        console.log("To:", recipients);
        console.log("Subject:", subject);

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: recipients,
            subject: subject,
            html: htmlBody,
          }),
        });

        const resendData = await resendResponse.json();

        if (resendResponse.ok) {
          console.log("✅ Email sent successfully:", resendData);
          emailSent = true;
        } else {
          console.error("❌ Resend API error:", resendData);
          emailError = resendData.message || "Unknown Resend error";
        }
      } catch (error) {
        console.error("❌ Error sending email:", error);
        emailError = error.message;
      }
    } else {
      console.log("⚠️ RESEND_API_KEY not configured - email not sent");
      console.log("📧 Email would have been sent to:", recipients);
      console.log("Subject:", subject);
    }

    // 4. Log activity
    await supabaseClient.from("group_activity_log").insert({
      group_id: groupId,
      action: `notification_sent_${type}`,
      entity_type: "notification",
      metadata: {
        notification_type: type,
        recipients,
        subject,
        email_sent: emailSent,
        email_error: emailError,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent
          ? "Email sent successfully"
          : emailError
            ? `Email failed: ${emailError}`
            : "Email not sent (RESEND_API_KEY not configured)",
        type,
        recipients,
        email_sent: emailSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-group-notification:", error);
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
