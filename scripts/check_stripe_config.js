// Quick script to check if Stripe Connect is configured correctly
console.log('=== STRIPE CONNECT CONFIGURATION CHECK ===');

// You can run this to verify your Stripe Connect setup
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'your-stripe-secret-key');

async function checkStripeConfig() {
  try {
    // Check if the secret key is for the right account
    const account = await stripe.accounts.retrieve();
    console.log('Platform Account ID:', account.id);
    console.log('Account Type:', account.type);
    console.log('Account Email:', account.email);
    console.log('Country:', account.country);
    
    // List connected accounts (if any)
    const connectedAccounts = await stripe.accounts.list({ limit: 10 });
    console.log('\nConnected Accounts:');
    if (connectedAccounts.data.length === 0) {
      console.log('No connected accounts found');
    } else {
      connectedAccounts.data.forEach((acc, i) => {
        console.log(`${i + 1}. Account ID: ${acc.id}`);
        console.log(`   Type: ${acc.type}`);
        console.log(`   Email: ${acc.email || 'No email'}`);
        console.log(`   Created: ${new Date(acc.created * 1000).toISOString()}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error checking Stripe config:', error.message);
  }
}

// Uncomment and run this if you want to check your Stripe setup
// checkStripeConfig();