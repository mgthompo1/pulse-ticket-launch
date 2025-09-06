import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId, eventId, customerInfo } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    console.log("=== WINDCAVE PAYMENT VERIFICATION ===");
    console.log("Session ID:", sessionId);
    console.log("Event ID:", eventId);

    // Get event and organization details for Windcave API credentials
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        *,
        organizations!inner(
          payment_provider
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    // Get payment credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from("payment_credentials")
      .select("windcave_username, windcave_api_key, windcave_endpoint, windcave_enabled")
      .eq("organization_id", event.organization_id)
      .single();

    if (credError || !credentials) {
      throw new Error("Payment credentials not found");
    }

    const org = event.organizations;
    if (!credentials.windcave_enabled || org.payment_provider !== "windcave") {
      throw new Error("Windcave not configured for this organization");
    }

    // Windcave API endpoint for session status
    const windcaveEndpoint = credentials.windcave_endpoint === "SEC" 
      ? `https://sec.windcave.com/api/v1/sessions/${sessionId}`
      : `https://uat.windcave.com/api/v1/sessions/${sessionId}`;

    console.log("Checking session status at:", windcaveEndpoint);

    // Check session status with Windcave
    const statusResponse = await fetch(windcaveEndpoint, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${btoa(`${credentials.windcave_username}:${credentials.windcave_api_key}`)}`
      }
    });

    console.log("Windcave status response:", statusResponse.status);
    
    const sessionStatus = await statusResponse.json();
    console.log("Session status:", JSON.stringify(sessionStatus, null, 2));

    if (!statusResponse.ok) {
      console.error("Windcave status check failed:", sessionStatus);
      throw new Error(`Payment verification failed: ${sessionStatus.message || 'Unknown error'}`);
    }

    // Check if payment was successful
    const isSuccessful = sessionStatus.state === "completed" && 
                        (sessionStatus.result === "approved" || sessionStatus.result === "accepted");

    console.log("Payment status:", {
      state: sessionStatus.state,
      result: sessionStatus.result,
      isSuccessful
    });

    if (!isSuccessful) {
      // Update order status to failed
      await supabaseClient
        .from("orders")
        .update({ 
          status: sessionStatus.result === "declined" ? "failed" : "cancelled" 
        })
        .eq("stripe_session_id", sessionId); // Using this field for Windcave session ID

      return new Response(JSON.stringify({
        success: false,
        status: sessionStatus.result,
        message: `Payment ${sessionStatus.result || 'failed'}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Payment was successful - update order status
    const { data: order, error: orderUpdateError } = await supabaseClient
      .from("orders")
      .update({ status: "completed" })
      .eq("stripe_session_id", sessionId)
      .select()
      .single();

    if (orderUpdateError) {
      console.error("Failed to update order:", orderUpdateError);
      throw new Error("Failed to update order status");
    }

    console.log("Order updated successfully:", order.id);

    // Check event ticket delivery method
    console.log("Event ticket delivery method:", event.ticket_delivery_method || 'qr_ticket');
    const ticketDeliveryMethod = event.ticket_delivery_method || 'qr_ticket';

    // Generate tickets for the completed order only if delivery method is 'qr_ticket'
    const { data: orderItems, error: itemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (itemsError) {
      console.error("Failed to fetch order items:", itemsError);
      throw new Error("Failed to fetch order items");
    }

    // Only create tickets if the delivery method is 'qr_ticket'
    let ticketsToCreate = [];
    if (ticketDeliveryMethod === 'qr_ticket') {
      console.log("Creating QR tickets for order:", order.id);
      
      // Create individual tickets only for ticket items, not merchandise
      const ticketItems = orderItems.filter(item => item.item_type === 'ticket');
      for (const item of ticketItems) {
        for (let i = 0; i < item.quantity; i++) {
          ticketsToCreate.push({
            order_item_id: item.id,
            ticket_code: `${event.name.substring(0, 3).toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            status: "valid"
          });
        }
      }
    } else if (ticketDeliveryMethod === 'confirmation_email') {
      console.log("Email confirmation only mode - no tickets will be generated");
    }

    if (ticketsToCreate.length > 0) {
      const { error: ticketsError } = await supabaseClient
        .from("tickets")
        .insert(ticketsToCreate);

      if (ticketsError) {
        console.error("Failed to create tickets:", ticketsError);
        // Don't fail the verification, but log the error
      } else {
        console.log(`Created ${ticketsToCreate.length} tickets for order ${order.id}`);
      }
    }

    // Send confirmation email
    try {
      await supabaseClient.functions.invoke('send-ticket-email', {
        body: {
          orderId: order.id,
          customerEmail: order.customer_email,
          customerName: order.customer_name,
          eventName: event.name,
          eventDate: event.event_date,
          ticketCount: ticketsToCreate.length
        }
      });
      console.log('Ticket confirmation email sent');
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the verification if email fails
    }
    
    // Send organizer notification if enabled
    console.log("Checking for organizer notifications...");
    try {
      const { data: eventWithCustomization } = await supabaseClient
        .from("events")
        .select("email_customization")
        .eq("id", event.id)
        .single();
      
      if (eventWithCustomization?.email_customization?.notifications?.organiserNotifications) {
        console.log("Organizer notifications enabled, sending notification...");
        
        // Get order data for notification
        const { data: orderWithItems } = await supabaseClient
          .from("orders")
          .select(`
            *,
            order_items (
              *,
              ticket_types (
                name,
                price
              ),
              merchandise (
                name,
                price
              )
            )
          `)
          .eq("id", order.id)
          .single();
        
        if (orderWithItems) {
          // Format order data for notification
          const orderData = orderWithItems.order_items.map((item: any) => ({
            type: item.item_type,
            name: item.item_type === 'ticket' ? item.ticket_types?.name : item.merchandise?.name,
            price: item.item_type === 'ticket' ? item.ticket_types?.price : item.merchandise?.price,
            quantity: item.quantity,
            selectedSeats: item.selected_seats || [],
            selectedSize: item.selected_size,
            selectedColor: item.selected_color
          }));
          
          // Get customer info from order
          const customerInfo = {
            name: orderWithItems.customer_name,
            email: orderWithItems.customer_email,
            phone: orderWithItems.customer_phone,
            customAnswers: orderWithItems.custom_answers || {}
          };
          
          await supabaseClient.functions.invoke('send-organiser-notification', {
            body: { 
              eventId: event.id,
              orderData,
              customerInfo
            }
          });
          console.log("Organizer notification sent successfully");
        }
      }
    } catch (notificationError) {
      console.log("Organizer notification failed:", notificationError);
      // Don't fail the whole process for notification issues
    }

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      status: "completed",
      ticketCount: ticketsToCreate.length,
      message: "Payment verified and tickets generated successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: error.stack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});