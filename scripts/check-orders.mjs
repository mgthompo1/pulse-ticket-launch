import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yoxsewbpoqxscsutqlcb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking recent orders...\n');

const { data: orders, error } = await supabase
  .from('orders')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

if (error) {
  console.error('❌ Error:', error);
} else if (!orders || orders.length === 0) {
  console.log('📭 No orders found');
} else {
  console.log(`✅ Found ${orders.length} recent order(s):\n`);
  orders.forEach((order, i) => {
    console.log(`${i + 1}. Order ID: ${order.id?.substring(0, 8)}...`);
    console.log(`   Customer: ${order.customer_name} (${order.customer_email})`);
    console.log(`   Amount: $${order.total_amount}`);
    console.log(`   Booking Fee: $${order.booking_fee || 0}`);
    console.log(`   Status: ${order.status || 'pending'}`);
    console.log(`   Payment Intent: ${order.stripe_payment_intent_id || 'N/A'}`);
    console.log(`   Created: ${new Date(order.created_at).toLocaleString()}`);
    console.log('');
  });
}
