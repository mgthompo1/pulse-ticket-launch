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

    // 1. Get allocation details (to get full_price)
    const { data: allocation, error: allocationError } = await supabaseClient
      .from("group_ticket_allocations")
      .select("full_price, minimum_price, group_id, event_id")
      .eq("id", allocationId)
      .single();

    if (allocationError) {
      console.error("Error fetching allocation:", allocationError);
      throw new Error("Failed to fetch allocation details");
    }

    console.log("Allocation details:", allocation);

    // 2. Create group_ticket_sales records for each ticket
    const groupSales = tickets.map((ticket) => {
      const discountAmount = allocation.full_price - ticket.paidPrice;

      return {
        group_id: groupId,
        allocation_id: allocationId,
        ticket_id: ticket.ticketId,
        full_price: allocation.full_price,
        paid_price: ticket.paidPrice,
        // discount_amount is auto-calculated by database as GENERATED column
        payment_status: "completed",
      };
    });

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
