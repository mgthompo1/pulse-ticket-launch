import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Windcave FPRN (Fail Proof Result Notification) Handler
 *
 * This endpoint receives notifications from Windcave when a payment session is completed.
 * It's a failsafe mechanism - if the user's browser closes before the frontend can process
 * the payment result, Windcave will still notify us via this webhook.
 *
 * Windcave sends a GET request with ?sessionId=xxx
 * We need to:
 * 1. Query Windcave to get the session status
 * 2. If payment was successful and order not already processed, complete it
 * 3. Return HTTP 200 to acknowledge receipt
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== WINDCAVE FPRN NOTIFICATION RECEIVED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);

  try {
    // Extract sessionId from query string (GET request)
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      console.log("No sessionId provided in FPRN notification");
      // Return 200 anyway to stop Windcave from retrying
      return new Response("OK - No sessionId", { status: 200 });
    }

    console.log("Processing FPRN for sessionId:", sessionId);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find the order by windcave_session_id
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        events!inner(
          id,
          name,
          organization_id,
          ticket_delivery_method,
          email_customization,
          organizations!inner(
            id
          )
        )
      `)
      .eq("windcave_session_id", sessionId)
      .maybeSingle();

    if (orderError) {
      console.error("Error finding order:", orderError);
      return new Response("OK - Order lookup error", { status: 200 });
    }

    if (!order) {
      console.log("No order found for sessionId:", sessionId);
      return new Response("OK - No order found", { status: 200 });
    }

    console.log("Found order:", order.id, "Status:", order.status);

    // If order is already completed/paid, skip processing
    if (order.status === "completed" || order.status === "paid") {
      console.log("Order already processed, skipping");
      return new Response("OK - Already processed", { status: 200 });
    }

    // Get payment credentials for this organization
    const organizationId = order.events.organization_id;
    const { data: credentials, error: credError } = await supabaseClient
      .from("payment_credentials")
      .select("windcave_username, windcave_api_key, windcave_endpoint")
      .eq("organization_id", organizationId)
      .single();

    if (credError || !credentials) {
      console.error("Could not find payment credentials");
      return new Response("OK - No credentials", { status: 200 });
    }

    // Query Windcave to verify the session status
    const windcaveEndpoint = credentials.windcave_endpoint === "SEC"
      ? `https://sec.windcave.com/api/v1/sessions/${sessionId}`
      : `https://uat.windcave.com/api/v1/sessions/${sessionId}`;

    console.log("Querying Windcave session:", windcaveEndpoint);

    const windcaveResponse = await fetch(windcaveEndpoint, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${btoa(`${credentials.windcave_username}:${credentials.windcave_api_key}`)}`
      }
    });

    if (!windcaveResponse.ok) {
      console.error("Windcave API error:", windcaveResponse.status);
      return new Response("OK - Windcave API error", { status: 200 });
    }

    const sessionData = await windcaveResponse.json();
    console.log("Windcave session state:", sessionData.state);

    // Check if payment was approved
    if (sessionData.state !== "complete" || !sessionData.transactions) {
      console.log("Session not complete or no transactions");
      return new Response("OK - Not complete", { status: 200 });
    }

    // Find the approved transaction
    const approvedTxn = sessionData.transactions.find(
      (txn: any) => txn.authorised === true
    );

    if (!approvedTxn) {
      console.log("No approved transaction found");
      return new Response("OK - No approved txn", { status: 200 });
    }

    console.log("Found approved transaction:", approvedTxn.id);

    // Update order status to completed
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        status: "completed",
        payment_method_type: approvedTxn.card?.cardType || "card",
        card_last_four: approvedTxn.card?.cardNumber?.slice(-4) || null,
        card_brand: approvedTxn.card?.cardType || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id)
      .eq("status", "pending"); // Only update if still pending (prevent race condition)

    if (updateError) {
      console.error("Error updating order:", updateError);
      // Could be a race condition - order already processed
      return new Response("OK - Update error", { status: 200 });
    }

    console.log("Order status updated to completed");

    // Get order items
    const { data: orderItems, error: orderItemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (orderItemsError || !orderItems || orderItems.length === 0) {
      console.error("Error fetching order items:", orderItemsError);
      return new Response("OK - Order items error", { status: 200 });
    }

    // Create tickets if delivery method is qr_ticket
    const ticketDeliveryMethod = order.events.ticket_delivery_method || "qr_ticket";

    if (ticketDeliveryMethod === "qr_ticket") {
      console.log("Creating QR tickets...");

      const ticketsToCreate = [];
      for (const item of orderItems) {
        if (item.item_type === "ticket") {
          for (let i = 0; i < item.quantity; i++) {
            const ticketCode = await supabaseClient.rpc("generate_ticket_code").single();
            if (!ticketCode.error) {
              ticketsToCreate.push({
                order_item_id: item.id,
                ticket_code: ticketCode.data,
                status: "valid",
                checked_in: false
              });
            }
          }
        }
      }

      if (ticketsToCreate.length > 0) {
        const { error: ticketError } = await supabaseClient
          .from("tickets")
          .insert(ticketsToCreate);

        if (ticketError) {
          console.error("Error creating tickets:", ticketError);
        } else {
          console.log("Created", ticketsToCreate.length, "tickets");
        }
      }
    }

    // Send ticket email
    console.log("Sending ticket email...");
    try {
      await supabaseClient.functions.invoke("send-ticket-email-v2", {
        body: { orderId: order.id }
      });
      console.log("Ticket email sent");
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    // Track usage for platform billing
    console.log("Tracking usage...");
    try {
      await supabaseClient.functions.invoke("track-usage", {
        body: {
          order_id: order.id,
          organization_id: organizationId,
          transaction_amount: order.total_amount
        }
      });
      console.log("Usage tracked");
    } catch (usageError) {
      console.error("Usage tracking failed:", usageError);
    }

    console.log("=== FPRN PROCESSING COMPLETE ===");

    // Return 200 to acknowledge receipt
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("FPRN handler error:", error);
    // Still return 200 to prevent endless retries
    return new Response("OK - Error handled", { status: 200 });
  }
});
