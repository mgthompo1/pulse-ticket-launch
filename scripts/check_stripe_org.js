// Simple script to check Stripe connection for organization
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yoxsewbpoqxscsutqlcb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQzNTg0OCwiZXhwIjoyMDY4MDExODQ4fQ.xKJEWePdMJlYlQz1W1JOUv5aZn4XnDTzaLwfaMhNaJw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStripeConnection() {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, stripe_account_id, stripe_access_token, updated_at')
      .eq('id', '1637dd27-5e10-465c-bcd0-7b78897a2fd0')
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Organization:', data.name);
    console.log('Stripe Account ID:', data.stripe_account_id || 'NOT SET');
    console.log('Stripe Access Token:', data.stripe_access_token ? 'SET' : 'NOT SET');
    console.log('Last Updated:', data.updated_at);
    
    if (data.stripe_account_id) {
      console.log('✅ Stripe Connect is configured');
    } else {
      console.log('❌ Stripe Connect is NOT configured');
    }
  } catch (error) {
    console.error('Script error:', error);
  }
}

checkStripeConnection();