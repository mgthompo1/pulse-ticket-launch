import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yoxsewbpoqxscsutqlcb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k';

const supabase = createClient(supabaseUrl, supabaseKey);

// Edge Creative organization details
const EDGE_CREATIVE_ORG_ID = '1637dd27-5e10-465c-bcd0-7b78897a2fd0';

/**
 * Manually link a Stripe account to Edge Creative organization
 *
 * Usage: node manually-link-stripe-account.js <stripe_account_id>
 * Example: node manually-link-stripe-account.js acct_1234567890
 */
async function linkStripeAccount() {
  const stripeAccountId = process.argv[2];

  if (!stripeAccountId) {
    console.error('❌ Error: Stripe account ID is required');
    console.log('\nUsage: node manually-link-stripe-account.js <stripe_account_id>');
    console.log('Example: node manually-link-stripe-account.js acct_1234567890');
    process.exit(1);
  }

  if (!stripeAccountId.startsWith('acct_')) {
    console.error('❌ Error: Invalid Stripe account ID. It should start with "acct_"');
    process.exit(1);
  }

  console.log('🔗 Linking Stripe account to Edge Creative organization...\n');
  console.log(`Organization ID: ${EDGE_CREATIVE_ORG_ID}`);
  console.log(`Stripe Account ID: ${stripeAccountId}\n`);

  try {
    // Update the organization with the Stripe account ID
    const { data, error } = await supabase
      .from('organizations')
      .update({
        stripe_account_id: stripeAccountId,
        updated_at: new Date().toISOString()
      })
      .eq('id', EDGE_CREATIVE_ORG_ID)
      .select();

    if (error) {
      console.error('❌ Error updating organization:', error);
      process.exit(1);
    }

    console.log('✅ Successfully linked Stripe account to Edge Creative!');
    console.log('\nUpdated organization:');
    console.table(data);

    console.log('\n📝 Note: The access token and refresh token were not set.');
    console.log('This means we cannot make API calls on behalf of Phil\'s Stripe account.');
    console.log('However, for basic payment processing with Stripe Connect, the account ID might be sufficient.');
    console.log('\nIf Phil needs full OAuth integration, he should:');
    console.log('1. Disconnect the account in the dashboard');
    console.log('2. Try connecting again using the OAuth flow');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

linkStripeAccount().catch(console.error);
