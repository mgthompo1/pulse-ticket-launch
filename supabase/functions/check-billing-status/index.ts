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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { organization_id } = await req.json();

    if (!organization_id) {
      throw new Error('Organization ID is required');
    }

    console.log('Checking billing status for organization:', organization_id);

    // Verify user has access to this organization (owner or member)
    console.log(`🔍 Checking authorization for user ${user.id} in org ${organization_id}`);

    // First check if user is the organization owner
    const { data: org, error: orgCheckError } = await supabaseClient
      .from('organizations')
      .select('user_id, name')
      .eq('id', organization_id)
      .maybeSingle();

    if (orgCheckError) {
      console.error('❌ Error checking organization:', orgCheckError);
      throw new Error('Error checking organization');
    }

    if (!org) {
      console.error('❌ Organization not found:', organization_id);
      throw new Error('Organization not found');
    }

    const isOwner = org.user_id === user.id;

    if (isOwner) {
      console.log(`✅ User is the owner of the organization`);
    } else {
      // If not owner, check if they're a member
      const { data: membership, error: membershipError } = await supabaseClient
        .from('organization_users')
        .select('id, role')
        .eq('organization_id', organization_id)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Membership check result:', { membership, membershipError });

      if (membershipError) {
        console.error('❌ Membership query error:', membershipError);
        throw new Error('Error checking organization membership');
      }

      if (!membership) {
        console.error(`❌ User ${user.id} is not the owner or a member of org ${organization_id}`);
        throw new Error('Organization not found or access denied');
      }

      console.log(`✅ User is a ${membership.role} of the organization`);
    }

    // Check billing setup status
    const { data: billingCustomer, error: billingError } = await supabaseClient
      .from('billing_customers')
      .select('*')
      .eq('organization_id', organization_id)
      .single();

    const billingSetupCompleted = billingCustomer && 
      billingCustomer.billing_status === 'active' && 
      billingCustomer.payment_method_id;

    console.log('Billing status check result:', {
      organization_id,
      billing_setup_completed: billingSetupCompleted,
      billing_status: billingCustomer?.billing_status || 'not_found',
      has_payment_method: !!billingCustomer?.payment_method_id,
    });

    // Update organization billing status
    const { error: updateError } = await supabaseClient
      .from('organizations')
      .update({
        billing_setup_completed: billingSetupCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organization_id);

    if (updateError) {
      console.error('Error updating organization billing status:', updateError);
    }

    return new Response(JSON.stringify({
      billing_setup_completed: billingSetupCompleted,
      billing_status: billingCustomer?.billing_status || 'setup_required',
      has_payment_method: !!billingCustomer?.payment_method_id,
      organization_name: org.name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Check billing status error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});