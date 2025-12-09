import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Frequency to days mapping
const frequencyToDays: Record<string, number> = {
  daily: 1,
  "3_days": 3,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

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

    console.log("Starting auto-invoice processing...");

    // Get all organizations with auto-invoicing enabled
    const { data: organizations, error: orgError } = await supabaseClient
      .from("organizations")
      .select("id, name, group_auto_invoice_frequency, group_auto_invoice_last_run")
      .eq("groups_enabled", true)
      .not("group_auto_invoice_frequency", "is", null);

    if (orgError) {
      console.error("Error fetching organizations:", orgError);
      throw new Error("Failed to fetch organizations");
    }

    console.log(`Found ${organizations?.length || 0} organizations with auto-invoicing enabled`);

    const now = new Date();
    const results: Array<{
      organization: string;
      groups_processed: number;
      invoices_generated: number;
      errors: string[];
    }> = [];

    for (const org of organizations || []) {
      const frequency = org.group_auto_invoice_frequency;
      const lastRun = org.group_auto_invoice_last_run
        ? new Date(org.group_auto_invoice_last_run)
        : null;

      // Check if it's time to run based on frequency
      const daysSinceLastRun = lastRun
        ? Math.floor((now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity; // Never run = always eligible

      const requiredDays = frequencyToDays[frequency] || 7;

      if (daysSinceLastRun < requiredDays) {
        console.log(
          `Skipping ${org.name} - last run ${daysSinceLastRun} days ago, requires ${requiredDays}`
        );
        continue;
      }

      console.log(`Processing organization: ${org.name} (${org.id})`);

      const orgResult = {
        organization: org.name,
        groups_processed: 0,
        invoices_generated: 0,
        errors: [] as string[],
      };

      // Get all active groups for this organization
      const { data: groups, error: groupsError } = await supabaseClient
        .from("groups")
        .select("id, name")
        .eq("organization_id", org.id)
        .eq("status", "active");

      if (groupsError) {
        console.error(`Error fetching groups for ${org.name}:`, groupsError);
        orgResult.errors.push(`Failed to fetch groups: ${groupsError.message}`);
        results.push(orgResult);
        continue;
      }

      console.log(`Found ${groups?.length || 0} active groups for ${org.name}`);

      // Calculate billing period based on frequency
      const periodEnd = new Date(now);
      periodEnd.setHours(23, 59, 59, 999);

      const periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - requiredDays);
      periodStart.setHours(0, 0, 0, 0);

      const periodStartStr = periodStart.toISOString().split("T")[0];
      const periodEndStr = periodEnd.toISOString().split("T")[0];

      // Due date is 14 days from now
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 14);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      for (const group of groups || []) {
        orgResult.groups_processed++;

        try {
          // Check if there are any uninvoiced sales for this group in the period
          const { data: uninvoicedSales, error: salesCheckError } = await supabaseClient
            .from("group_ticket_sales")
            .select("id")
            .eq("group_id", group.id)
            .eq("payment_status", "completed")
            .gte("created_at", `${periodStartStr}T00:00:00`)
            .lte("created_at", `${periodEndStr}T23:59:59`)
            .limit(1);

          if (salesCheckError) {
            console.error(`Error checking sales for group ${group.name}:`, salesCheckError);
            orgResult.errors.push(`${group.name}: Failed to check sales`);
            continue;
          }

          if (!uninvoicedSales || uninvoicedSales.length === 0) {
            console.log(`No sales found for group ${group.name} in period`);
            continue;
          }

          // Generate invoice using the existing function
          const { data: invoiceResult, error: invoiceError } = await supabaseClient.functions.invoke(
            "generate-group-invoice",
            {
              body: {
                groupId: group.id,
                periodStart: periodStartStr,
                periodEnd: periodEndStr,
                dueDate: dueDateStr,
              },
            }
          );

          if (invoiceError) {
            console.error(`Error generating invoice for ${group.name}:`, invoiceError);
            orgResult.errors.push(`${group.name}: ${invoiceError.message}`);
            continue;
          }

          if (invoiceResult?.success) {
            console.log(
              `Generated invoice ${invoiceResult.invoice_number} for ${group.name}: $${invoiceResult.amount_owed}`
            );
            orgResult.invoices_generated++;

            // Auto-send the invoice email
            try {
              await supabaseClient.functions.invoke("send-group-invoice-email", {
                body: {
                  invoiceId: invoiceResult.invoice_id,
                },
              });
              console.log(`Sent invoice email for ${group.name}`);
            } catch (emailErr) {
              console.error(`Failed to send invoice email for ${group.name}:`, emailErr);
              // Don't fail the whole process for email errors
            }
          } else {
            console.log(`No invoice generated for ${group.name}: ${invoiceResult?.error || "No sales"}`);
          }
        } catch (err) {
          console.error(`Error processing group ${group.name}:`, err);
          orgResult.errors.push(`${group.name}: ${err.message}`);
        }
      }

      results.push(orgResult);

      // Update last run timestamp for this organization
      await supabaseClient
        .from("organizations")
        .update({ group_auto_invoice_last_run: now.toISOString() })
        .eq("id", org.id);

      console.log(`Updated last run for ${org.name}`);
    }

    // Summary
    const totalInvoices = results.reduce((sum, r) => sum + r.invoices_generated, 0);
    const totalGroups = results.reduce((sum, r) => sum + r.groups_processed, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Auto-invoice processing complete:
      - Organizations: ${results.length}
      - Groups processed: ${totalGroups}
      - Invoices generated: ${totalInvoices}
      - Errors: ${totalErrors}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          organizations_processed: results.length,
          groups_processed: totalGroups,
          invoices_generated: totalInvoices,
          errors: totalErrors,
        },
        details: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in process-auto-group-invoices:", error);
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
