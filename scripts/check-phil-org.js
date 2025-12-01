import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yoxsewbpoqxscsutqlcb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhilOrg() {
  console.log('🔍 Searching for Edge Creative organization...\n');

  // Search for organizations with "edge creative" in the name
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .ilike('name', '%edge%creative%');

  if (orgError) {
    console.error('❌ Error fetching organizations:', orgError);
    return;
  }

  if (!orgs || orgs.length === 0) {
    console.log('No organizations found with "edge creative" in the name');
    console.log('\n🔍 Searching for organizations with "phil" in the name...\n');

    const { data: philOrgs, error: philError } = await supabase
      .from('organizations')
      .select('*')
      .ilike('name', '%phil%');

    if (philError) {
      console.error('❌ Error fetching organizations:', philError);
      return;
    }

    if (!philOrgs || philOrgs.length === 0) {
      console.log('No organizations found with "phil" in the name either');
      console.log('\n📋 Showing all organizations:');

      const { data: allOrgs, error: allError } = await supabase
        .from('organizations')
        .select('id, name, stripe_account_id, stripe_access_token, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (allError) {
        console.error('❌ Error fetching all organizations:', allError);
        return;
      }

      console.table(allOrgs);
      return;
    }

    console.log('✅ Found organizations with "phil":');
    console.table(philOrgs);
    return;
  }

  console.log('✅ Found Edge Creative organization(s):');
  console.log('');

  orgs.forEach(org => {
    console.log(`Organization: ${org.name}`);
    console.log(`ID: ${org.id}`);
    console.log(`User ID: ${org.user_id}`);
    console.log(`Stripe Account ID: ${org.stripe_account_id || 'NOT SET ❌'}`);
    console.log(`Stripe Access Token: ${org.stripe_access_token ? 'SET ✅' : 'NOT SET ❌'}`);
    console.log(`Stripe Refresh Token: ${org.stripe_refresh_token ? 'SET ✅' : 'NOT SET ❌'}`);
    console.log(`Created: ${org.created_at}`);
    console.log(`Updated: ${org.updated_at}`);
    console.log('---');
  });
}

checkPhilOrg().catch(console.error);
