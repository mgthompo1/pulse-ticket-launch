import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

    const { invoiceId } = await req.json();

    console.log("=== STRIPE INVOICE PAYMENT REQUEST ===");
    console.log("Invoice ID:", invoiceId);

    if (!invoiceId) {
      throw new Error("Missing required parameter: invoiceId");
    }

    // Get invoice and organization details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select(`
        *,
        organizations!inner(
          stripe_account_id,
          stripe_secret_key,
          payment_provider,
          name,
          currency
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice not found:", invoiceError);
      throw new Error("Invoice not found");
    }

    const org = invoice.organizations;
    if (org.payment_provider !== "stripe") {
      throw new Error("Stripe not configured as payment provider for this organization");
    }

    if (!org.stripe_secret_key) {
      throw new Error("Stripe secret key not configured");
    }

    // Initialize Stripe
    const stripe = new Stripe(org.stripe_secret_key, {
      apiVersion: "2023-10-16",
    });

    // Use the total from the invoice
    const totalAmount = parseFloat(invoice.total);

    if (totalAmount <= 0) {
      throw new Error("Invalid invoice total amount");
    }

    // Convert to cents for Stripe
    const amountInCents = Math.round(totalAmount * 100);
    const currency = org.currency?.toLowerCase() || "usd";

    console.log("=== CREATING STRIPE CHECKOUT SESSION ===");
    console.log("Amount:", amountInCents, "cents");
    console.log("Currency:", currency);

    // Create Stripe Checkout session for invoice payment
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for invoice ${invoice.invoice_number} from ${org.name}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get("origin") || "https://pulse-ticket-launch.lovable.app"}/invoice-payment-success?invoice=${invoiceId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin") || "https://pulse-ticket-launch.lovable.app"}/payment-cancelled?invoice=${invoiceId}`,
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        organization_id: invoice.organization_id,
      },
    });

    console.log("=== STRIPE CHECKOUT SESSION CREATED ===");
    console.log("Session ID:", session.id);
    console.log("Payment URL:", session.url);

    // Update invoice with Stripe session info
    const { error: updateError } = await supabaseClient
      .from("invoices")
      .update({
        payment_url: session.url,
        stripe_session_id: session.id,
        status: 'sent' // Mark as sent when payment link is generated
      })
      .eq("id", invoiceId);

    if (updateError) {
      console.error("Error updating invoice:", updateError);
      // Don't fail the operation if update fails
    }

    return new Response(JSON.stringify({
      sessionId: session.id,
      paymentUrl: session.url,
      invoiceId: invoiceId,
      totalAmount: totalAmount,
      currency: currency,
      success: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Stripe invoice payment error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});