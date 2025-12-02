import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundRequest {
  ticketId: string;
  reason?: string;
}

/**
 * Handle Group Sale Refund
 *
 * Called when a ticket that was part of a group sale is refunded.
 * Updates the group_ticket_sales record to mark it as refunded
 * and decrements the allocation's used_quantity.
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

    const { ticketId, reason }: RefundRequest = await req.json();

    if (!ticketId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ticketId is required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Processing group sale refund for ticket:", ticketId);

    // 1. Find the group_ticket_sale record for this ticket
    const { data: sale, error: saleError } = await supabaseClient
      .from("group_ticket_sales")
      .select(`
        id,
        group_id,
        allocation_id,
        full_price,
        paid_price,
        payment_status,
        group_ticket_allocations (
          id,
          event_id
        )
      `)
      .eq("ticket_id", ticketId)
      .single();

    if (saleError) {
      // No group sale record - this ticket wasn't part of a group sale
      if (saleError.code === "PGRST116") {
        console.log("Ticket not found in group sales - not a group sale ticket");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Ticket was not part of a group sale",
            processed: false,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      console.error("Error fetching group sale:", saleError);
      throw new Error("Failed to fetch group sale record");
    }

    // Already refunded
    if (sale.payment_status === "refunded") {
      console.log("Sale already marked as refunded");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Sale was already marked as refunded",
          processed: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 2. Update the sale record to mark as refunded
    const { error: updateError } = await supabaseClient
      .from("group_ticket_sales")
      .update({
        payment_status: "refunded",
      })
      .eq("id", sale.id);

    if (updateError) {
      console.error("Error updating sale status:", updateError);
      throw new Error("Failed to update sale status");
    }

    console.log("Marked group sale as refunded");

    // 3. The database trigger should automatically decrement used_quantity
    // Verify by fetching updated allocation
    const { data: allocation, error: allocError } = await supabaseClient
      .from("group_ticket_allocations")
      .select("allocated_quantity, used_quantity, reserved_quantity")
      .eq("id", sale.allocation_id)
      .single();

    if (!allocError && allocation) {
      console.log("Updated allocation quantities:", allocation);
    }

    // 4. Log the refund activity
    await supabaseClient.from("group_activity_log").insert({
      group_id: sale.group_id,
      action: "ticket_refunded",
      entity_type: "sale",
      entity_id: sale.id,
      metadata: {
        ticket_id: ticketId,
        allocation_id: sale.allocation_id,
        full_price: sale.full_price,
        paid_price: sale.paid_price,
        refund_reason: reason || "No reason provided",
      },
    });

    // 5. Check if there are any invoices that included this sale and may need adjustment
    // This is informational - the invoice amount won't auto-adjust, but we log it
    const { data: invoiceItems } = await supabaseClient
      .from("group_invoice_line_items")
      .select(`
        invoice_id,
        group_invoices (
          invoice_number,
          status
        )
      `)
      .eq("sale_id", sale.id);

    if (invoiceItems && invoiceItems.length > 0) {
      const unpaidInvoices = invoiceItems.filter(
        (item) => (item as any).group_invoices?.status !== "paid"
      );

      if (unpaidInvoices.length > 0) {
        console.log("Warning: Refunded sale is included in unpaid invoices:",
          unpaidInvoices.map((i) => (i as any).group_invoices?.invoice_number)
        );

        // Log warning about affected invoices
        for (const item of unpaidInvoices) {
          await supabaseClient.from("group_activity_log").insert({
            group_id: sale.group_id,
            action: "invoice_affected_by_refund",
            entity_type: "invoice",
            entity_id: item.invoice_id,
            metadata: {
              invoice_number: (item as any).group_invoices?.invoice_number,
              refunded_ticket_id: ticketId,
              refunded_amount: sale.paid_price,
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Group sale refund processed successfully",
        processed: true,
        sale_id: sale.id,
        updated_allocation: allocation,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in handle-group-sale-refund:", error);
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
