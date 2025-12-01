import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yoxsewbpoqxscsutqlcb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking organization settings...\n');

// Mitch's organization ID
const orgId = 'a0fb92a2-2cd1-48e2-93b1-1b6294a9da13';

const { data: org, error } = await supabase
  .from('organizations')
  .select('id, name, currency, payment_provider, stripe_account_id, stripe_booking_fee_enabled')
  .eq('id', orgId)
  .single();

if (error) {
  console.error('❌ Error:', error);
} else if (!org) {
  console.log('📭 Organization not found');
} else {
  console.log('✅ Organization found:\n');
  console.log('ID:', org.id);
  console.log('Name:', org.name);
  console.log('Currency:', org.currency || 'NOT SET');
  console.log('Payment Provider:', org.payment_provider);
  console.log('Stripe Account ID:', org.stripe_account_id || 'NOT CONNECTED');
  console.log('Booking Fees Enabled:', org.stripe_booking_fee_enabled);
}
