import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Process Overdue Invoices
 *
 * This function should be run on a schedule (e.g., daily via cron)
 * It marks invoices as overdue when their due_date has passed
 * and sends notification emails to the group billing contacts
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

    const today = new Date().toISOString().split('T')[0];
    console.log(`Processing overdue invoices for date: ${today}`);

    // Find all invoices that are past due and not already marked as overdue, paid, or cancelled
    const { data: overdueInvoices, error: fetchError } = await supabaseClient
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
      .lt("due_date", today)
      .in("status", ["draft", "sent", "viewed", "partial"])
      .gt("amount_owed", 0);

    if (fetchError) {
      console.error("Error fetching invoices:", fetchError);
      throw new Error("Failed to fetch invoices");
    }

    console.log(`Found ${overdueInvoices?.length || 0} overdue invoices`);

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No overdue invoices to process",
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

    for (const invoice of overdueInvoices) {
      try {
        // Update invoice status to overdue
        const { error: updateError } = await supabaseClient
          .from("group_invoices")
          .update({ status: "overdue" })
          .eq("id", invoice.id);

        if (updateError) {
          console.error(`Error updating invoice ${invoice.invoice_number}:`, updateError);
          errors.push(`Failed to update ${invoice.invoice_number}`);
          continue;
        }

        // Log the status change
        await supabaseClient.from("group_activity_log").insert({
          group_id: invoice.group_id,
          action: "invoice_overdue",
          entity_type: "invoice",
          entity_id: invoice.id,
          metadata: {
            invoice_number: invoice.invoice_number,
            due_date: invoice.due_date,
            amount_owed: invoice.amount_owed,
            amount_paid: invoice.amount_paid,
          },
        });

        // Send overdue notification
        const groupData = invoice.groups as unknown as { name: string; contact_email: string; billing_contact_email: string }[] | { name: string; contact_email: string; billing_contact_email: string };
        const group = Array.isArray(groupData) ? groupData[0] : groupData;
        if (group) {
          try {
            await supabaseClient.functions.invoke('send-group-notification', {
              body: {
                type: "invoice_overdue",
                groupId: invoice.group_id,
                data: {
                  invoiceNumber: invoice.invoice_number,
                  dueDate: invoice.due_date,
                  amountOwed: invoice.amount_owed - invoice.amount_paid,
                  groupName: group.name,
                },
              },
            });
            console.log(`Sent overdue notification for invoice ${invoice.invoice_number}`);
          } catch (notifError) {
            console.error(`Failed to send notification for ${invoice.invoice_number}:`, notifError);
          }
        }

        processedCount++;
        console.log(`Marked invoice ${invoice.invoice_number} as overdue`);
      } catch (invoiceError) {
        console.error(`Error processing invoice ${invoice.invoice_number}:`, invoiceError);
        errors.push(`Error processing ${invoice.invoice_number}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} overdue invoices`,
        processed: processedCount,
        total: overdueInvoices.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in process-overdue-invoices:", error);
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
