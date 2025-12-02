import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/**
 * Group Invoice Payment Webhook
 *
 * Handles Stripe webhook events for group invoice payments
 * Updates invoice status when payment is completed via Payment Link
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

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // For now, we'll process without signature verification
    // In production, you should verify the webhook signature
    const event = JSON.parse(body);

    console.log("Received Stripe webhook event:", event.type);

    // Handle checkout.session.completed event (from Payment Links)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Check if this is a group invoice payment by looking at metadata
      const invoiceId = session.metadata?.invoice_id;
      const invoiceNumber = session.metadata?.invoice_number;
      const groupId = session.metadata?.group_id;

      if (!invoiceId) {
        console.log("Not a group invoice payment, skipping");
        return new Response(
          JSON.stringify({ received: true, processed: false, reason: "Not a group invoice" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      console.log(`Processing payment for invoice ${invoiceNumber} (${invoiceId})`);

      // Get the payment amount (in cents, convert to dollars)
      const amountPaid = session.amount_total / 100;

      // Get current invoice data
      const { data: invoice, error: fetchError } = await supabaseClient
        .from("group_invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (fetchError || !invoice) {
        console.error("Invoice not found:", fetchError);
        return new Response(
          JSON.stringify({ received: true, processed: false, reason: "Invoice not found" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // Calculate new amount_paid and determine status
      const newAmountPaid = (invoice.amount_paid || 0) + amountPaid;
      const isFullyPaid = newAmountPaid >= invoice.amount_owed;
      const newStatus = isFullyPaid ? "paid" : "partial";

      // Update the invoice
      const { error: updateError } = await supabaseClient
        .from("group_invoices")
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          paid_date: isFullyPaid ? new Date().toISOString().split('T')[0] : null,
        })
        .eq("id", invoiceId);

      if (updateError) {
        console.error("Error updating invoice:", updateError);
        throw new Error("Failed to update invoice");
      }

      console.log(`Updated invoice ${invoiceNumber}: paid $${amountPaid}, total paid $${newAmountPaid}, status: ${newStatus}`);

      // Log the payment activity
      await supabaseClient.from("group_activity_log").insert({
        group_id: groupId,
        action: "invoice_payment_received",
        entity_type: "invoice",
        entity_id: invoiceId,
        metadata: {
          invoice_number: invoiceNumber,
          amount_paid: amountPaid,
          total_paid: newAmountPaid,
          amount_owed: invoice.amount_owed,
          status: newStatus,
          stripe_session_id: session.id,
          payment_method: "stripe_payment_link",
        },
      });

      // Send confirmation notification
      try {
        await supabaseClient.functions.invoke('send-group-notification', {
          body: {
            type: "payment_received",
            groupId: groupId,
            data: {
              invoiceNumber,
              amountPaid,
              totalPaid: newAmountPaid,
              amountOwed: invoice.amount_owed,
              remainingBalance: invoice.amount_owed - newAmountPaid,
              isFullyPaid,
            },
          },
        });
      } catch (notifError) {
        console.error("Failed to send payment notification:", notifError);
      }

      return new Response(
        JSON.stringify({
          received: true,
          processed: true,
          invoice_number: invoiceNumber,
          amount_paid: amountPaid,
          new_status: newStatus,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // For other event types, just acknowledge receipt
    return new Response(
      JSON.stringify({ received: true, processed: false, reason: `Unhandled event type: ${event.type}` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in group-invoice-payment-webhook:", error);
    return new Response(
      JSON.stringify({
        received: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
