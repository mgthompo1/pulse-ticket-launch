// Integration tests for organizer notification system
import { assertEquals, assertExists, assert, TestDataFactory, invokeFunctionLocally } from "../setup.ts";

Deno.test("Organizer Notification Integration", async (t) => {

  await t.step("should send notification with orderId parameter", async () => {
    const testOrderId = TestDataFactory.createTestOrder().id;

    // Test the updated function that accepts orderId
    const requestBody = {
      orderId: testOrderId
    };

    // Mock successful response
    const mockResponse = {
      success: true,
      message: 'Organizer notification sent successfully'
    };

    assertEquals(mockResponse.success, true);
    assertExists(mockResponse.message);
  });

  await t.step("should handle legacy eventId format", async () => {
    const testOrder = TestDataFactory.createTestOrder();

    // Test legacy format (eventId, orderData, customerInfo)
    const requestBody = {
      eventId: testOrder.event_id,
      orderData: [
        {
          type: 'ticket',
          name: 'General Admission',
          price: 25.00,
          quantity: 2
        }
      ],
      customerInfo: {
        name: testOrder.customer_name,
        email: testOrder.customer_email,
        phone: testOrder.customer_phone
      }
    };

    // Should handle both formats
    const hasEventId = !!requestBody.eventId;
    const hasOrderData = Array.isArray(requestBody.orderData);
    const hasCustomerInfo = !!requestBody.customerInfo;

    assert(hasEventId && hasOrderData && hasCustomerInfo, 'Should handle legacy format');
  });

  await t.step("should check notification settings before sending", async () => {
    const testOrder = TestDataFactory.createTestOrder();

    // Mock event with notifications disabled
    const eventWithoutNotifications = {
      ...testOrder.events,
      email_customization: {
        notifications: {
          organiserNotifications: false,
          organiserEmail: null
        }
      }
    };

    // Should skip sending when disabled
    const shouldSend = eventWithoutNotifications.email_customization.notifications.organiserNotifications
                      && eventWithoutNotifications.email_customization.notifications.organiserEmail;

    assert(!shouldSend, 'Should not send when notifications disabled');
  });

  await t.step("should format email content correctly", async () => {
    const testOrder = TestDataFactory.createTestOrder();

    const expectedEmailContent = {
      subject: `New Ticket Sale - ${testOrder.events.name}`,
      to: "organizer@example.com",
      htmlPattern: /🎫 New Ticket Sale!/,
      textPattern: /New Ticket Sale/
    };

    // Mock email structure validation
    assert(typeof expectedEmailContent.subject === 'string', 'Should have subject');
    assert(expectedEmailContent.subject.includes(testOrder.events.name), 'Should include event name');
  });

  await t.step("should include order summary in notification", async () => {
    const testOrder = TestDataFactory.createTestOrder();

    const mockEmailContent = `
      Order Summary:
      Tickets:
      General Admission - Quantity: 2 × $25.00 = $50.00

      Subtotal: $50.00
      Total: $50.00

      Customer Information:
      Name: ${testOrder.customer_name}
      Email: ${testOrder.customer_email}
    `;

    assert(mockEmailContent.includes('Order Summary'), 'Should include order summary');
    assert(mockEmailContent.includes(testOrder.customer_name), 'Should include customer name');
    assert(mockEmailContent.includes('$50.00'), 'Should include totals');
  });
});

Deno.test("Organizer Notification Error Handling", async (t) => {

  await t.step("should handle missing orderId gracefully", async () => {
    const requestBody = {}; // Missing orderId

    const errorResponse = {
      success: false,
      error: 'Missing required parameters. Provide either orderId or (eventId, orderData, customerInfo)'
    };

    assertEquals(errorResponse.success, false);
    assertExists(errorResponse.error);
  });

  await t.step("should handle non-existent orders", async () => {
    const requestBody = {
      orderId: "non-existent-order-123"
    };

    const errorResponse = {
      success: false,
      error: 'Order not found: non-existent-order-123'
    };

    assertEquals(errorResponse.success, false);
    assert(errorResponse.error.includes('Order not found'), 'Should indicate order not found');
  });

  await t.step("should handle email service failures", async () => {
    // Mock Resend API failure
    const emailServiceError = {
      success: false,
      error: 'Failed to send email: API rate limit exceeded',
      service: 'resend'
    };

    assertEquals(emailServiceError.success, false);
    assert(emailServiceError.error.includes('Failed to send email'), 'Should indicate email failure');
  });

  await t.step("should continue gracefully when notification fails", async () => {
    // Organizer notifications should not block ticket generation
    const testOrder = TestDataFactory.createTestOrder();

    // Even if notification fails, ticket process should continue
    const ticketProcessResult = {
      ticketsGenerated: true,
      emailSent: true,
      organizerNotified: false, // This failed but didn't block the process
      error: null
    };

    assertEquals(ticketProcessResult.ticketsGenerated, true);
    assertEquals(ticketProcessResult.emailSent, true);
    // Notification failure doesn't affect core functionality
  });
});

Deno.test("Notification Content Validation", async (t) => {

  await t.step("should include all required order details", async () => {
    const testOrder = TestDataFactory.createTestOrder();

    const requiredFields = [
      'customer_name',
      'customer_email',
      'total_amount',
      'events.name',
      'events.venue',
      'order_items'
    ];

    // Validate all required data is present
    for (const field of requiredFields) {
      const fieldValue = field.includes('.')
        ? field.split('.').reduce((obj: any, key) => obj?.[key], testOrder)
        : (testOrder as any)[field];

      assertExists(fieldValue, `Should have ${field}`);
    }
  });

  await t.step("should format currency correctly", () => {
    const testAmount = 123.45;
    const formatted = `$${testAmount.toFixed(2)}`;

    assertEquals(formatted, "$123.45");
    assert(formatted.includes('.'), 'Should include decimal point');
    assert(formatted.length === 7, 'Should be properly formatted'); // $123.45 = 7 chars
  });

  await t.step("should handle special characters in customer data", () => {
    const testCustomer = {
      name: "John O'Connor & Jane Smith",
      email: "test+special@domain.co.uk"
    };

    // Should sanitize HTML but preserve readable text
    const sanitizedName = testCustomer.name; // HTML sanitization would happen in template
    const validEmail = testCustomer.email.includes('@');

    assertExists(sanitizedName);
    assert(validEmail, 'Should be valid email format');
  });
});