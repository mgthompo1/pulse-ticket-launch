import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { orderId } = await req.json();
    
    console.log(`🔍 INVESTIGATING ORDER: ${orderId}`);

    const results = {
      orderId,
      investigation: {}
    };

    // 1. Check if order exists
    console.log('1️⃣ CHECKING ORDER...');
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    results.investigation.order = {
      found: !orderError,
      error: orderError?.message,
      data: order ? {
        id: order.id,
        status: order.status,
        event_id: order.event_id,
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        created_at: order.created_at
      } : null
    };

    if (orderError) {
      console.error('❌ ORDER NOT FOUND:', orderError.message);
      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Check if event exists
    console.log('2️⃣ CHECKING EVENT...');
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', order.event_id)
      .single();

    results.investigation.event = {
      found: !eventError,
      error: eventError?.message,
      data: event ? {
        id: event.id,
        name: event.name,
        organization_id: event.organization_id,
        status: event.status
      } : null
    };

    if (eventError) {
      console.error('❌ EVENT NOT FOUND:', eventError.message);
      console.error('🚨 THIS IS THE PROBLEM! Event is missing from database');
      
      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Check if organization exists
    console.log('3️⃣ CHECKING ORGANIZATION...');
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('id', event.organization_id)
      .single();

    results.investigation.organization = {
      found: !orgError,
      error: orgError?.message,
      data: org ? {
        id: org.id,
        name: org.name,
        stripe_booking_fee_enabled: org.stripe_booking_fee_enabled
      } : null
    };

    if (orgError) {
      console.error('❌ ORGANIZATION NOT FOUND:', orgError.message);
      console.error('🚨 THIS IS THE PROBLEM! Organization is missing from database');
      
      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. Check order items
    console.log('4️⃣ CHECKING ORDER ITEMS...');
    const { data: items, error: itemsError } = await supabaseClient
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    results.investigation.orderItems = {
      found: !itemsError && items && items.length > 0,
      error: itemsError?.message,
      count: items?.length || 0,
      data: items
    };

    if (itemsError || !items || items.length === 0) {
      console.error('❌ ORDER ITEMS MISSING');
      console.error('🚨 THIS IS THE PROBLEM! Order items are missing from database');
    }

    // 5. Test the exact email query
    console.log('5️⃣ TESTING EXACT EMAIL QUERY...');
    const { data: emailQuery, error: emailError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        events(
          name,
          event_date,
          venue,
          description,
          organizations(
            id,
            name,
            email,
            logo_url,
            stripe_booking_fee_enabled
          )
        ),
        order_items(
          id,
          quantity,
          unit_price,
          item_type
        )
      `)
      .eq("id", orderId)
      .single();

    results.investigation.emailQuery = {
      success: !emailError,
      error: emailError?.message,
      hasEvents: !!emailQuery?.events,
      hasOrganizations: !!emailQuery?.events?.organizations,
      hasOrderItems: !!(emailQuery?.order_items && emailQuery.order_items.length > 0)
    };

    // 6. Determine the root cause
    let rootCause = "Unknown";
    if (!results.investigation.order.found) {
      rootCause = "Order does not exist in database";
    } else if (!results.investigation.event.found) {
      rootCause = "Event was deleted or never created";
    } else if (!results.investigation.organization.found) {
      rootCause = "Organization was deleted or never created";
    } else if (!results.investigation.orderItems.found) {
      rootCause = "Order items were never created or were deleted";
    } else if (!results.investigation.emailQuery.success) {
      rootCause = `Database query failed: ${results.investigation.emailQuery.error}`;
    } else {
      rootCause = "All data exists - query should work";
    }

    results.rootCause = rootCause;
    results.recommendation = rootCause === "All data exists - query should work" 
      ? "Try running the email function again - it should work now"
      : "Fix the missing data in the database before emails can be sent";

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("💥 UNEXPECTED ERROR:", error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
