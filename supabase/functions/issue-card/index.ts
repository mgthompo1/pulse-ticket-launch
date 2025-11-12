import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IssueCardRequest {
  organizationId: string;
  groupId?: string;
  cardType: 'coordinator' | 'leader' | 'camper' | 'general';
  cardholderName: string;
  cardholderEmail: string;
  cardholderPhone?: string;
  cardholderDob?: string; // YYYY-MM-DD
  initialBalance: number; // in cents
  spendingLimitAmount?: number; // in cents
  spendingLimitInterval?: 'per_authorization' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  allowedCategories?: string[];
  blockedCategories?: string[];
  purpose?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎫 Issue Card Function Started');

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ User auth error:', userError);
      throw new Error('User not authenticated');
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const body: IssueCardRequest = await req.json();
    console.log('📦 Request body:', {
      ...body,
      initialBalance: `$${(body.initialBalance / 100).toFixed(2)}`,
    });

    // Validate required fields
    if (!body.organizationId || !body.cardholderName || !body.cardholderEmail) {
      throw new Error('Missing required fields: organizationId, cardholderName, cardholderEmail');
    }

    // Verify user owns the organization
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id, name, stripe_account_id')
      .eq('id', body.organizationId)
      .eq('user_id', user.id)
      .single();

    if (orgError || !org) {
      throw new Error('Organization not found or access denied');
    }

    if (!org.stripe_account_id) {
      throw new Error('Organization must have Stripe Connect account to issue cards');
    }

    console.log('✅ Organization verified:', org.name);

    // Parse DOB if provided
    let dobParts: { day: number; month: number; year: number } | undefined;
    if (body.cardholderDob) {
      const [year, month, day] = body.cardholderDob.split('-').map(Number);
      dobParts = { day, month, year };
    }

    // Parse name into first and last
    const nameParts = body.cardholderName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // Use first name if no last name

    // Step 1: Create Stripe Cardholder
    console.log('👤 Creating Stripe cardholder...');

    const cardholderParams: Stripe.Issuing.CardholderCreateParams = {
      type: 'individual',
      name: body.cardholderName,
      email: body.cardholderEmail,
      phone_number: body.cardholderPhone,
      billing: {
        address: {
          line1: '123 Main St', // TODO: Get from organization
          city: 'City',
          state: 'State',
          postal_code: '12345',
          country: 'US',
        },
      },
      individual: {
        first_name: firstName,
        last_name: lastName,
        ...(dobParts && { dob: dobParts }),
      },
      metadata: {
        organization_id: body.organizationId,
        group_id: body.groupId || '',
        card_type: body.cardType,
        purpose: body.purpose || '',
      },
    };

    const cardholder = await stripe.issuing.cardholders.create(
      cardholderParams,
      {
        stripeAccount: org.stripe_account_id,
      }
    );

    console.log('✅ Cardholder created:', cardholder.id);

    // Step 2: Create Virtual Card
    console.log('💳 Creating virtual card...');

    const cardParams: Stripe.Issuing.CardCreateParams = {
      cardholder: cardholder.id,
      currency: 'usd',
      type: 'virtual',
      status: 'active',
      metadata: {
        organization_id: body.organizationId,
        group_id: body.groupId || '',
        card_type: body.cardType,
        purpose: body.purpose || '',
      },
    };

    // Add spending controls if specified
    if (body.spendingLimitAmount && body.spendingLimitInterval) {
      cardParams.spending_controls = {
        spending_limits: [
          {
            amount: body.spendingLimitAmount,
            interval: body.spendingLimitInterval,
          },
        ],
      };

      if (body.allowedCategories && body.allowedCategories.length > 0) {
        cardParams.spending_controls.allowed_categories = body.allowedCategories as any[];
      }

      if (body.blockedCategories && body.blockedCategories.length > 0) {
        cardParams.spending_controls.blocked_categories = body.blockedCategories as any[];
      }
    }

    const card = await stripe.issuing.cards.create(
      cardParams,
      {
        stripeAccount: org.stripe_account_id,
      }
    );

    console.log('✅ Virtual card created:', card.id, 'Last 4:', card.last4);

    // Step 3: Save to database
    console.log('💾 Saving card to database...');

    const { data: dbCard, error: dbError } = await supabaseClient
      .from('issuing_cards')
      .insert({
        organization_id: body.organizationId,
        group_id: body.groupId || null,
        card_type: body.cardType,
        cardholder_name: body.cardholderName,
        cardholder_email: body.cardholderEmail,
        cardholder_phone: body.cardholderPhone || null,
        cardholder_dob: body.cardholderDob || null,
        stripe_cardholder_id: cardholder.id,
        stripe_card_id: card.id,
        card_last4: card.last4,
        card_exp_month: card.exp_month,
        card_exp_year: card.exp_year,
        card_status: 'active',
        initial_balance: body.initialBalance,
        current_balance: body.initialBalance,
        spending_limit_amount: body.spendingLimitAmount || null,
        spending_limit_interval: body.spendingLimitInterval || null,
        allowed_merchant_categories: body.allowedCategories || null,
        blocked_merchant_categories: body.blockedCategories || null,
        allowed_countries: ['US'],
        purpose: body.purpose || null,
        issued_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw new Error(`Failed to save card: ${dbError.message}`);
    }

    console.log('✅ Card saved to database:', dbCard.id);

    // Step 4: Record initial balance load
    if (body.initialBalance > 0) {
      console.log('💰 Recording initial balance load...');

      const { error: loadError } = await supabaseClient
        .from('issuing_card_loads')
        .insert({
          card_id: dbCard.id,
          organization_id: body.organizationId,
          group_id: body.groupId || null,
          amount: body.initialBalance,
          source_type: 'organization',
          payment_status: 'completed',
          loaded_by: user.id,
          notes: 'Initial card funding',
          completed_at: new Date().toISOString(),
        });

      if (loadError) {
        console.error('⚠️ Failed to record load:', loadError);
        // Don't fail the whole operation
      } else {
        console.log('✅ Initial load recorded');
      }
    }

    // Step 5: Log activity
    const { error: activityError } = await supabaseClient
      .from('issuing_activity_log')
      .insert({
        organization_id: body.organizationId,
        group_id: body.groupId || null,
        card_id: dbCard.id,
        action: 'card_issued',
        actor_type: 'admin',
        actor_user_id: user.id,
        actor_email: user.email,
        entity_type: 'card',
        entity_id: dbCard.id,
        description: `Issued ${body.cardType} card to ${body.cardholderName}`,
        metadata: {
          card_type: body.cardType,
          initial_balance_cents: body.initialBalance,
          has_spending_limits: !!body.spendingLimitAmount,
        },
      });

    if (activityError) {
      console.error('⚠️ Failed to log activity:', activityError);
      // Don't fail the whole operation
    }

    console.log('🎉 Card issuance complete!');

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        card: {
          id: dbCard.id,
          stripe_card_id: card.id,
          stripe_cardholder_id: cardholder.id,
          card_last4: card.last4,
          card_exp_month: card.exp_month,
          card_exp_year: card.exp_year,
          cardholder_name: body.cardholderName,
          cardholder_email: body.cardholderEmail,
          initial_balance: body.initialBalance,
          card_status: 'active',
        },
        message: `Virtual card issued successfully to ${body.cardholderName}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Error issuing card:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to issue card',
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
