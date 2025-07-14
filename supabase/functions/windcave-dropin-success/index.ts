import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== WINDCAVE SUCCESS - SIMPLE TEST ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Reading request body...");
    const requestBody = await req.json();
    console.log("Full request body:", JSON.stringify(requestBody, null, 2));
    
    const { sessionId, eventId } = requestBody;
    console.log("SessionId:", sessionId, "EventId:", eventId);

    if (!sessionId || !eventId) {
      throw new Error(`Missing required parameters: sessionId=${sessionId}, eventId=${eventId}`);
    }

    console.log("Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Finding most recent pending order for event...");
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      console.log("Error finding order:", orderError.message);
      throw new Error(`Order lookup failed: ${orderError.message}`);
    }

    if (!order) {
      console.log("No pending order found for event:", eventId);
      throw new Error("No pending orders found for this event");
    }

    console.log("Found order:", order.id, "with status:", order.status);

    // Try to update the status to completed first, fallback to paid if needed
    console.log("Attempting to update order status...");
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({ status: "completed" })
      .eq("id", order.id);

    if (updateError) {
      console.log("Trying with status 'paid'...");
      const { error: paidError } = await supabaseClient
        .from("orders")
        .update({ status: "paid" })
        .eq("id", order.id);
        
      if (paidError) {
        throw new Error(`Status update failed: ${updateError.message} and ${paidError.message}`);
      }
      console.log("Successfully updated to 'paid' status");
    } else {
      console.log("Successfully updated to 'completed' status");
    }

    // Get order items and create tickets
    console.log("Fetching order items...");
    const { data: orderItems, error: orderItemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (orderItemsError) {
      throw new Error(`Order items lookup failed: ${orderItemsError.message}`);
    }

    if (!orderItems || orderItems.length === 0) {
      throw new Error("No order items found");
    }

    console.log("Creating tickets for", orderItems.length, "order items");
    
    // Create tickets for each order item
    const ticketsToCreate = [];
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        ticketsToCreate.push({
          order_item_id: item.id,
          ticket_code: `T${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'valid'
        });
      }
    }

    console.log("Inserting", ticketsToCreate.length, "tickets");
    const { data: createdTickets, error: ticketError } = await supabaseClient
      .from("tickets")
      .insert(ticketsToCreate)
      .select();

    if (ticketError) {
      console.log("Ticket creation error:", ticketError.message);
      throw new Error(`Ticket creation failed: ${ticketError.message}`);
    }

    console.log("Successfully created", createdTickets?.length || 0, "tickets");

    // Send ticket email
    console.log("Sending ticket email...");
    try {
      // Get event details for email and Xero integration
      const { data: event, error: eventError } = await supabaseClient
        .from("events")
        .select("name, event_date, organization_id")
        .eq("id", eventId)
        .single();

      if (!eventError && event) {
        await supabaseClient.functions.invoke('send-ticket-email', {
          body: {
            orderId: order.id,
            customerEmail: order.customer_email,
            customerName: order.customer_name,
            eventName: event.name,
            eventDate: event.event_date,
            ticketCount: createdTickets?.length || 0
          }
        });
        console.log("Ticket email sent successfully");
        
        // Try to create Xero invoice if auto-sync is enabled
        console.log("Checking for Xero auto-invoice creation...");
        const { data: xeroConnection } = await supabaseClient
          .from("xero_connections")
          .select("sync_settings")
          .eq("organization_id", event.organization_id)
          .eq("connection_status", "connected")
          .single();

        if (xeroConnection?.sync_settings?.auto_create_invoices) {
          console.log("Creating Xero invoice automatically...");
          await supabaseClient.functions.invoke('xero-sync', {
            body: {
              action: 'createInvoice',
              organizationId: event.organization_id,
              orderId: order.id
            }
          });
          console.log("Xero invoice created successfully");
        }
      }
    } catch (emailError) {
      console.log("Email sending failed:", emailError);
      // Don't fail the whole process for email or Xero issues
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Payment completed and tickets created successfully",
      orderId: order.id,
      ticketsCreated: createdTickets?.length || 0,
      finalStatus: updateError ? "paid" : "completed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Function error:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});