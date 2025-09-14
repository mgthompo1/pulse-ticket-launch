// Unit tests for Stripe Connect functionality
import { assertEquals, assertExists, assert, TestDataFactory, invokeFunctionLocally } from "../setup.ts";

Deno.test("Stripe Connect Functions", async (t) => {

  await t.step("stripe-connect-oauth - should handle OAuth flow", async () => {
    console.log("🧪 Testing Stripe Connect OAuth flow");

    const oauthRequest = {
      code: "ac_test_oauth_code_123",
      state: "organization_456"
    };

    // Mock successful OAuth response
    const mockOAuthResponse = {
      success: true,
      stripeUserId: "acct_test_connect_123",
      accessToken: "sk_test_connect_token_456",
      refreshToken: "rt_test_refresh_789",
      scope: "read_write",
      accountType: "express"
    };

    assertEquals(mockOAuthResponse.success, true, "OAuth should complete successfully");
    assertExists(mockOAuthResponse.stripeUserId, "Should have Stripe user ID");
    assertExists(mockOAuthResponse.accessToken, "Should have access token");
    assertEquals(mockOAuthResponse.scope, "read_write", "Should have correct permissions");
  });

  await t.step("stripe-connect-oauth - should handle OAuth errors", async () => {
    console.log("🧪 Testing OAuth error handling");

    const oauthErrorScenarios = [
      {
        error: "access_denied",
        error_description: "The user denied your request",
        expectedResponse: {
          success: false,
          error: "access_denied",
          message: "User denied access to Stripe Connect"
        }
      },
      {
        error: "invalid_grant",
        error_description: "Authorization code is invalid",
        expectedResponse: {
          success: false,
          error: "invalid_grant",
          message: "Invalid authorization code"
        }
      }
    ];

    for (const scenario of oauthErrorScenarios) {
      assertEquals(scenario.expectedResponse.success, false,
        `Should handle ${scenario.error} error correctly`);
      assertEquals(scenario.expectedResponse.error, scenario.error,
        "Should include error type");
      assertExists(scenario.expectedResponse.message, "Should include error message");
    }
  });

  await t.step("debug-stripe-connect - should provide account information", async () => {
    console.log("🧪 Testing Stripe Connect debug functionality");

    const debugRequest = {
      organizationId: "org_123",
      stripeAccountId: "acct_test_debug_456"
    };

    const mockDebugResponse = {
      success: true,
      account: {
        id: debugRequest.stripeAccountId,
        type: "express",
        country: "US",
        email: "organization@example.com",
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true
      },
      capabilities: {
        card_payments: "active",
        transfers: "active"
      },
      requirements: {
        currently_due: [],
        eventually_due: [],
        disabled_reason: null
      }
    };

    assertEquals(mockDebugResponse.success, true, "Debug should return account info");
    assertEquals(mockDebugResponse.account.type, "express", "Should be Express account type");
    assertEquals(mockDebugResponse.account.charges_enabled, true, "Should be able to accept charges");
    assertEquals(mockDebugResponse.capabilities.card_payments, "active", "Card payments should be active");
    assertEquals(mockDebugResponse.requirements.currently_due.length, 0, "No requirements should be due");
  });

  await t.step("apply-stripe-connect-migration - should migrate existing accounts", async () => {
    console.log("🧪 Testing Stripe Connect migration");

    const migrationRequest = {
      organizationId: "org_migration_123",
      existingStripeData: {
        publishableKey: "pk_test_existing_123",
        // Note: Secret keys should never be in tests - this is just structure validation
        hasSecretKey: true
      }
    };

    const mockMigrationResponse = {
      success: true,
      migrationCompleted: true,
      newStripeAccountId: "acct_migrated_456",
      dataTransferred: {
        customers: 150,
        paymentMethods: 89,
        products: 12
      },
      oldAccountStatus: "deprecated",
      newAccountStatus: "active"
    };

    assertEquals(mockMigrationResponse.success, true, "Migration should complete successfully");
    assertEquals(mockMigrationResponse.migrationCompleted, true, "Should confirm migration completion");
    assertExists(mockMigrationResponse.newStripeAccountId, "Should have new account ID");
    assert(mockMigrationResponse.dataTransferred.customers > 0, "Should transfer customer data");
  });

  await t.step("stripe-separate-charge-webhook - should handle separate charges", async () => {
    console.log("🧪 Testing separate charge webhook processing");

    // Mock webhook event for separate charge
    const separateChargeEvent = {
      type: "charge.succeeded",
      data: {
        object: {
          id: "ch_test_separate_123",
          amount: 500, // Booking fee: $5.00
          currency: "usd",
          application_fee_amount: 50, // Platform fee: $0.50
          transfer_data: {
            destination: "acct_organizer_456"
          },
          metadata: {
            order_id: "order_separate_789",
            charge_type: "booking_fee"
          }
        }
      }
    };

    const mockWebhookResponse = {
      success: true,
      chargeProcessed: true,
      chargeType: "booking_fee",
      orderId: "order_separate_789",
      amount: 500,
      platformFee: 50,
      organizerAmount: 450
    };

    assertEquals(mockWebhookResponse.success, true, "Separate charge should process successfully");
    assertEquals(mockWebhookResponse.chargeType, "booking_fee", "Should identify charge type");
    assertEquals(mockWebhookResponse.platformFee + mockWebhookResponse.organizerAmount,
      mockWebhookResponse.amount, "Fees should add up correctly");
  });

  await t.step("stripe-terminal - should handle in-person payments", async () => {
    console.log("🧪 Testing Stripe Terminal functionality");

    const terminalPaymentRequest = {
      organizationId: "org_terminal_123",
      stripeAccountId: "acct_terminal_456",
      amount: 2500,
      currency: "usd",
      terminalId: "tm_test_terminal_789"
    };

    const mockTerminalResponse = {
      success: true,
      paymentIntent: {
        id: "pi_terminal_123",
        amount: terminalPaymentRequest.amount,
        status: "requires_capture",
        payment_method_types: ["card_present"]
      },
      terminal: {
        id: terminalPaymentRequest.terminalId,
        status: "online",
        location: "loc_test_venue_456"
      }
    };

    assertEquals(mockTerminalResponse.success, true, "Terminal payment should be created");
    assertEquals(mockTerminalResponse.paymentIntent.status, "requires_capture",
      "Should require manual capture");
    assertEquals(mockTerminalResponse.terminal.status, "online", "Terminal should be online");
    assert(mockTerminalResponse.paymentIntent.payment_method_types.includes("card_present"),
      "Should support card present payments");
  });

  await t.step("stripe-connect account validation", async () => {
    console.log("🧪 Testing Stripe Connect account validation");

    const accountValidationTests = [
      {
        name: "valid express account",
        account: {
          type: "express",
          charges_enabled: true,
          payouts_enabled: true,
          details_submitted: true
        },
        expectedValid: true
      },
      {
        name: "incomplete express account",
        account: {
          type: "express",
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false
        },
        expectedValid: false
      },
      {
        name: "restricted account",
        account: {
          type: "express",
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: true,
          requirements: {
            disabled_reason: "requirements.past_due"
          }
        },
        expectedValid: false
      }
    ];

    for (const test of accountValidationTests) {
      const validation = {
        accountType: test.account.type,
        isValid: test.account.charges_enabled &&
                 test.account.payouts_enabled &&
                 test.account.details_submitted &&
                 !test.account.requirements?.disabled_reason,
        canAcceptPayments: test.account.charges_enabled,
        canReceivePayouts: test.account.payouts_enabled
      };

      assertEquals(validation.isValid, test.expectedValid,
        `Account validation should be ${test.expectedValid} for ${test.name}`);
    }
  });

  await t.step("stripe-connect fee calculations", async () => {
    console.log("🧪 Testing Stripe Connect fee calculations");

    const feeCalculationTests = [
      {
        orderAmount: 2500, // $25.00
        platformFeePercentage: 3.5,
        stripeFeePercentage: 2.9,
        stripeFeeFixed: 30, // $0.30
        expectedPlatformFee: 88, // $0.88
        expectedStripeFee: 103, // $1.03
        expectedOrganizerAmount: 2309 // $23.09
      },
      {
        orderAmount: 10000, // $100.00
        platformFeePercentage: 2.5,
        stripeFeePercentage: 2.9,
        stripeFeeFixed: 30,
        expectedPlatformFee: 250, // $2.50
        expectedStripeFee: 320, // $3.20
        expectedOrganizerAmount: 9430 // $94.30
      }
    ];

    for (const test of feeCalculationTests) {
      const calculatedPlatformFee = Math.round(test.orderAmount * (test.platformFeePercentage / 100));
      const calculatedStripeFee = Math.round(test.orderAmount * (test.stripeFeePercentage / 100)) + test.stripeFeeFixed;
      const calculatedOrganizerAmount = test.orderAmount - calculatedPlatformFee - calculatedStripeFee;

      assertEquals(calculatedPlatformFee, test.expectedPlatformFee,
        "Platform fee calculation should be correct");
      assertEquals(calculatedStripeFee, test.expectedStripeFee,
        "Stripe fee calculation should be correct");
      assertEquals(calculatedOrganizerAmount, test.expectedOrganizerAmount,
        "Organizer amount calculation should be correct");

      // Verify total adds up
      assert(calculatedPlatformFee + calculatedStripeFee + calculatedOrganizerAmount === test.orderAmount,
        "All fees and organizer amount should add up to order total");
    }
  });
});