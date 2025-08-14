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

    const { invoiceId, invoiceData } = await req.json();

    console.log("=== INVOICE PAYMENT REQUEST ===");
    console.log("Invoice ID:", invoiceId);
    console.log("Invoice Data:", JSON.stringify(invoiceData, null, 2));

    if (!invoiceId || !invoiceData) {
      throw new Error("Missing required parameters: invoiceId, invoiceData");
    }

    // Get invoice and organization details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select(`
        *,
        organizations!inner(
          payment_provider
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice not found:", invoiceError);
      throw new Error("Invoice not found");
    }

    // Get payment credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from("payment_credentials")
      .select("windcave_username, windcave_api_key, windcave_endpoint, windcave_enabled")
      .eq("organization_id", invoice.organization_id)
      .single();

    if (credError || !credentials) {
      throw new Error("Payment credentials not found");
    }

    const org = invoice.organizations;
    if (!credentials.windcave_enabled || org.payment_provider !== "windcave") {
      throw new Error("Windcave not configured for this organization");
    }

    if (!credentials.windcave_username || !credentials.windcave_api_key) {
      throw new Error("Windcave credentials not configured");
    }

    // Use the total from the invoice
    const totalAmount = parseFloat(invoice.total);

    if (totalAmount <= 0) {
      throw new Error("Invalid invoice total amount");
    }

    // Windcave API endpoint
    const windcaveEndpoint = credentials.windcave_endpoint === "SEC" 
      ? "https://sec.windcave.com/api/v1/sessions"
      : "https://uat.windcave.com/api/v1/sessions";

    // Create Windcave session for invoice payment
    const sessionData = {
      type: "purchase",
      amount: totalAmount.toFixed(2),
      currency: "NZD",
      merchantReference: `invoice-${invoice.invoice_number}-${Date.now()}`,
      language: "en",
      callbackUrls: {
        approved: `https://pulse-ticket-launch.lovable.app/invoice-payment-success?invoice=${invoiceId}`,
        declined: `https://pulse-ticket-launch.lovable.app/payment-failed?invoice=${invoiceId}`,
        cancelled: `https://pulse-ticket-launch.lovable.app/payment-cancelled?invoice=${invoiceId}`
      }
    };

    console.log("=== WINDCAVE API REQUEST ===");
    console.log("Endpoint:", windcaveEndpoint);
    console.log("Request payload:", JSON.stringify(sessionData, null, 2));

    const windcaveResponse = await fetch(windcaveEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${credentials.windcave_username}:${credentials.windcave_api_key}`)}`
      },
      body: JSON.stringify(sessionData)
    });

    console.log("=== WINDCAVE API RESPONSE ===");
    console.log("Status:", windcaveResponse.status);
    console.log("Status Text:", windcaveResponse.statusText);

    const windcaveResult = await windcaveResponse.json();
    console.log("Response body:", JSON.stringify(windcaveResult, null, 2));

    if (!windcaveResponse.ok) {
      console.error("Windcave API error - Status:", windcaveResponse.status);
      console.error("Windcave API error - Body:", windcaveResult);
      throw new Error(`Windcave API error (${windcaveResponse.status}): ${windcaveResult.message || windcaveResult.error || "Unknown error"}`);
    }

    // Check if we have the expected response structure
    if (!windcaveResult.id) {
      console.error("Missing session ID in Windcave response:", windcaveResult);
      throw new Error("Invalid Windcave response: Missing session ID");
    }

    if (!windcaveResult.links || !Array.isArray(windcaveResult.links)) {
      console.error("Missing links array in Windcave response:", windcaveResult);
      throw new Error("Invalid Windcave response: Missing links array");
    }

    console.log("Links array received:", JSON.stringify(windcaveResult.links, null, 2));

    // Update invoice with payment session ID
    const { error: updateError } = await supabaseClient
      .from("invoices")
      .update({
        windcave_session_id: windcaveResult.id,
        status: 'sent' // Mark as sent when payment link is generated
      })
      .eq("id", invoiceId);

    if (updateError) {
      console.error("Error updating invoice:", updateError);
      // Don't fail the operation if update fails
    }

    return new Response(JSON.stringify({
      sessionId: windcaveResult.id,
      links: windcaveResult.links.map(link => ({
        ...link,
        sessionId: windcaveResult.id
      })),
      invoiceId: invoiceId,
      totalAmount: totalAmount,
      windcaveResponse: windcaveResult,
      debug: {
        state: windcaveResult.state,
        linksCount: windcaveResult.links?.length || 0,
        sessionId: windcaveResult.id
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Windcave invoice payment error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});