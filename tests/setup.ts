// Test setup and utilities for Supabase Edge Functions
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Export test utilities
export { assertEquals, assertExists, assert };

// Test configuration
export const TEST_CONFIG = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "http://localhost:54321",
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") || "",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  TEST_EMAIL: "test@example.com",
  TEST_EVENT_ID: "test-event-123",
  TEST_ORDER_ID: "test-order-456"
};

// Create test Supabase client
export function createTestClient(useServiceRole = false) {
  return createClient(
    TEST_CONFIG.SUPABASE_URL,
    useServiceRole ? TEST_CONFIG.SUPABASE_SERVICE_ROLE_KEY : TEST_CONFIG.SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

// Mock HTTP Request builder
export function createMockRequest(body: any, method = "POST", headers = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
    ...headers
  };

  return new Request("http://localhost:3000", {
    method,
    headers: defaultHeaders,
    body: JSON.stringify(body)
  });
}

// Function invocation helper
export async function invokeFunctionLocally(functionName: string, body: any) {
  const response = await fetch(`${TEST_CONFIG.SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEST_CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return { response, data };
}

// Test data factories
export const TestDataFactory = {
  createTestOrder: () => ({
    id: TEST_CONFIG.TEST_ORDER_ID,
    customer_name: "Test Customer",
    customer_email: TEST_CONFIG.TEST_EMAIL,
    customer_phone: "+1234567890",
    total_amount: 50.00,
    status: "completed",
    created_at: new Date().toISOString(),
    event_id: TEST_CONFIG.TEST_EVENT_ID,
    events: {
      id: TEST_CONFIG.TEST_EVENT_ID,
      name: "Test Event",
      event_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      venue: "Test Venue",
      description: "A test event for unit testing",
      logo_url: "https://example.com/logo.png",
      ticket_delivery_method: "qr_code",
      email_customization: {
        template: { theme: "professional" },
        branding: { showLogo: true, logoSource: "event" },
        notifications: {
          organiserNotifications: true,
          organiserEmail: "organizer@example.com"
        }
      },
      organizations: {
        id: "test-org-123",
        name: "Test Organization",
        logo_url: "https://example.com/org-logo.png"
      }
    },
    order_items: [
      {
        id: "item-1",
        quantity: 2,
        unit_price: 25.00,
        item_type: "ticket",
        ticket_types: {
          name: "General Admission",
          price: 25.00,
          description: "Standard entry ticket"
        }
      }
    ]
  }),

  createTestTickets: () => [
    {
      id: "ticket-1",
      code: "TCK-TEST-001",
      type: "General Admission",
      status: "active",
      created_at: new Date().toISOString()
    },
    {
      id: "ticket-2",
      code: "TCK-TEST-002",
      type: "General Admission",
      status: "active",
      created_at: new Date().toISOString()
    }
  ],

  createTestEmailCustomization: () => ({
    template: { theme: "professional" },
    branding: {
      showLogo: true,
      logoSource: "event",
      logoSize: "medium"
    },
    notifications: {
      organiserNotifications: true,
      organiserEmail: "test-organizer@example.com"
    },
    blocks: [
      { type: 'header', title: 'Thank you for your purchase!' },
      { type: 'event_details' },
      { type: 'payment_summary' }
    ]
  })
};

// Test database cleanup
export async function cleanupTestData() {
  const client = createTestClient(true);

  try {
    // Clean up test orders, tickets, etc.
    await client.from('tickets').delete().like('code', 'TCK-TEST-%');
    await client.from('orders').delete().eq('customer_email', TEST_CONFIG.TEST_EMAIL);
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('⚠️ Test cleanup failed:', error);
  }
}

// Assertion helpers
export function assertValidEmail(html: string) {
  assert(html.includes('<!DOCTYPE html'), 'Should be valid HTML');
  assert(html.includes('</html>'), 'Should be complete HTML');
  assert(html.includes('<body'), 'Should have body tag');
}

export function assertValidQRUrl(url: string) {
  assert(url.startsWith('data:image') || url.startsWith('http'), 'Should be valid image URL');
}

export function assertValidWalletPass(passData: any) {
  assertExists(passData.pass, 'Should have pass data');
  assertExists(passData.type, 'Should have wallet type');
  assertEquals(typeof passData.success, 'boolean', 'Should have success status');
}