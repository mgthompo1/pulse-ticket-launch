import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== FUNCTION STARTED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, items, customerInfo, total } = await req.json();
    
    console.log("=== RECEIVED PARAMETERS ===");
    console.log("eventId:", eventId);
    console.log("items:", JSON.stringify(items, null, 2));
    console.log("total:", total);
    console.log("customerInfo:", JSON.stringify(customerInfo, null, 2));
    
    if (!eventId || !items) {
      throw new Error("Missing required parameters: eventId, items");
    }

    const Stripe = await import("https://esm.sh/stripe@14.21.0");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    
    console.log("=== GETTING SECRET KEY ===");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get event and organization info
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        id,
        name,
        organization_id,
        organizations (
          id,
          name,
          currency
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    console.log("=== EVENT FOUND ===", event.name);

    // Get payment credentials for the organization
    const { data: credentials, error: credError } = await supabaseClient
      .rpc('get_payment_credentials_for_processing', { 
        p_organization_id: event.organization_id 
      });

    if (credError || !credentials || credentials.length === 0) {
      console.error("Credentials error:", credError);
      throw new Error("Payment credentials not found");
    }

    const creds = credentials[0];
    if (!creds.stripe_secret_key) {
      throw new Error("Stripe secret key not configured");
    }

    console.log("=== INITIALIZING STRIPE ===");
    const stripe = new Stripe.default(creds.stripe_secret_key, {
      apiVersion: "2023-10-16",
    });

    // Calculate amount in cents - handle both total parameter and calculate from items
    let finalTotal = total;
    console.log("=== TOTAL CALCULATION DEBUG ===");
    console.log("Received total:", total, "type:", typeof total);
    
    if (!finalTotal || finalTotal === 0) {
      // Calculate total from items if not provided
      console.log("=== CALCULATING FROM ITEMS ===");
      console.log("Items array:", JSON.stringify(items, null, 2));
      
      finalTotal = items.reduce((sum: number, item: any) => {
        const itemTotal = item.unit_price * item.quantity;
        console.log(`Item: ${item.type}, price: ${item.unit_price}, qty: ${item.quantity}, subtotal: ${itemTotal}`);
        return sum + itemTotal;
      }, 0);
      console.log("=== CALCULATED TOTAL FROM ITEMS ===", finalTotal);
    }
    
    console.log("=== FINAL TOTAL ===", finalTotal);
    const amountInCents = Math.round(finalTotal * 100);
    const currency = event.organizations?.currency || "usd";

    console.log("=== CREATING PAYMENT INTENT ===");
    console.log("Amount:", amountInCents, "cents");
    console.log("Currency:", currency);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        eventId: eventId,
        customerName: customerInfo?.name || "Unknown",
        customerEmail: customerInfo?.email || "unknown@example.com",
        itemCount: items?.length || 0,
      },
    });

    console.log("=== PAYMENT INTENT CREATED ===", paymentIntent.id);

    return new Response(JSON.stringify({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("=== DETAILED ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error name:", error.name);
    console.error("Error type:", error.constructor.name);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", error);
    
    // Log the error details for debugging
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.statusCode) {
      console.error("Status code:", error.statusCode);
    }
    if (error.raw) {
      console.error("Raw error:", error.raw);
    }
    
    return new Response(JSON.stringify({ 
      error: error.message,
      type: error.constructor.name,
      code: error.code || 'UNKNOWN'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});