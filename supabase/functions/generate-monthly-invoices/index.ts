import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting monthly invoice generation...');

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get last month's period
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const billingPeriodStart = lastMonth.toISOString().split('T')[0];
    const billingPeriodEnd = lastMonthEnd.toISOString().split('T')[0];

    console.log('Processing billing period:', billingPeriodStart, 'to', billingPeriodEnd);

    // Get all organizations with usage records that haven't been billed
    const { data: usageRecords, error: usageError } = await supabaseClient
      .from('usage_records')
      .select(`
        *,
        organizations (
          id,
          name,
          email
        ),
        billing_customers (
          stripe_customer_id,
          payment_method_id,
          billing_status
        )
      `)
      .eq('billing_period_start', billingPeriodStart)
      .eq('billing_period_end', billingPeriodEnd)
      .eq('billed', false);

    if (usageError) {
      console.error('Error fetching usage records:', usageError);
      throw new Error('Failed to fetch usage records');
    }

    if (!usageRecords || usageRecords.length === 0) {
      console.log('No unbilled usage records found for the period');
      return new Response(JSON.stringify({
        success: true,
        message: 'No unbilled usage records found',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Group usage records by organization
    const organizationUsage = usageRecords.reduce((acc: any, record) => {
      const orgId = record.organization_id;
      if (!acc[orgId]) {
        acc[orgId] = {
          organization: record.organizations,
          billing_customer: record.billing_customers,
          records: [],
          totalFees: 0,
          totalVolume: 0,
          totalTransactions: 0,
        };
      }
      acc[orgId].records.push(record);
      acc[orgId].totalFees += parseFloat(record.total_platform_fee);
      acc[orgId].totalVolume += parseFloat(record.transaction_amount);
      acc[orgId].totalTransactions += 1;
      return acc;
    }, {});

    const invoiceResults = [];

    // Process each organization
    for (const [orgId, orgData] of Object.entries(organizationUsage)) {
      const data = orgData as any;
      
      console.log(`Processing organization ${orgId}: ${data.totalTransactions} transactions, $${data.totalFees.toFixed(2)} total fees`);

      // Skip if no billing customer or payment method
      if (!data.billing_customer?.stripe_customer_id || !data.billing_customer?.payment_method_id) {
        console.log(`Skipping ${orgId}: No billing setup completed`);
        continue;
      }

      // Skip if total fees are less than $1 (minimum charge)
      if (data.totalFees < 1.00) {
        console.log(`Skipping ${orgId}: Total fees ($${data.totalFees.toFixed(2)}) below minimum charge`);
        continue;
      }

      try {
        // Create Stripe invoice
        const invoice = await stripe.invoices.create({
          customer: data.billing_customer.stripe_customer_id,
          auto_advance: true,
          collection_method: 'charge_automatically',
          default_payment_method: data.billing_customer.payment_method_id,
          description: `Platform fees for ${billingPeriodStart} to ${billingPeriodEnd}`,
          metadata: {
            organization_id: orgId,
            billing_period_start: billingPeriodStart,
            billing_period_end: billingPeriodEnd,
            total_transactions: data.totalTransactions.toString(),
          },
        });

        // Add invoice item
        await stripe.invoiceItems.create({
          customer: data.billing_customer.stripe_customer_id,
          invoice: invoice.id,
          amount: Math.round(data.totalFees * 100), // Convert to cents
          currency: 'usd',
          description: `Platform fees: ${data.totalTransactions} transactions ($${data.totalVolume.toFixed(2)} volume)`,
        });

        // Finalize and pay the invoice
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
        await stripe.invoices.pay(invoice.id);

        // Create billing invoice record
        const { data: billingInvoice, error: invoiceError } = await supabaseClient
          .from('billing_invoices')
          .insert({
            organization_id: orgId,
            stripe_invoice_id: invoice.id,
            billing_period_start: billingPeriodStart,
            billing_period_end: billingPeriodEnd,
            total_transactions: data.totalTransactions,
            total_transaction_volume: data.totalVolume,
            total_platform_fees: data.totalFees,
            status: 'paid',
            due_date: new Date(finalizedInvoice.due_date * 1000).toISOString().split('T')[0],
            paid_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (invoiceError) {
          console.error('Error saving billing invoice:', invoiceError);
          throw new Error('Failed to save billing invoice');
        }

        // Mark usage records as billed
        const recordIds = data.records.map((r: any) => r.id);
        const { error: updateError } = await supabaseClient
          .from('usage_records')
          .update({
            billed: true,
            invoice_id: invoice.id,
          })
          .in('id', recordIds);

        if (updateError) {
          console.error('Error updating usage records:', updateError);
          throw new Error('Failed to update usage records');
        }

        invoiceResults.push({
          organization_id: orgId,
          organization_name: data.organization.name,
          invoice_id: invoice.id,
          total_fees: data.totalFees,
          total_transactions: data.totalTransactions,
          status: 'success',
        });

        console.log(`Successfully processed invoice for ${data.organization.name}: $${data.totalFees.toFixed(2)}`);

      } catch (error) {
        console.error(`Error processing invoice for organization ${orgId}:`, error);
        invoiceResults.push({
          organization_id: orgId,
          organization_name: data.organization.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log('Monthly invoice generation completed. Results:', invoiceResults);

    return new Response(JSON.stringify({
      success: true,
      billing_period: `${billingPeriodStart} to ${billingPeriodEnd}`,
      processed_invoices: invoiceResults.length,
      results: invoiceResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Generate monthly invoices error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});