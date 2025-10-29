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
    const { organizationId, payoutId } = await req.json();

    if (!organizationId) {
      throw new Error("organizationId is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get organization's Stripe account ID
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("stripe_account_id, currency")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      throw new Error("Organization not found");
    }

    if (!org.stripe_account_id) {
      throw new Error("Organization has not connected their Stripe account");
    }

    console.log("Syncing payouts for organization:", organizationId);
    console.log("Stripe account ID:", org.stripe_account_id);

    // Initialize Stripe with platform account
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    let payouts: Stripe.Payout[];

    // Fetch specific payout or list of recent payouts
    if (payoutId) {
      // Fetch single payout
      const payout = await stripe.payouts.retrieve(payoutId, {
        stripeAccount: org.stripe_account_id,
      });
      payouts = [payout];
    } else {
      // Fetch recent payouts (last 100)
      const payoutsList = await stripe.payouts.list(
        {
          limit: 100,
        },
        {
          stripeAccount: org.stripe_account_id,
        }
      );
      payouts = payoutsList.data;
    }

    console.log(`Found ${payouts.length} payouts to sync`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const payout of payouts) {
      try {
        // Check if payout already exists
        const { data: existingPayout } = await supabaseClient
          .from("payouts")
          .select("id, status")
          .eq("processor_payout_id", payout.id)
          .single();

        const payoutData = {
          organization_id: organizationId,
          payment_processor: "stripe",
          processor_payout_id: payout.id,
          processor_account_id: org.stripe_account_id,
          payout_date: new Date(payout.created * 1000).toISOString(),
          arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
          status: mapStripeStatus(payout.status),
          gross_amount: payout.amount / 100, // Convert cents to dollars
          processor_fees: 0, // Stripe fees are in balance transactions
          platform_fees: 0, // Will be calculated from balance transactions
          refunds_amount: 0,
          adjustments_amount: 0,
          net_amount: payout.amount / 100,
          currency: payout.currency.toUpperCase(),
          bank_account_last4: payout.destination ? String(payout.destination).slice(-4) : null,
          bank_name: null, // Not provided by Stripe API
          description: payout.description || null,
          statement_descriptor: payout.statement_descriptor || null,
          metadata: {
            stripe_payout: payout,
            automatic: payout.automatic,
            method: payout.method,
            type: payout.type,
          },
        };

        if (existingPayout) {
          // Update existing payout if status changed
          if (existingPayout.status !== payoutData.status) {
            const { error: updateError } = await supabaseClient
              .from("payouts")
              .update({
                status: payoutData.status,
                arrival_date: payoutData.arrival_date,
                metadata: payoutData.metadata,
              })
              .eq("id", existingPayout.id);

            if (updateError) {
              console.error("Error updating payout:", updateError);
              errorCount++;
            } else {
              console.log("Updated payout:", payout.id);
              syncedCount++;
            }
          } else {
            skippedCount++;
          }
        } else {
          // Insert new payout
          const { data: newPayout, error: insertError } = await supabaseClient
            .from("payouts")
            .insert(payoutData)
            .select()
            .single();

          if (insertError) {
            console.error("Error inserting payout:", insertError);
            errorCount++;
            continue;
          }

          console.log("Inserted payout:", payout.id);
          syncedCount++;

          // Fetch balance transactions for this payout to get detailed breakdown
          try {
            const balanceTransactions = await stripe.balanceTransactions.list(
              {
                payout: payout.id,
                limit: 100,
              },
              {
                stripeAccount: org.stripe_account_id,
              }
            );

            console.log(`Found ${balanceTransactions.data.length} balance transactions for payout ${payout.id}`);

            let totalFees = 0;
            const lineItems = [];
            const feeBreakdown = [];

            for (const txn of balanceTransactions.data) {
              // Create line item for this transaction
              lineItems.push({
                payout_id: newPayout.id,
                order_id: null, // Would need to match by payment_intent_id
                payment_intent_id: txn.source || null,
                transaction_type: mapTransactionType(txn.type),
                transaction_date: new Date(txn.created * 1000).toISOString(),
                gross_amount: txn.amount / 100,
                fee_amount: txn.fee / 100,
                net_amount: txn.net / 100,
                currency: txn.currency.toUpperCase(),
                description: txn.description || null,
                metadata: { balance_transaction: txn },
              });

              totalFees += txn.fee / 100;

              // Create fee breakdown entries
              if (txn.fee_details && txn.fee_details.length > 0) {
                for (const feeDetail of txn.fee_details) {
                  feeBreakdown.push({
                    payout_id: newPayout.id,
                    fee_type: mapFeeType(feeDetail.type),
                    fee_description: feeDetail.description || feeDetail.type,
                    amount: feeDetail.amount / 100,
                    currency: feeDetail.currency.toUpperCase(),
                    payment_intent_id: txn.source || null,
                  });
                }
              }
            }

            // Insert line items
            if (lineItems.length > 0) {
              const { error: lineItemsError } = await supabaseClient
                .from("payout_line_items")
                .insert(lineItems);

              if (lineItemsError) {
                console.error("Error inserting line items:", lineItemsError);
              } else {
                console.log(`Inserted ${lineItems.length} line items`);
              }
            }

            // Insert fee breakdown
            if (feeBreakdown.length > 0) {
              const { error: feesError } = await supabaseClient
                .from("payout_fees_breakdown")
                .insert(feeBreakdown);

              if (feesError) {
                console.error("Error inserting fee breakdown:", feesError);
              } else {
                console.log(`Inserted ${feeBreakdown.length} fee breakdown entries`);
              }
            }

            // Update payout with calculated fees
            await supabaseClient
              .from("payouts")
              .update({
                processor_fees: totalFees,
              })
              .eq("id", newPayout.id);

          } catch (balanceError) {
            console.error("Error fetching balance transactions:", balanceError);
            // Don't fail the whole sync for this
          }
        }
      } catch (payoutError) {
        console.error("Error processing payout:", payout.id, payoutError);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        skipped: skippedCount,
        errors: errorCount,
        total: payouts.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Sync payouts error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper function to map Stripe payout status to our schema
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "pending":
      return "pending";
    case "in_transit":
      return "in_transit";
    case "paid":
      return "paid";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    default:
      return "pending";
  }
}

// Helper function to map Stripe transaction type
function mapTransactionType(txnType: string): string {
  switch (txnType) {
    case "charge":
    case "payment":
      return "charge";
    case "refund":
      return "refund";
    case "adjustment":
    case "payout_failure":
      return "adjustment";
    case "stripe_fee":
    case "application_fee":
      return "fee";
    default:
      return "charge";
  }
}

// Helper function to map Stripe fee type
function mapFeeType(stripeFeeType: string): string {
  switch (stripeFeeType) {
    case "stripe_fee":
      return "stripe_fee";
    case "application_fee":
      return "platform_fee";
    default:
      return "other";
  }
}
