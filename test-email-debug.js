// Comprehensive test script for debugging Resend email functionality
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with proper authentication
const supabase = createClient(
  'https://yoxsewbpoqxscsutqlcb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

async function testEmailFunctionality() {
  console.log('🧪 Testing Resend Email Functionality\n');
  console.log('=====================================\n');
  
  try {
    // Test 1: Basic function connectivity
    console.log('1️⃣ Testing function connectivity...');
    const { data: testData, error: testError } = await supabase.functions.invoke('test-resend-email', {
      body: {
        to: 'test@example.com',
        subject: 'Test Email from TicketFlo'
      }
    });
    
    if (testError) {
      console.error('❌ Function failed with error:', testError.message);
      
      // Try to get more details about the error
      if (testError.context && testError.context.body) {
        try {
          const errorBody = await testError.context.body.json();
          console.error('📋 Error details:', errorBody);
        } catch (e) {
          console.error('📋 Could not parse error body');
        }
      }
    } else {
      console.log('✅ Function executed successfully:', testData);
    }
    
    console.log('\n2️⃣ Testing with a real email address...');
    
    // Test 2: Test with a real email
    const realEmail = 'mitchellthompson@edgecreative.net';
    
    const { data: realTestData, error: realTestError } = await supabase.functions.invoke('test-resend-email', {
      body: {
        to: realEmail,
        subject: 'Real Test Email from TicketFlo'
      }
    });
    
    if (realTestError) {
      console.error('❌ Real email test failed:', realTestError.message);
    } else {
      console.log('✅ Real email test successful:', realTestData);
      console.log('📧 Check your inbox at:', realEmail);
    }
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
  }
  
  console.log('\n=====================================');
  console.log('🔍 Troubleshooting Steps:');
  console.log('1. Check if RESEND_API_KEY is set in Supabase dashboard');
  console.log('2. Verify your Resend API key is valid');
  console.log('3. Check Supabase function logs for detailed errors');
  console.log('4. Ensure your domain is configured in Resend');
}

// Run the test
testEmailFunctionality();
