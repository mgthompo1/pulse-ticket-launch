// Quick debug script to understand ticket data structure
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://yoxsewbpoqxscsutqlcb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function debugTickets() {
  if (!supabaseKey) {
    console.log('No SUPABASE_SERVICE_ROLE_KEY found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check tickets table
    console.log('Checking tickets table...');
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('ticket_code, id')
      .limit(5);

    if (ticketsError) {
      console.log('Error querying tickets:', ticketsError);
    } else {
      console.log(`Found ${tickets?.length || 0} tickets:`);
      tickets?.forEach((ticket, i) => {
        console.log(`  ${i + 1}. ID: ${ticket.id}, Code: "${ticket.ticket_code}"`);
      });
    }

    // Check if there are tickets in other related tables
    console.log('\nChecking orders and order_items...');
    const { data: orderItems, error: orderError } = await supabase
      .from('order_items')
      .select('id, item_type, orders(id, customer_email)')
      .eq('item_type', 'ticket')
      .limit(5);

    if (orderError) {
      console.log('Error querying order_items:', orderError);
    } else {
      console.log(`Found ${orderItems?.length || 0} ticket order items:`);
      orderItems?.forEach((item, i) => {
        console.log(`  ${i + 1}. ID: ${item.id}, Order: ${item.orders?.id}, Customer: ${item.orders?.customer_email}`);
      });
    }

  } catch (error) {
    console.log('Debug error:', error);
  }
}

debugTickets();