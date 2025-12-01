// Test script to simulate ticket purchase and test email flow
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://yoxsewbpoqxscsutqlcb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k'
);

async function testTicketPurchaseFlow() {
  console.log('🧪 Testing Ticket Purchase Email Flow\n');
  console.log('=====================================\n');
  
  try {
    // Test 1: Check if we can access the windcave-dropin-success function
    console.log('1️⃣ Testing windcave-dropin-success function...');
    
    const { data: successData, error: successError } = await supabase.functions.invoke('windcave-dropin-success', {
      body: {
        sessionId: 'test-session-id',
        eventId: 'test-event-id'
      }
    });
    
    if (successError) {
      console.log('⚠️  Expected error (no real session):', successError.message);
    } else {
      console.log('✅ Function executed:', successData);
    }
    
    console.log('\n2️⃣ Testing create-payment-intent function...');
    
    const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        eventId: 'test-event-id',
        items: [{ id: 'test-ticket', name: 'Test Ticket', price: 10, quantity: 1, type: 'ticket' }],
        customerInfo: { name: 'Test User', email: 'mitchellthompson@edgecreative.net', phone: '1234567890' }
      }
    });
    
    if (paymentError) {
      console.log('⚠️  Expected error (no real event):', paymentError.message);
    } else {
      console.log('✅ Function executed:', paymentData);
    }
    
    console.log('\n3️⃣ Testing send-ticket-email function directly...');
    
    // This should fail without a real order ID, but let's see what error we get
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-ticket-email', {
      body: {
        orderId: 'test-order-id'
      }
    });
    
    if (emailError) {
      console.log('⚠️  Expected error (no real order):', emailError.message);
    } else {
      console.log('✅ Function executed:', emailData);
    }
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
  }
  
  console.log('\n=====================================');
  console.log('🔍 Next Steps:');
  console.log('1. Make a real test ticket purchase through the widget');
  console.log('2. Check if emails are sent during the actual purchase flow');
  console.log('3. Check browser console for any errors');
  console.log('4. Check Supabase function logs for detailed error messages');
}

// Run the test
testTicketPurchaseFlow();


