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
    const {
      contact_id,
      organization_id,
      payment_method_id,
    } = await req.json();

    console.log("Saving payment method for:", { contact_id, organization_id });

    if (!contact_id || !organization_id || !payment_method_id) {
      throw new Error("Missing required parameters");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get contact details
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, email, full_name, first_name, last_name, payment_methods")
      .eq("id", contact_id)
      .single();

    if (contactError || !contact) {
      throw new Error("Contact not found");
    }

    // Get payment credentials for the organization
    const { data: credentials, error: credError } = await supabase
      .rpc('get_payment_credentials_for_processing', {
        p_organization_id: organization_id
      });

    if (credError || !credentials || credentials.length === 0) {
      throw new Error("Payment credentials not found");
    }

    const stripeSecretKey = credentials[0].stripe_secret_key;
    if (!stripeSecretKey) {
      throw new Error("Stripe not configured for this organization");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Check if customer already has a Stripe customer ID
    let stripeCustomerId = contact.payment_methods?.stripe?.customer_id;

    if (!stripeCustomerId) {
      // Create new Stripe customer
      const customerName = contact.full_name ||
        `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
        contact.email;

      const customer = await stripe.customers.create({
        email: contact.email,
        name: customerName,
        metadata: {
          contact_id: contact.id,
          organization_id: organization_id,
        },
      });

      stripeCustomerId = customer.id;
      console.log("Created new Stripe customer:", stripeCustomerId);
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: stripeCustomerId,
    });

    // Set as default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    // Get payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);

    // Update contact with payment method info
    const updatedPaymentMethods = {
      ...(contact.payment_methods || {}),
      stripe: {
        customer_id: stripeCustomerId,
        payment_method_id: payment_method_id,
        last4: paymentMethod.card?.last4 || null,
        brand: paymentMethod.card?.brand || null,
        exp_month: paymentMethod.card?.exp_month || null,
        exp_year: paymentMethod.card?.exp_year || null,
      },
    };

    const { error: updateError } = await supabase
      .from("contacts")
      .update({ payment_methods: updatedPaymentMethods })
      .eq("id", contact_id);

    if (updateError) throw updateError;

    console.log("Payment method saved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        customer_id: stripeCustomerId,
        payment_method_id: payment_method_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error saving payment method:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to save payment method" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
