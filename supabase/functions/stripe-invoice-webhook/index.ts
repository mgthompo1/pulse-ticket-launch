import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
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

    // Get the webhook signature from headers
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("No stripe-signature header found");
      return new Response("No signature", { status: 400 });
    }

    // Get the raw body for signature verification
    const body = await req.text();

    // Get Stripe webhook secret from env
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Import Stripe
    const Stripe = await import("https://esm.sh/stripe@14.21.0");
    const stripe = new Stripe.default(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16"
    });

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log("Received Stripe webhook event:", event.type);

    // Handle checkout.session.completed event (for Payment Links)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      console.log("Checkout session completed:", session.id);
      console.log("Session metadata:", session.metadata);

      // Get invoice ID from metadata
      const invoiceId = session.metadata?.invoice_id;

      if (!invoiceId) {
        console.log("No invoice_id in metadata, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Get the invoice
      const { data: invoice, error: invoiceError } = await supabaseClient
        .from("group_invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError || !invoice) {
        console.error("Invoice not found:", invoiceError);
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        });
      }

      console.log("Found invoice:", invoice.invoice_number);

      // Calculate payment amount (convert from cents to dollars)
      const paymentAmount = session.amount_total ? session.amount_total / 100 : 0;

      // Update invoice as paid
      const { error: updateError } = await supabaseClient
        .from("group_invoices")
        .update({
          status: "paid",
          amount_paid: paymentAmount,
          paid_date: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      if (updateError) {
        console.error("Failed to update invoice:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update invoice" }), {
          headers: { "Content-Type": "application/json" },
          status: 500,
        });
      }

      console.log(`✅ Invoice ${invoice.invoice_number} marked as paid: $${paymentAmount}`);

      // Log activity
      await supabaseClient.from("group_activity_log").insert({
        group_id: invoice.group_id,
        action: "invoice_paid",
        entity_type: "invoice",
        entity_id: invoice.id,
        metadata: {
          invoice_number: invoice.invoice_number,
          amount_paid: paymentAmount,
          stripe_session_id: session.id,
        },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in stripe-invoice-webhook:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
