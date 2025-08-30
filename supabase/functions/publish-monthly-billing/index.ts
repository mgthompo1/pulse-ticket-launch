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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Find billing customers due for billing
    const nowIso = new Date().toISOString();
    const { data: customers, error: custErr } = await supabase
      .from("billing_customers")
      .select("id, organization_id, stripe_customer_id, payment_method_id, next_billing_at, billing_interval_days")
      .lte("next_billing_at", nowIso)
      .eq("billing_status", "active");

    if (custErr) throw custErr;

    let processed = 0;
    for (const c of customers || []) {
      const periodEnd = new Date(c.next_billing_at || Date.now());
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - (c.billing_interval_days || 30));

      const { data: usage, error: usageErr } = await supabase
        .from("usage_records")
        .select("id, total_platform_fee")
        .eq("organization_id", c.organization_id)
        .gte("created_at", periodStart.toISOString())
        .lte("created_at", periodEnd.toISOString())
        .eq("billed", false);

      if (usageErr) throw usageErr;

      const totalFees = (usage || []).reduce((sum: number, u: any) => sum + Number(u.total_platform_fee || 0), 0);

      // Skip if nothing to bill; still advance anchor
      if (totalFees <= 0) {
        await supabase
          .from("billing_customers")
          .update({
            last_billed_at: periodEnd.toISOString(),
            next_billing_at: new Date(periodEnd.getTime() + (c.billing_interval_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", c.id);
        continue;
      }

      // Create simple invoice record
      const { data: inv, error: invErr } = await supabase
        .from("billing_invoices")
        .insert({
          organization_id: c.organization_id,
          billing_period_start: periodStart.toISOString(),
          billing_period_end: periodEnd.toISOString(),
          total_transactions: (usage || []).length,
          total_platform_fees: totalFees,
          status: "pending",
          due_date: periodEnd.toISOString(),
        })
        .select()
        .single();

      if (invErr) throw invErr;

      // Charge via Stripe (single invoice-like charge)
      // Create a PaymentIntent for platform fees
      const amountCents = Math.round(totalFees * 100);
      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "nzd",
        customer: c.stripe_customer_id,
        payment_method: c.payment_method_id || undefined,
        confirm: true,
        off_session: true,
        automatic_payment_methods: c.payment_method_id ? undefined : { enabled: true },
        description: `Platform fees ${periodStart.toISOString().slice(0,10)} - ${periodEnd.toISOString().slice(0,10)}`,
        metadata: {
          organization_id: c.organization_id,
          invoice_id: inv.id,
        },
      });

      const paid = pi.status === "succeeded";

      await supabase
        .from("billing_invoices")
        .update({
          status: paid ? "paid" : "failed",
          paid_at: paid ? new Date().toISOString() : null,
        })
        .eq("id", inv.id);

      if (paid) {
        // Mark usage as billed
        await supabase
          .from("usage_records")
          .update({ billed: true, invoice_id: inv.id })
          .in("id", (usage || []).map((u: any) => u.id));
      }

      // Advance cycle
      await supabase
        .from("billing_customers")
        .update({
          last_billed_at: periodEnd.toISOString(),
          next_billing_at: new Date(periodEnd.getTime() + (c.billing_interval_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
          billing_status: paid ? "active" : "past_due",
        })
        .eq("id", c.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("publish-monthly-billing error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


