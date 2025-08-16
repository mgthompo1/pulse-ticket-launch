import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== STRIPE PAYMENT SUCCESS HANDLER ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, paymentIntentId } = await req.json();
    console.log("Processing payment success for order:", orderId, "payment intent:", paymentIntentId);

    if (!orderId) {
      throw new Error("Missing orderId parameter");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Update order status to completed
    console.log("Updating order status to completed...");
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({ 
        status: "completed",
        stripe_session_id: paymentIntentId || null
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order status:", updateError);
      throw new Error("Failed to update order status");
    }

    console.log("Order status updated successfully");

    // Get order items and create tickets
    console.log("Fetching order items...");
    const { data: orderItems, error: orderItemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (orderItemsError) {
      throw new Error(`Order items lookup failed: ${orderItemsError.message}`);
    }

    if (!orderItems || orderItems.length === 0) {
      throw new Error("No order items found");
    }

    console.log("Creating tickets for", orderItems.length, "order items");
    
    // Create tickets for each order item (only for ticket items, not merchandise)
    const ticketsToCreate = [];
    for (const item of orderItems) {
      if (item.item_type === 'ticket') {
        for (let i = 0; i < item.quantity; i++) {
          ticketsToCreate.push({
            order_item_id: item.id,
            ticket_code: `T${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: 'valid',
            checked_in: false
          });
        }
      }
    }

    if (ticketsToCreate.length > 0) {
      console.log("Inserting", ticketsToCreate.length, "tickets");
      
      // Try direct insert first (should work with service role)
      try {
        const { data: createdTickets, error: ticketError } = await supabaseClient
          .from("tickets")
          .insert(ticketsToCreate)
          .select();

        if (ticketError) {
          console.error("Direct insert failed:", ticketError);
          throw new Error(`Ticket creation failed: ${ticketError.message}`);
        }
        
        console.log("Successfully created", createdTickets?.length || 0, "tickets via direct insert");
      } catch (insertError) {
        console.error("Ticket creation error:", insertError);
        
        // If direct insert fails, try creating tickets one by one
        console.log("Trying individual ticket creation...");
        let successCount = 0;
        
        for (const ticket of ticketsToCreate) {
          try {
            const { error: singleError } = await supabaseClient
              .from("tickets")
              .insert(ticket);
            
            if (!singleError) {
              successCount++;
            } else {
              console.error("Failed to create individual ticket:", singleError);
            }
          } catch (singleTicketError) {
            console.error("Individual ticket creation failed:", singleTicketError);
          }
        }
        
        if (successCount === 0) {
          throw new Error(`Failed to create any tickets. Success: ${successCount}/${ticketsToCreate.length}`);
        }
        
        console.log(`Created ${successCount}/${ticketsToCreate.length} tickets via individual insert`);
      }
    } else {
      console.log("No tickets to create (merchandise only order)");
    }

    // Send ticket email
    console.log("Sending ticket email...");
    try {
      await supabaseClient.functions.invoke('send-ticket-email', {
        body: { orderId: orderId }
      });
      console.log("Ticket email sent successfully");
    } catch (emailError) {
      console.log("Email sending failed:", emailError);
      // Don't fail the whole process for email issues
    }

    // Try to create Xero invoice if auto-sync is enabled
    try {
      console.log("Checking for Xero auto-invoice creation...");
      const { data: event } = await supabaseClient
        .from("events")
        .select("organization_id")
        .eq("id", (await supabaseClient.from("orders").select("event_id").eq("id", orderId).single()).data?.event_id)
        .single();

      if (event) {
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
              orderId: orderId
            }
          });
          console.log("Xero invoice created successfully");
        }
      }
    } catch (xeroError) {
      console.log("Xero integration failed:", xeroError);
      // Don't fail the whole process for Xero issues
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Payment completed and tickets created successfully",
      orderId: orderId,
      ticketsCreated: ticketsToCreate.length,
      emailSent: true
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
