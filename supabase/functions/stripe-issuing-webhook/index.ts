import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Interchange rate: 1.75% (this can vary by card type/network)
const DEFAULT_INTERCHANGE_RATE = 0.0175;

serve(async (req) => {
  try {
    console.log('🎣 Stripe Issuing Webhook Received');

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No stripe-signature header');
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_ISSUING_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('STRIPE_ISSUING_WEBHOOK_SECRET not configured');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ Webhook signature verified:', event.type);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'issuing_authorization.created':
        await handleAuthorizationCreated(event.data.object as Stripe.Issuing.Authorization);
        break;

      case 'issuing_authorization.updated':
        await handleAuthorizationUpdated(event.data.object as Stripe.Issuing.Authorization);
        break;

      case 'issuing_transaction.created':
        await handleTransactionCreated(event.data.object as Stripe.Issuing.Transaction);
        break;

      case 'issuing_transaction.updated':
        await handleTransactionUpdated(event.data.object as Stripe.Issuing.Transaction);
        break;

      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});

async function handleAuthorizationCreated(authorization: Stripe.Issuing.Authorization) {
  console.log('💳 Processing authorization.created:', authorization.id);

  try {
    // Find the card in our database
    const { data: card, error: cardError } = await supabaseClient
      .from('issuing_cards')
      .select('id, organization_id, group_id, current_balance')
      .eq('stripe_card_id', authorization.card.id)
      .single();

    if (cardError || !card) {
      console.error('❌ Card not found:', authorization.card.id);
      return;
    }

    console.log('✅ Card found:', card.id);

    // Calculate interchange (only on approved transactions)
    const interchangeAmount = authorization.approved
      ? Math.floor(authorization.amount * DEFAULT_INTERCHANGE_RATE)
      : 0;

    // Create transaction record
    const { error: txnError } = await supabaseClient
      .from('issuing_transactions')
      .insert({
        card_id: card.id,
        organization_id: card.organization_id,
        group_id: card.group_id,
        stripe_authorization_id: authorization.id,
        amount: authorization.amount,
        currency: authorization.currency,
        merchant_name: authorization.merchant_data?.name,
        merchant_category: authorization.merchant_data?.category,
        merchant_category_code: authorization.merchant_data?.category_code,
        merchant_city: authorization.merchant_data?.city,
        merchant_state: authorization.merchant_data?.state,
        merchant_country: authorization.merchant_data?.country,
        merchant_postal_code: authorization.merchant_data?.postal_code,
        transaction_type: 'authorization',
        authorization_status: authorization.status,
        approved: authorization.approved,
        decline_reason: authorization.request_history?.[0]?.reason,
        interchange_amount: interchangeAmount,
        interchange_rate: DEFAULT_INTERCHANGE_RATE,
        authorized_at: new Date(authorization.created * 1000).toISOString(),
        metadata: {
          authorization_method: authorization.authorization_method,
          network_data: authorization.network_data,
        },
      });

    if (txnError) {
      console.error('❌ Error creating transaction:', txnError);
      throw txnError;
    }

    // Update card balance if approved
    if (authorization.approved) {
      const newBalance = Math.max(0, card.current_balance - authorization.amount);

      const { error: updateError } = await supabaseClient
        .from('issuing_cards')
        .update({
          current_balance: newBalance,
          total_authorized: supabaseClient.rpc('increment', {
            x: authorization.amount
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', card.id);

      if (updateError) {
        console.error('❌ Error updating card balance:', updateError);
      } else {
        console.log('✅ Card balance updated:', newBalance);
      }
    }

    // Log activity
    await logActivity({
      organization_id: card.organization_id,
      group_id: card.group_id,
      card_id: card.id,
      action: authorization.approved ? 'transaction_approved' : 'transaction_declined',
      description: `${authorization.approved ? 'Approved' : 'Declined'} transaction at ${authorization.merchant_data?.name || 'Unknown Merchant'} for $${(authorization.amount / 100).toFixed(2)}`,
      metadata: {
        authorization_id: authorization.id,
        amount_cents: authorization.amount,
        merchant: authorization.merchant_data?.name,
        decline_reason: authorization.request_history?.[0]?.reason,
      },
    });

    console.log('✅ Authorization processed successfully');
  } catch (error) {
    console.error('❌ Error processing authorization:', error);
    throw error;
  }
}

async function handleAuthorizationUpdated(authorization: Stripe.Issuing.Authorization) {
  console.log('🔄 Processing authorization.updated:', authorization.id);

  try {
    // Update existing transaction record
    const { error: updateError } = await supabaseClient
      .from('issuing_transactions')
      .update({
        authorization_status: authorization.status,
        approved: authorization.approved,
        decline_reason: authorization.request_history?.[0]?.reason,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_authorization_id', authorization.id);

    if (updateError) {
      console.error('❌ Error updating transaction:', updateError);
    } else {
      console.log('✅ Transaction updated');
    }
  } catch (error) {
    console.error('❌ Error processing authorization update:', error);
  }
}

async function handleTransactionCreated(transaction: Stripe.Issuing.Transaction) {
  console.log('💰 Processing transaction.created:', transaction.id);

  try {
    // Find the card
    const { data: card, error: cardError } = await supabaseClient
      .from('issuing_cards')
      .select('id, organization_id, group_id')
      .eq('stripe_card_id', transaction.card)
      .single();

    if (cardError || !card) {
      console.error('❌ Card not found:', transaction.card);
      return;
    }

    // Calculate interchange
    const interchangeAmount = Math.floor(transaction.amount * DEFAULT_INTERCHANGE_RATE);

    // Check if we already have a record for this authorization
    const { data: existingTxn } = await supabaseClient
      .from('issuing_transactions')
      .select('id')
      .eq('stripe_authorization_id', transaction.authorization)
      .single();

    if (existingTxn) {
      // Update existing record with transaction details
      const { error: updateError } = await supabaseClient
        .from('issuing_transactions')
        .update({
          stripe_transaction_id: transaction.id,
          transaction_type: transaction.type,
          captured_at: new Date(transaction.created * 1000).toISOString(),
          interchange_amount: interchangeAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTxn.id);

      if (updateError) {
        console.error('❌ Error updating transaction:', updateError);
      } else {
        console.log('✅ Transaction updated with capture details');
      }
    } else {
      // Create new transaction record
      const { error: insertError } = await supabaseClient
        .from('issuing_transactions')
        .insert({
          card_id: card.id,
          organization_id: card.organization_id,
          group_id: card.group_id,
          stripe_transaction_id: transaction.id,
          stripe_authorization_id: transaction.authorization,
          amount: transaction.amount,
          currency: transaction.currency,
          merchant_name: transaction.merchant_data?.name,
          merchant_category: transaction.merchant_data?.category,
          merchant_category_code: transaction.merchant_data?.category_code,
          merchant_city: transaction.merchant_data?.city,
          merchant_state: transaction.merchant_data?.state,
          merchant_country: transaction.merchant_data?.country,
          transaction_type: transaction.type,
          approved: true,
          interchange_amount: interchangeAmount,
          interchange_rate: DEFAULT_INTERCHANGE_RATE,
          authorized_at: new Date(transaction.created * 1000).toISOString(),
          captured_at: new Date(transaction.created * 1000).toISOString(),
        });

      if (insertError) {
        console.error('❌ Error creating transaction:', insertError);
      } else {
        console.log('✅ Transaction created');
      }
    }

    // Update card total_spent
    const { error: spentError } = await supabaseClient
      .from('issuing_cards')
      .update({
        total_spent: supabaseClient.rpc('increment', { x: transaction.amount }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', card.id);

    if (spentError) {
      console.error('❌ Error updating total_spent:', spentError);
    }

    console.log('✅ Transaction processed successfully');
  } catch (error) {
    console.error('❌ Error processing transaction:', error);
  }
}

async function handleTransactionUpdated(transaction: Stripe.Issuing.Transaction) {
  console.log('🔄 Processing transaction.updated:', transaction.id);

  try {
    // Update transaction record
    const { error: updateError } = await supabaseClient
      .from('issuing_transactions')
      .update({
        amount: transaction.amount,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_transaction_id', transaction.id);

    if (updateError) {
      console.error('❌ Error updating transaction:', updateError);
    } else {
      console.log('✅ Transaction updated');
    }
  } catch (error) {
    console.error('❌ Error processing transaction update:', error);
  }
}

async function logActivity(activity: {
  organization_id: string;
  group_id: string | null;
  card_id: string;
  action: string;
  description: string;
  metadata?: any;
}) {
  const { error } = await supabaseClient
    .from('issuing_activity_log')
    .insert({
      ...activity,
      actor_type: 'system',
      entity_type: 'transaction',
      entity_id: activity.card_id,
    });

  if (error) {
    console.error('⚠️ Failed to log activity:', error);
  }
}
