import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const requestBody = await req.json();
    const { eventId, customerInfo, platformTip, customAnswers } = requestBody;
    // Support both 'items' and 'cart' for backwards compatibility
    const items = requestBody.items || requestBody.cart;
    // Support customAnswers from either top-level or inside customerInfo
    const mergedCustomAnswers = customAnswers || customerInfo?.customAnswers || {};

    console.log("=== FREE REGISTRATION REQUEST ===");
    console.log("Event ID:", eventId);
    console.log("Items:", JSON.stringify(items, null, 2));
    console.log("Customer Info:", JSON.stringify(customerInfo, null, 2));
    console.log("Platform Tip:", platformTip);

    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Missing required parameters: eventId, items (or cart)");
    }

    if (!customerInfo?.name || !customerInfo?.email) {
      throw new Error("Missing required customer information: name, email");
    }

    // Verify the event exists and is a free event
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("id, name, pricing_type, organization_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    if (event.pricing_type !== 'free') {
      throw new Error("This event requires payment. Please use the regular checkout.");
    }

    // Create the order with status 'confirmed' (no payment needed)
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        event_id: eventId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone || null,
        total_amount: 0,
        status: "completed", // Free registrations are immediately completed
        custom_answers: mergedCustomAnswers,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create registration");
    }

    console.log("Order created:", order.id);

    // Create order items and get their IDs back
    const orderItemsToInsert = items.map((item: any) => ({
      order_id: order.id,
      ticket_type_id: item.ticket_type_id || item.id,
      item_type: 'ticket',
      quantity: parseInt(item.quantity),
      unit_price: 0, // Free
    }));

    const { data: orderItems, error: orderItemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItemsToInsert)
      .select();

    if (orderItemsError || !orderItems) {
      console.error("Error creating order items:", orderItemsError);
      throw new Error("Failed to create registration items");
    }

    console.log("Order items created:", orderItems.length);

    // Helper function to generate unique ticket codes
    const generateTicketCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like I, O, 0, 1
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    // Create tickets for the registration - must use order_item_id and include ticket_code
    const ticketsToCreate = [];
    for (let i = 0; i < orderItems.length; i++) {
      const orderItem = orderItems[i];
      const originalItem = items[i];
      const quantity = parseInt(originalItem.quantity);

      for (let j = 0; j < quantity; j++) {
        ticketsToCreate.push({
          order_item_id: orderItem.id,  // Use order_item_id, not order_id
          ticket_code: generateTicketCode(),
          status: "valid",
          attendee_name: customerInfo.name,
          attendee_email: customerInfo.email,
        });
      }
    }

    const { data: tickets, error: ticketsError } = await supabaseClient
      .from("tickets")
      .insert(ticketsToCreate)
      .select();

    if (ticketsError) {
      console.error("Error creating tickets:", ticketsError);
      throw new Error("Failed to create tickets");
    }

    console.log("Created", tickets.length, "tickets");

    // Update ticket type sold quantities
    for (const item of items) {
      const ticketTypeId = item.ticket_type_id || item.id;
      const quantity = parseInt(item.quantity);

      await supabaseClient.rpc('increment_ticket_sold', {
        p_ticket_type_id: ticketTypeId,
        p_quantity: quantity
      });
    }

    // Handle platform tip payment if provided
    let tipPaymentIntent = null;
    if (platformTip && platformTip > 0) {
      const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeSecretKey) {
        try {
          const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
          });

          // Create a payment intent for the tip (goes directly to platform)
          tipPaymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(platformTip * 100), // Convert to cents
            currency: "usd",
            metadata: {
              type: "platform_tip",
              order_id: order.id,
              event_id: eventId,
              customer_email: customerInfo.email,
            },
            receipt_email: customerInfo.email,
            description: `TicketFlo tip for ${event.name}`,
          });

          console.log("Created tip payment intent:", tipPaymentIntent.id);

          // Update order with tip amount
          await supabaseClient
            .from("orders")
            .update({
              platform_tip: platformTip,
              tip_payment_intent_id: tipPaymentIntent.id
            })
            .eq("id", order.id);

        } catch (stripeError) {
          console.error("Failed to create tip payment intent:", stripeError);
          // Don't fail the registration if tip payment setup fails
        }
      }
    }

    // Send confirmation email
    try {
      await supabaseClient.functions.invoke('send-tickets', {
        body: {
          orderId: order.id,
          eventId: eventId,
          customerEmail: customerInfo.email,
          customerName: customerInfo.name,
        }
      });
      console.log("Confirmation email sent");
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the registration if email fails
    }

    // If there's a tip, return the client secret for payment
    if (tipPaymentIntent) {
      return new Response(JSON.stringify({
        success: true,
        orderId: order.id,
        message: "Registration confirmed! Complete your tip payment below.",
        ticketCount: tickets.length,
        requiresTipPayment: true,
        tipClientSecret: tipPaymentIntent.client_secret,
        tipAmount: platformTip,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      message: "Registration confirmed! Check your email for confirmation.",
      ticketCount: tickets.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Free registration error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      error: errorMessage,
      details: error instanceof Error ? error.stack : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
