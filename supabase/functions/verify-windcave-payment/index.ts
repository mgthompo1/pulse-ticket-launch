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
          windcave_username,
          windcave_api_key,
          windcave_endpoint,
          windcave_enabled,
          payment_provider
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Event not found:", eventError);
      throw new Error("Event not found");
    }

    const org = event.organizations;
    if (!org.windcave_enabled || org.payment_provider !== "windcave") {
      throw new Error("Windcave not configured for this organization");
    }

    // Windcave API endpoint for session status
    const windcaveEndpoint = org.windcave_endpoint === "SEC" 
      ? `https://sec.windcave.com/api/v1/sessions/${sessionId}`
      : `https://uat.windcave.com/api/v1/sessions/${sessionId}`;

    console.log("Checking session status at:", windcaveEndpoint);

    // Check session status with Windcave
    const statusResponse = await fetch(windcaveEndpoint, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${btoa(`${org.windcave_username}:${org.windcave_api_key}`)}`
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

    // Generate tickets for the completed order
    const { data: orderItems, error: itemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (itemsError) {
      console.error("Failed to fetch order items:", itemsError);
      throw new Error("Failed to fetch order items");
    }

    // Create individual tickets
    const ticketsToCreate = [];
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        ticketsToCreate.push({
          order_item_id: item.id,
          ticket_code: `${event.name.substring(0, 3).toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          status: "valid"
        });
      }
    }

    const { error: ticketsError } = await supabaseClient
      .from("tickets")
      .insert(ticketsToCreate);

    if (ticketsError) {
      console.error("Failed to create tickets:", ticketsError);
      // Don't fail the verification, but log the error
    } else {
      console.log(`Created ${ticketsToCreate.length} tickets for order ${order.id}`);
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