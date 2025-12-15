import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { order_id, organization_id, transaction_amount, is_test_mode, is_free_event, is_donation_only } = await req.json();

    if (!order_id || !organization_id) {
      throw new Error('Missing required parameters: order_id, organization_id');
    }

    console.log('Tracking usage for order:', order_id, 'org:', organization_id, 'amount:', transaction_amount);
    console.log('Test mode:', is_test_mode, 'Free event:', is_free_event, 'Donation only:', is_donation_only);

    // Skip fee tracking for test mode transactions
    if (is_test_mode === true) {
      console.log('⚠️ Skipping platform fee tracking - TEST MODE transaction');
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'test_mode',
        message: 'Platform fees not tracked for test mode transactions',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Skip fee tracking for free events (no revenue to take fees from)
    if (is_free_event === true) {
      console.log('⚠️ Skipping platform fee tracking - FREE EVENT');
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'free_event',
        message: 'Platform fees not tracked for free events',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Skip fee tracking for donation-only transactions (tips to platform, not event revenue)
    if (is_donation_only === true) {
      console.log('⚠️ Skipping platform fee tracking - DONATION ONLY');
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'donation_only',
        message: 'Platform fees not tracked for donation-only transactions',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Validate transaction amount for paid events
    if (!transaction_amount || transaction_amount <= 0) {
      console.log('⚠️ Skipping platform fee tracking - Zero or invalid transaction amount');
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'zero_amount',
        message: 'Platform fees not tracked for zero-amount transactions',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Calculate platform fee (1% + $0.50)
    const feePercentage = 1.00; // 1%
    const feeFixed = 0.50; // $0.50
    const totalPlatformFee = (parseFloat(transaction_amount) * (feePercentage / 100)) + feeFixed;

    // Get billing customer to determine billing period
    const { data: billingCustomer } = await supabaseClient
      .from('billing_customers')
      .select('billing_interval_days, next_billing_at, last_billed_at')
      .eq('organization_id', organization_id)
      .single();

    // Calculate billing period based on organization's billing cycle
    const now = new Date();
    let billingPeriodStart: Date;
    let billingPeriodEnd: Date;

    if (billingCustomer?.next_billing_at) {
      // Use the organization's actual billing cycle
      const intervalDays = billingCustomer.billing_interval_days || 14;
      billingPeriodEnd = new Date(billingCustomer.next_billing_at);
      billingPeriodStart = new Date(billingPeriodEnd);
      billingPeriodStart.setDate(billingPeriodStart.getDate() - intervalDays);
    } else {
      // Fallback to current month if no billing customer exists yet
      billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    console.log('Calculated platform fee:', totalPlatformFee);
    console.log('Billing period:', billingPeriodStart.toISOString().split('T')[0], 'to', billingPeriodEnd.toISOString().split('T')[0]);
    console.log('Billing interval:', billingCustomer?.billing_interval_days || 'default (monthly)');

    // Check if usage record already exists for this order
    const { data: existingRecord } = await supabaseClient
      .from('usage_records')
      .select('id')
      .eq('order_id', order_id)
      .single();

    if (existingRecord) {
      console.log('Usage record already exists for order:', order_id);
      return new Response(JSON.stringify({
        success: true,
        message: 'Usage already tracked for this order',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Create usage record
    const { data: usageRecord, error: usageError } = await supabaseClient
      .from('usage_records')
      .insert({
        organization_id,
        order_id,
        transaction_amount: parseFloat(transaction_amount),
        platform_fee_percentage: feePercentage,
        platform_fee_fixed: feeFixed,
        total_platform_fee: totalPlatformFee,
        billing_period_start: billingPeriodStart.toISOString().split('T')[0],
        billing_period_end: billingPeriodEnd.toISOString().split('T')[0],
        billed: false,
      })
      .select()
      .single();

    if (usageError) {
      console.error('Error creating usage record:', usageError);
      throw new Error('Failed to track usage');
    }

    console.log('Created usage record:', usageRecord.id);

    return new Response(JSON.stringify({
      success: true,
      usage_record_id: usageRecord.id,
      platform_fee: totalPlatformFee,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Track usage error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});