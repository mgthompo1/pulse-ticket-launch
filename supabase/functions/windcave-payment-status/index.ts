import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WINDCAVE-PAYMENT-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { eventId, txnRef, orderId } = await req.json();
    logStep("Checking payment status", { eventId, txnRef, orderId });

    if (!eventId || (!txnRef && !orderId)) {
      throw new Error("Missing required parameters: eventId and either txnRef or orderId are required");
    }

    // Get event and organization details
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        *,
        organizations!inner(
          windcave_hit_username,
          windcave_hit_key,
          windcave_endpoint,
          windcave_enabled,
          windcave_station_id,
          currency
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found or not accessible");
    }

    const org = event.organizations;
    if (!org.windcave_enabled || !org.windcave_hit_username || !org.windcave_hit_key) {
      throw new Error("Windcave HIT terminal not configured for this organization");
    }

    const terminalStationId = org.windcave_station_id;
    if (!terminalStationId) {
      throw new Error("Terminal station ID not configured for this organization");
    }

    // Determine API endpoint based on environment
    const baseUrl = org.windcave_endpoint === "SEC" 
      ? "https://sec.windcave.com/hit/pos.aspx"
      : "https://uat.windcave.com/hit/pos.aspx";

    // Create status check XML request
    const statusXml = `<?xml version="1.0" encoding="utf-8"?>
<Pxr user="${org.windcave_hit_username}" key="${org.windcave_hit_key}">
  <Station>${terminalStationId}</Station>
  <TxnType>Status</TxnType>
  <TxnRef>${txnRef || 'STATUS-CHECK'}</TxnRef>
</Pxr>`;

    logStep("Sending status check to Windcave", { baseUrl, txnRef });

    // Make request to Windcave HIT API
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Accept": "text/xml"
      },
      body: statusXml
    });

    const responseText = await response.text();
    logStep("Windcave status response", { status: response.status, responseText });

    if (!response.ok) {
      throw new Error(`Windcave HIT API error: Status ${response.status} - ${responseText}`);
    }

    // Simple XML parsing to check for success indicators
    const isSuccess = responseText.includes('<Success>1</Success>') || 
                      responseText.includes('<Response>00</Response>') ||
                      responseText.includes('Success') ||
                      responseText.includes('Approved');

    const isPending = responseText.includes('Pending') || 
                      responseText.includes('Processing') ||
                      responseText.includes('InProgress');

    const isDeclined = responseText.includes('Declined') || 
                       responseText.includes('Failed') ||
                       responseText.includes('Error');

    let paymentStatus = 'pending';
    if (isSuccess) {
      paymentStatus = 'completed';
    } else if (isDeclined) {
      paymentStatus = 'failed';
    }

    logStep("Payment status determined", { paymentStatus, isSuccess, isPending, isDeclined });

    // If payment is successful, update order status
    if (isSuccess && orderId) {
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({ 
          status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) {
        logStep("Error updating order status", updateError);
      } else {
        logStep("Order status updated to completed", { orderId });
      }
    }

    return new Response(JSON.stringify({
      success: isSuccess,
      status: paymentStatus,
      message: isSuccess ? "Payment completed successfully" : 
               isDeclined ? "Payment was declined" : 
               "Payment is still being processed",
      rawResponse: responseText,
      orderId,
      txnRef
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
      status: 'error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});