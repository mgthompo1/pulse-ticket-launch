import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateInvoiceRequest {
  groupId: string;
  eventId?: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
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

    const { groupId, eventId, periodStart, periodEnd, dueDate }: GenerateInvoiceRequest =
      await req.json();

    console.log("Generating invoice for group:", { groupId, eventId, periodStart, periodEnd });

    // 1. Get group details
    const { data: group, error: groupError } = await supabaseClient
      .from("groups")
      .select("*, organizations(name)")
      .eq("id", groupId)
      .single();

    if (groupError) {
      console.error("Error fetching group:", groupError);
      throw new Error("Failed to fetch group details");
    }

    // 2. Query all sales for this group in the period
    // Add time to dates to ensure full day coverage
    const startDateTime = `${periodStart}T00:00:00`;
    const endDateTime = `${periodEnd}T23:59:59`;

    console.log("Querying sales with date range:", { startDateTime, endDateTime });

    let salesQuery = supabaseClient
      .from("group_ticket_sales")
      .select(`
        *,
        group_ticket_allocations!inner (
          event_id,
          events (
            id,
            name
          )
        )
      `)
      .eq("group_id", groupId)
      .eq("payment_status", "completed")
      .gte("created_at", startDateTime)
      .lte("created_at", endDateTime);

    if (eventId) {
      // Filter by event if specified
      salesQuery = salesQuery.eq("group_ticket_allocations.event_id", eventId);
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) {
      console.error("Error fetching sales:", salesError);
      throw new Error("Failed to fetch sales data");
    }

    console.log(`Found ${sales?.length || 0} sales for group ${groupId}`);

    if (!sales || sales.length === 0) {
      // Check if there are ANY sales for this group (to help debug)
      const { data: allSales } = await supabaseClient
        .from("group_ticket_sales")
        .select("id, created_at, payment_status")
        .eq("group_id", groupId)
        .limit(5);

      console.log("All sales for this group (up to 5):", allSales);

      return new Response(
        JSON.stringify({
          success: false,
          error: "No sales found for the specified period",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // 3. Calculate totals
    console.log("Sample sale record:", sales[0]);

    const totalTicketsSold = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.paid_price || 0), 0);

    // Calculate discount amount: full_price - paid_price for each sale
    const totalDiscounts = sales.reduce((sum, sale) => {
      const fullPrice = Number(sale.full_price || 0);
      const paidPrice = Number(sale.paid_price || 0);
      const discount = fullPrice - paidPrice;
      console.log(`Sale discount: full=${fullPrice}, paid=${paidPrice}, discount=${discount}`);
      return sum + discount;
    }, 0);

    const amountOwed = totalDiscounts;

    console.log("Invoice totals:", {
      totalTicketsSold,
      totalRevenue,
      totalDiscounts,
      amountOwed
    });

    // Get unique event ID (assuming all sales are for same event for now)
    const firstSale = sales[0];
    const invoiceEventId = eventId || (firstSale as any).group_ticket_allocations?.event_id;

    if (!invoiceEventId) {
      throw new Error("Could not determine event ID for invoice");
    }

    // 4. Generate invoice number
    const { data: invoiceNumberResult } = await supabaseClient.rpc("generate_invoice_number");
    const invoiceNumber = invoiceNumberResult || `INV-${Date.now()}`;

    console.log("Calculated totals:", {
      totalTicketsSold,
      totalRevenue,
      totalDiscounts,
      amountOwed,
      invoiceNumber,
    });

    // 5. Create invoice
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("group_invoices")
      .insert({
        invoice_number: invoiceNumber,
        group_id: groupId,
        event_id: invoiceEventId,
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        total_tickets_sold: totalTicketsSold,
        total_revenue: totalRevenue,
        total_discounts_given: totalDiscounts,
        amount_owed: amountOwed,
        amount_paid: 0,
        status: "draft",
        due_date: dueDate || null,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      throw new Error("Failed to create invoice");
    }

    console.log("Created invoice:", invoice);

    // 6. Create line items
    const lineItems = sales.map((sale: any) => ({
      invoice_id: invoice.id,
      sale_id: sale.id,
      description: `Discount on ticket (Full: $${sale.full_price}, Paid: $${sale.paid_price})`,
      quantity: 1,
      unit_price: Number(sale.discount_amount),
      total_amount: Number(sale.discount_amount),
    }));

    const { error: lineItemsError } = await supabaseClient
      .from("group_invoice_line_items")
      .insert(lineItems);

    if (lineItemsError) {
      console.error("Error creating line items:", lineItemsError);
      // Don't fail the invoice creation, just log
    }

    // 7. Log activity
    await supabaseClient.from("group_activity_log").insert({
      group_id: groupId,
      action: "invoice_generated",
      entity_type: "invoice",
      entity_id: invoice.id,
      metadata: {
        invoice_number: invoiceNumber,
        amount_owed: amountOwed,
        total_tickets: totalTicketsSold,
      },
    });

    // 8. Send notification to billing contact (async, fire and forget)
    try {
      supabaseClient.functions.invoke('send-group-notification', {
        body: {
          type: "invoice_generated",
          groupId,
          data: {
            invoiceNumber,
            periodStart,
            periodEnd,
            totalTickets: totalTicketsSold,
            amountOwed,
            dueDate: dueDate || "Not specified",
          },
        },
      }).then(() => {
        console.log("✅ Invoice notification sent");
      }).catch((err) => {
        console.error("❌ Error sending invoice notification:", err);
      });
    } catch (err) {
      console.error("Error preparing invoice notification:", err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice generated successfully",
        invoice_number: invoiceNumber,
        invoice_id: invoice.id,
        amount_owed: amountOwed,
        total_tickets: totalTicketsSold,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in generate-group-invoice:", error);
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
