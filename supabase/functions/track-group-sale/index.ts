import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GroupSaleRequest {
  orderId: string;
  groupId: string;
  allocationId: string;
  tickets: Array<{
    ticketId: string;
    ticketTypeId: string;
    paidPrice: number;
  }>;
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

    const { orderId, groupId, allocationId, tickets }: GroupSaleRequest =
      await req.json();

    console.log("Processing group sale:", { orderId, groupId, allocationId, ticketCount: tickets.length });

    // 1. Get allocation details and the original ticket price
    const { data: allocation, error: allocationError } = await supabaseClient
      .from("group_ticket_allocations")
      .select(`
        full_price,
        minimum_price,
        group_id,
        event_id,
        ticket_type_id,
        ticket_types (
          price
        )
      `)
      .eq("id", allocationId)
      .single();

    if (allocationError) {
      console.error("Error fetching allocation:", allocationError);
      throw new Error("Failed to fetch allocation details");
    }

    console.log("Allocation details:", allocation);

    // Use the ticket type's original price as the "full price" for discount calculation
    // This is what the customer would have paid without any group discount
    const originalTicketPrice = (allocation as any).ticket_types?.price || allocation.full_price;

    // 2. Create group_ticket_sales records for each ticket
    const groupSales = tickets.map((ticket) => {
      const discountAmount = originalTicketPrice - ticket.paidPrice;

      console.log(`Creating sale record: original_price=${originalTicketPrice}, paid_price=${ticket.paidPrice}, discount=${discountAmount}`);

      return {
        group_id: groupId,
        allocation_id: allocationId,
        ticket_id: ticket.ticketId,
        full_price: originalTicketPrice, // Use original ticket price, not allocation's full_price
        paid_price: ticket.paidPrice,
        // discount_amount is auto-calculated by database as GENERATED column
        payment_status: "completed",
      };
    });

    console.log("Group sales to insert:", JSON.stringify(groupSales, null, 2));

    const { error: salesError } = await supabaseClient
      .from("group_ticket_sales")
      .insert(groupSales);

    if (salesError) {
      console.error("Error creating group sales:", salesError);
      throw new Error("Failed to track group sales");
    }

    console.log(`Created ${groupSales.length} group sale records`);

    // 3. Update allocation used_quantity
    // Note: This is handled by database trigger, but we can verify
    const { data: updatedAllocation, error: updateError } = await supabaseClient
      .from("group_ticket_allocations")
      .select("allocated_quantity, used_quantity, reserved_quantity")
      .eq("id", allocationId)
      .single();

    if (updateError) {
      console.error("Error fetching updated allocation:", updateError);
    } else {
      console.log("Updated allocation quantities:", updatedAllocation);
    }

    // 4. Log activity
    const { error: logError } = await supabaseClient
      .from("group_activity_log")
      .insert({
        group_id: groupId,
        action: "tickets_sold",
        entity_type: "allocation",
        entity_id: allocationId,
        metadata: {
          order_id: orderId,
          ticket_count: tickets.length,
          total_paid: tickets.reduce((sum, t) => sum + t.paidPrice, 0),
          total_discounts: tickets.reduce(
            (sum, t) => sum + (allocation.full_price - t.paidPrice),
            0
          ),
        },
      });

    if (logError) {
      console.error("Error logging activity:", logError);
      // Don't fail the request if logging fails
    }

    // 5. Send notification to group coordinator (async, don't await)
    try {
      // Get event details for notification
      const { data: eventData } = await supabaseClient
        .from("events")
        .select("name")
        .eq("id", allocation.event_id)
        .single();

      // Get customer details from order
      const { data: orderData } = await supabaseClient
        .from("orders")
        .select("customer_name, customer_email")
        .eq("id", orderId)
        .single();

      // Send notification (fire and forget)
      supabaseClient.functions.invoke('send-group-notification', {
        body: {
          type: "ticket_purchased",
          groupId,
          data: {
            eventName: eventData?.name || "Unknown Event",
            ticketCount: tickets.length,
            paidPrice: tickets.reduce((sum, t) => sum + t.paidPrice, 0),
            fullPrice: originalTicketPrice * tickets.length,
            discountAmount: tickets.reduce(
              (sum, t) => sum + (originalTicketPrice - t.paidPrice),
              0
            ),
            customerName: orderData?.customer_name || "Unknown",
            customerEmail: orderData?.customer_email || "Unknown",
          },
        },
      }).then(() => {
        console.log("✅ Notification sent successfully");
      }).catch((err) => {
        console.error("❌ Error sending notification:", err);
        // Don't fail the sale if notification fails
      });
    } catch (notifError) {
      console.error("Error preparing notification:", notifError);
      // Don't fail the sale if notification preparation fails
    }

    // 6. Check for low inventory and send alert if needed
    if (updatedAllocation) {
      const remaining = updatedAllocation.allocated_quantity - updatedAllocation.used_quantity - updatedAllocation.reserved_quantity;
      const lowInventoryThreshold = Math.ceil(updatedAllocation.allocated_quantity * 0.1); // 10% remaining

      if (remaining <= lowInventoryThreshold && remaining > 0) {
        try {
          const { data: eventData } = await supabaseClient
            .from("events")
            .select("name")
            .eq("id", allocation.event_id)
            .single();

          const { data: ticketTypeData } = await supabaseClient
            .from("ticket_types")
            .select("name")
            .eq("id", allocation.ticket_type_id)
            .single();

          supabaseClient.functions.invoke('send-group-notification', {
            body: {
              type: "low_inventory",
              groupId,
              data: {
                eventName: eventData?.name || "Unknown Event",
                ticketTypeName: ticketTypeData?.name || "Unknown Type",
                remaining,
                allocated: updatedAllocation.allocated_quantity,
                used: updatedAllocation.used_quantity,
              },
            },
          }).then(() => {
            console.log("✅ Low inventory alert sent");
          }).catch((err) => {
            console.error("❌ Error sending low inventory alert:", err);
          });
        } catch (err) {
          console.error("Error preparing low inventory notification:", err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Tracked ${tickets.length} group ticket sales`,
        allocation: updatedAllocation,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in track-group-sale:", error);
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
