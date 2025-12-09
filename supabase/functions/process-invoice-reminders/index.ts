import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Process Invoice Reminders
 *
 * This function should be run on a schedule (e.g., daily via cron)
 * It sends reminder emails for invoices approaching their due date
 * - Reminder 7 days before due date
 * - Reminder 3 days before due date
 * - Reminder 1 day before due date
 */
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

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate reminder dates (7, 3, and 1 days from now)
    const reminderDates = [1, 3, 7].map(days => {
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    });

    console.log(`Processing invoice reminders for due dates: ${reminderDates.join(', ')}`);

    // Find all invoices that are due on reminder dates
    const { data: invoices, error: fetchError } = await supabaseClient
      .from("group_invoices")
      .select(`
        id,
        invoice_number,
        group_id,
        amount_owed,
        amount_paid,
        due_date,
        status,
        groups (
          name,
          contact_email,
          billing_contact_email
        )
      `)
      .in("due_date", reminderDates)
      .in("status", ["sent", "viewed", "partial"]) // Only remind for unpaid sent invoices
      .gt("amount_owed", 0);

    if (fetchError) {
      console.error("Error fetching invoices:", fetchError);
      throw new Error("Failed to fetch invoices");
    }

    console.log(`Found ${invoices?.length || 0} invoices needing reminders`);

    if (!invoices || invoices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No invoice reminders to process",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    let processedCount = 0;
    const errors: string[] = [];

    for (const invoice of invoices) {
      try {
        const dueDate = new Date(invoice.due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const remainingBalance = invoice.amount_owed - invoice.amount_paid;

        const groupData = invoice.groups as unknown as { name: string; contact_email: string; billing_contact_email: string }[] | { name: string; contact_email: string; billing_contact_email: string };
        const group = Array.isArray(groupData) ? groupData[0] : groupData;
        if (!group) continue;

        // Check if we already sent a reminder for this date
        const reminderKey = `reminder_${daysUntilDue}d`;
        const { data: existingLog } = await supabaseClient
          .from("group_activity_log")
          .select("id")
          .eq("group_id", invoice.group_id)
          .eq("entity_id", invoice.id)
          .eq("action", `invoice_reminder_${daysUntilDue}d`)
          .single();

        if (existingLog) {
          console.log(`Already sent ${daysUntilDue}-day reminder for invoice ${invoice.invoice_number}`);
          continue;
        }

        // Send reminder notification
        try {
          await supabaseClient.functions.invoke('send-group-notification', {
            body: {
              type: "invoice_due",
              groupId: invoice.group_id,
              data: {
                invoiceNumber: invoice.invoice_number,
                dueDate: invoice.due_date,
                daysUntilDue,
                amountOwed: remainingBalance,
                groupName: group.name,
              },
            },
          });

          // Log the reminder
          await supabaseClient.from("group_activity_log").insert({
            group_id: invoice.group_id,
            action: `invoice_reminder_${daysUntilDue}d`,
            entity_type: "invoice",
            entity_id: invoice.id,
            metadata: {
              invoice_number: invoice.invoice_number,
              due_date: invoice.due_date,
              days_until_due: daysUntilDue,
              remaining_balance: remainingBalance,
            },
          });

          processedCount++;
          console.log(`Sent ${daysUntilDue}-day reminder for invoice ${invoice.invoice_number}`);
        } catch (notifError) {
          console.error(`Failed to send reminder for ${invoice.invoice_number}:`, notifError);
          errors.push(`Failed to send reminder for ${invoice.invoice_number}`);
        }
      } catch (invoiceError) {
        console.error(`Error processing invoice ${invoice.invoice_number}:`, invoiceError);
        errors.push(`Error processing ${invoice.invoice_number}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${processedCount} invoice reminders`,
        processed: processedCount,
        total: invoices.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in process-invoice-reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
