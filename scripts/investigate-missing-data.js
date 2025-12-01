import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yoxsewbpoqxscsutqlcb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateOrder(orderId) {
  console.log(`🔍 INVESTIGATING ORDER: ${orderId}`);
  console.log('='.repeat(50));

  try {
    // 1. Check if order exists
    console.log('\n1️⃣ CHECKING ORDER...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('❌ ORDER NOT FOUND:', orderError.message);
      return;
    }

    console.log('✅ Order found:');
    console.log(`   - ID: ${order.id}`);
    console.log(`   - Status: ${order.status}`);
    console.log(`   - Event ID: ${order.event_id}`);
    console.log(`   - Customer: ${order.customer_name} (${order.customer_email})`);
    console.log(`   - Total: $${order.total_amount}`);
    console.log(`   - Created: ${order.created_at}`);

    // 2. Check if event exists
    console.log('\n2️⃣ CHECKING EVENT...');
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', order.event_id)
      .single();

    if (eventError) {
      console.error('❌ EVENT NOT FOUND:', eventError.message);
      console.error('🚨 THIS IS THE PROBLEM! Event is missing from database');
      return;
    }

    console.log('✅ Event found:');
    console.log(`   - ID: ${event.id}`);
    console.log(`   - Name: ${event.name}`);
    console.log(`   - Organization ID: ${event.organization_id}`);
    console.log(`   - Status: ${event.status}`);

    // 3. Check if organization exists
    console.log('\n3️⃣ CHECKING ORGANIZATION...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', event.organization_id)
      .single();

    if (orgError) {
      console.error('❌ ORGANIZATION NOT FOUND:', orgError.message);
      console.error('🚨 THIS IS THE PROBLEM! Organization is missing from database');
      return;
    }

    console.log('✅ Organization found:');
    console.log(`   - ID: ${org.id}`);
    console.log(`   - Name: ${org.name}`);
    console.log(`   - Booking Fees Enabled: ${org.stripe_booking_fee_enabled}`);

    // 4. Check order items
    console.log('\n4️⃣ CHECKING ORDER ITEMS...');
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('❌ ORDER ITEMS ERROR:', itemsError.message);
      return;
    }

    if (!items || items.length === 0) {
      console.error('❌ NO ORDER ITEMS FOUND');
      console.error('🚨 THIS IS THE PROBLEM! Order items are missing from database');
      return;
    }

    console.log(`✅ Order items found: ${items.length} items`);
    items.forEach((item, index) => {
      console.log(`   Item ${index + 1}:`);
      console.log(`   - ID: ${item.id}`);
      console.log(`   - Type: ${item.item_type}`);
      console.log(`   - Quantity: ${item.quantity}`);
      console.log(`   - Price: $${item.unit_price}`);
    });

    // 5. Check RLS policies
    console.log('\n5️⃣ CHECKING RLS POLICIES...');
    
    // Test the exact query from send-ticket-email
    console.log('\n6️⃣ TESTING EXACT EMAIL QUERY...');
    const { data: emailQuery, error: emailError } = await supabase
      .from("orders")
      .select(`
        *,
        booking_fee_amount,
        booking_fee_enabled,
        subtotal_amount,
        payment_method_type,
        card_last_four,
        card_brand,
        payment_method_id,
        processing_fee_amount,
        events(
          name,
          event_date,
          venue,
          description,
          email_customization,
          organizations(
            id,
            name,
            email,
            logo_url,
            stripe_booking_fee_enabled,
            credit_card_processing_fee_percentage
          )
        ),
        order_items(
          id,
          quantity,
          unit_price,
          item_type,
          ticket_types(
            name,
            description
          ),
          merchandise(
            name
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (emailError) {
      console.error('❌ EMAIL QUERY FAILED:', emailError.message);
      console.error('🚨 THIS IS WHY THE EMAIL FUNCTION FAILS!');
      
      // Check specific parts
      console.log('\n🔍 TESTING INDIVIDUAL PARTS...');
      
      // Test events join
      const { data: eventJoin, error: eventJoinError } = await supabase
        .from("orders")
        .select("*, events(*)")
        .eq("id", orderId)
        .single();
      
      if (eventJoinError) {
        console.error('❌ Events join failed:', eventJoinError.message);
      } else {
        console.log('✅ Events join works:', !!eventJoin.events);
      }
      
      // Test organizations join
      const { data: orgJoin, error: orgJoinError } = await supabase
        .from("orders")
        .select("*, events(*, organizations(*))")
        .eq("id", orderId)
        .single();
      
      if (orgJoinError) {
        console.error('❌ Organizations join failed:', orgJoinError.message);
      } else {
        console.log('✅ Organizations join works:', !!orgJoin.events?.organizations);
      }
      
      return;
    }

    console.log('✅ EMAIL QUERY WORKS! The problem might be intermittent or fixed.');
    console.log('Data structure:');
    console.log(`   - Events: ${!!emailQuery.events}`);
    console.log(`   - Organizations: ${!!emailQuery.events?.organizations}`);
    console.log(`   - Order Items: ${emailQuery.order_items?.length || 0}`);

  } catch (error) {
    console.error('💥 UNEXPECTED ERROR:', error.message);
    console.error(error.stack);
  }
}

// Test both orders
const orders = [
  '1e8d3c6a-4153-41ba-9e4e-33ae1281f538',
  '5b05fc7c-bb71-4102-8226-37a24c7acf06'
];

async function runInvestigation() {
  for (const orderId of orders) {
    await investigateOrder(orderId);
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

runInvestigation();
