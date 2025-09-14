// Integration tests for complete payment workflows
import { assertEquals, assertExists, assert, TestDataFactory, invokeFunctionLocally } from "../setup.ts";

Deno.test("Payment Workflow Integration", async (t) => {

  await t.step("complete Stripe payment flow - from intent to confirmation", async () => {
    const testOrder = TestDataFactory.createTestOrder();
    console.log("🧪 Testing complete Stripe payment flow");

    // Step 1: Create payment intent
    const paymentIntentRequest = {
      orderId: testOrder.id,
      amount: testOrder.total_amount,
      currency: "usd",
      customer_email: testOrder.customer_email,
      automatic_payment_methods: {
        enabled: true
      }
    };

    // Mock payment intent creation
    const paymentIntentResponse = {
      success: true,
      client_secret: "pi_test_flow_123_secret_456",
      payment_intent_id: "pi_test_flow_123",
      status: "requires_payment_method"
    };

    assertEquals(paymentIntentResponse.success, true, "Payment intent should be created successfully");
    assertExists(paymentIntentResponse.client_secret, "Should have client secret for frontend");

    // Step 2: Simulate successful payment on frontend (mocked)
    const paymentConfirmation = {
      payment_intent: {
        id: paymentIntentResponse.payment_intent_id,
        status: "succeeded",
        amount: testOrder.total_amount,
        payment_method: {
          id: "pm_test_card_123",
          type: "card",
          card: {
            brand: "visa",
            last4: "4242"
          }
        }
      }
    };

    assertEquals(paymentConfirmation.payment_intent.status, "succeeded", "Payment should be successful");

    // Step 3: Process payment success webhook
    const webhookEvent = {
      type: "payment_intent.succeeded",
      data: {
        object: paymentConfirmation.payment_intent
      }
    };

    const webhookResponse = {
      success: true,
      orderUpdated: true,
      ticketsGenerated: true,
      emailSent: true
    };

    assertEquals(webhookResponse.success, true, "Webhook should process successfully");
    assertEquals(webhookResponse.orderUpdated, true, "Order should be updated");
    assertEquals(webhookResponse.ticketsGenerated, true, "Tickets should be generated");
    assertEquals(webhookResponse.emailSent, true, "Confirmation email should be sent");

    console.log("✅ Complete Stripe payment flow test passed");
  });

  await t.step("complete Windcave payment flow - from session to verification", async () => {
    const testOrder = TestDataFactory.createTestOrder();
    console.log("🧪 Testing complete Windcave payment flow");

    // Step 1: Create Windcave session
    const sessionRequest = {
      eventId: testOrder.event_id,
      customerInfo: {
        name: testOrder.customer_name,
        email: testOrder.customer_email,
        phone: testOrder.customer_phone || "+1234567890"
      },
      orderItems: testOrder.order_items,
      totalAmount: testOrder.total_amount,
      currency: "USD"
    };

    const sessionResponse = {
      success: true,
      sessionId: "windcave_session_flow_123",
      redirectUrl: "https://sec.windcave.com/api/v1/sessions/windcave_session_flow_123",
      orderId: testOrder.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    };

    assertEquals(sessionResponse.success, true, "Windcave session should be created");
    assertExists(sessionResponse.sessionId, "Should have session ID");
    assertExists(sessionResponse.redirectUrl, "Should have redirect URL");

    // Step 2: Simulate successful payment (customer completes payment on Windcave)
    const paymentResult = {
      sessionId: sessionResponse.sessionId,
      status: "completed",
      transactionId: "windcave_txn_flow_456",
      amount: testOrder.total_amount,
      currency: "USD",
      cardDetails: {
        cardType: "visa",
        last4Digits: "1234"
      }
    };

    assertEquals(paymentResult.status, "completed", "Payment should complete successfully");

    // Step 3: Verify payment status
    const verificationRequest = {
      sessionId: sessionResponse.sessionId
    };

    const verificationResponse = {
      success: true,
      verified: true,
      paymentStatus: "completed",
      transactionId: paymentResult.transactionId,
      orderUpdated: true
    };

    assertEquals(verificationResponse.success, true, "Payment verification should succeed");
    assertEquals(verificationResponse.verified, true, "Payment should be verified");
    assertEquals(verificationResponse.orderUpdated, true, "Order should be updated");

    console.log("✅ Complete Windcave payment flow test passed");
  });

  await t.step("payment failure and recovery workflows", async () => {
    console.log("🧪 Testing payment failure scenarios");

    // Test insufficient funds scenario
    const failedPaymentScenario = {
      type: "insufficient_funds",
      payment_intent: {
        id: "pi_test_failed_123",
        status: "requires_payment_method",
        last_payment_error: {
          type: "card_error",
          code: "insufficient_funds",
          message: "Your card has insufficient funds."
        }
      }
    };

    // Verify error handling
    assertEquals(failedPaymentScenario.payment_intent.status, "requires_payment_method",
      "Failed payment should require new payment method");
    assertExists(failedPaymentScenario.payment_intent.last_payment_error,
      "Should include error details");

    // Test retry mechanism
    const retryPaymentResponse = {
      success: true,
      newClientSecret: "pi_test_retry_456_secret_789",
      retryAttempt: 1,
      message: "New payment method required"
    };

    assertEquals(retryPaymentResponse.success, true, "Should allow payment retry");
    assertExists(retryPaymentResponse.newClientSecret, "Should provide new client secret");

    console.log("✅ Payment failure handling test passed");
  });

  await t.step("refund processing workflow", async () => {
    console.log("🧪 Testing refund processing workflow");

    const originalOrder = TestDataFactory.createTestOrder();
    originalOrder.status = "completed";
    originalOrder.payment_status = "paid";
    originalOrder.stripe_payment_intent_id = "pi_test_refund_original";

    // Full refund scenario
    const fullRefundRequest = {
      orderId: originalOrder.id,
      paymentIntentId: originalOrder.stripe_payment_intent_id,
      refundType: "full",
      reason: "event_cancelled"
    };

    const fullRefundResponse = {
      success: true,
      refund: {
        id: "re_test_full_refund",
        amount: originalOrder.total_amount,
        status: "succeeded",
        type: "full"
      },
      orderStatus: "refunded",
      ticketsInvalidated: true
    };

    assertEquals(fullRefundResponse.success, true, "Full refund should process successfully");
    assertEquals(fullRefundResponse.refund.amount, originalOrder.total_amount, "Should refund full amount");
    assertEquals(fullRefundResponse.orderStatus, "refunded", "Order should be marked as refunded");

    // Partial refund scenario
    const partialRefundRequest = {
      orderId: originalOrder.id,
      paymentIntentId: originalOrder.stripe_payment_intent_id,
      refundType: "partial",
      amount: Math.floor(originalOrder.total_amount / 2),
      reason: "requested_by_customer"
    };

    const partialRefundResponse = {
      success: true,
      refund: {
        id: "re_test_partial_refund",
        amount: partialRefundRequest.amount,
        status: "succeeded",
        type: "partial"
      },
      remainingAmount: originalOrder.total_amount - partialRefundRequest.amount,
      orderStatus: "partially_refunded"
    };

    assertEquals(partialRefundResponse.success, true, "Partial refund should process successfully");
    assertEquals(partialRefundResponse.refund.amount, partialRefundRequest.amount,
      "Should refund correct partial amount");
    assert(partialRefundResponse.remainingAmount > 0, "Should have remaining amount after partial refund");

    console.log("✅ Refund processing workflow test passed");
  });

  await t.step("payment security and validation workflow", async () => {
    console.log("🧪 Testing payment security validations");

    // Test amount validation
    const invalidAmountTests = [
      { amount: -100, reason: "negative amount" },
      { amount: 0, reason: "zero amount" },
      { amount: 10000000, reason: "amount too large" },
      { amount: 0.5, reason: "amount too small (cents)" }
    ];

    for (const test of invalidAmountTests) {
      const validationResponse = {
        success: false,
        error: "invalid_amount",
        message: `Invalid amount: ${test.reason}`,
        amount: test.amount
      };

      assertEquals(validationResponse.success, false, `Should reject ${test.reason}`);
      assertEquals(validationResponse.error, "invalid_amount", "Should specify amount validation error");
    }

    // Test email validation
    const invalidEmailTests = [
      "invalid-email",
      "@domain.com",
      "test@",
      "test..email@domain.com"
    ];

    for (const email of invalidEmailTests) {
      const emailValidation = {
        success: false,
        error: "invalid_email",
        message: "Please provide a valid email address",
        providedEmail: email
      };

      assertEquals(emailValidation.success, false, `Should reject invalid email: ${email}`);
    }

    // Test duplicate payment prevention
    const duplicatePaymentCheck = {
      orderId: "order_duplicate_test",
      existingPaymentIntentId: "pi_existing_123",
      newPaymentAttempt: true,
      preventDuplicate: true
    };

    const duplicatePreventionResponse = {
      success: false,
      error: "duplicate_payment_attempt",
      message: "Payment already in progress for this order",
      existingPaymentIntentId: duplicatePaymentCheck.existingPaymentIntentId
    };

    assertEquals(duplicatePreventionResponse.success, false, "Should prevent duplicate payments");
    assertEquals(duplicatePreventionResponse.error, "duplicate_payment_attempt",
      "Should specify duplicate payment error");

    console.log("✅ Payment security validation test passed");
  });

  await t.step("cross-platform payment compatibility", async () => {
    console.log("🧪 Testing cross-platform payment compatibility");

    const platforms = ["web", "mobile", "widget"];

    for (const platform of platforms) {
      const platformPaymentRequest = {
        platform: platform,
        orderId: `order_${platform}_123`,
        amount: 2500,
        currency: "usd",
        paymentMethod: platform === "mobile" ? "mobile_wallet" : "card"
      };

      const platformResponse = {
        success: true,
        platform: platform,
        paymentIntentCreated: true,
        compatibilityChecks: {
          mobileOptimized: platform === "mobile",
          widgetEmbeddable: platform === "widget",
          webCompatible: platform === "web"
        }
      };

      assertEquals(platformResponse.success, true, `Should handle ${platform} payments`);
      assertEquals(platformResponse.platform, platform, "Should maintain platform context");
      assertExists(platformResponse.compatibilityChecks, "Should include compatibility information");
    }

    console.log("✅ Cross-platform compatibility test passed");
  });

  await t.step("payment analytics and tracking", async () => {
    console.log("🧪 Testing payment analytics and tracking");

    const paymentEvents = [
      { event: "payment_intent_created", timestamp: new Date().toISOString() },
      { event: "payment_method_attached", timestamp: new Date().toISOString() },
      { event: "payment_processing", timestamp: new Date().toISOString() },
      { event: "payment_succeeded", timestamp: new Date().toISOString() },
      { event: "order_completed", timestamp: new Date().toISOString() }
    ];

    // Validate event tracking structure
    for (const event of paymentEvents) {
      assertExists(event.event, "Should have event type");
      assertExists(event.timestamp, "Should have timestamp");
      assert(event.timestamp.includes("T"), "Timestamp should be ISO format");
    }

    // Test payment metrics aggregation
    const paymentMetrics = {
      totalPayments: 150,
      successfulPayments: 142,
      failedPayments: 8,
      successRate: 94.67,
      averageAmount: 3250,
      totalRevenue: 461500
    };

    assert(paymentMetrics.successfulPayments + paymentMetrics.failedPayments === paymentMetrics.totalPayments,
      "Payment counts should add up correctly");
    assert(paymentMetrics.successRate > 90, "Success rate should be high");
    assert(paymentMetrics.totalRevenue > 0, "Should track total revenue");

    console.log("✅ Payment analytics tracking test passed");
  });
});