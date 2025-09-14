# Payment Processing Test Suite

This directory contains comprehensive tests for the payment processing functionality in the TicketFlo platform.

## Test Categories

### Unit Tests (`/unit/`)

#### `payment-processing.test.ts`
Tests core payment processing functions:
- ✅ **Payment Intent Creation** - Validates Stripe payment intent generation
- ✅ **Payment Capture** - Tests successful payment processing
- ✅ **Payment Success Handling** - Verifies order completion workflows
- ✅ **Webhook Processing** - Tests Stripe webhook event handling
- ✅ **Windcave Sessions** - Validates Windcave payment session creation
- ✅ **Payment Verification** - Tests Windcave payment status verification
- ✅ **Refund Processing** - Validates full and partial refunds
- ✅ **Error Handling** - Tests payment failure scenarios
- ✅ **Security Validations** - Amount, currency, email validation

#### `stripe-connect.test.ts`
Tests Stripe Connect functionality:
- ✅ **OAuth Flow** - Validates Stripe Connect account linking
- ✅ **Error Handling** - Tests OAuth error scenarios
- ✅ **Account Debug** - Validates account information retrieval
- ✅ **Account Migration** - Tests migration from standard to Connect
- ✅ **Separate Charges** - Tests booking fee processing
- ✅ **Terminal Payments** - Validates in-person payment processing
- ✅ **Account Validation** - Tests account status checks
- ✅ **Fee Calculations** - Validates platform and Stripe fee calculations

### Integration Tests (`/integration/`)

#### `payment-workflows.test.ts`
Tests complete payment workflows:
- ✅ **Complete Stripe Flow** - End-to-end Stripe payment processing
- ✅ **Complete Windcave Flow** - End-to-end Windcave payment processing
- ✅ **Failure Recovery** - Tests payment failure and retry mechanisms
- ✅ **Refund Workflows** - Full and partial refund processing
- ✅ **Security Workflows** - Comprehensive security validation
- ✅ **Cross-Platform** - Web, mobile, widget compatibility
- ✅ **Analytics Tracking** - Payment event tracking and metrics

## Payment Providers Covered

### Stripe
- Payment Intents API
- Webhooks processing
- Stripe Connect (marketplace)
- Terminal (in-person payments)
- Refunds and disputes

### Windcave
- Payment sessions
- Payment verification
- Status checking
- Error handling

## Test Data

Payment tests use mock data that follows real API structures:

```typescript
// Example test payment intent
{
  client_secret: "pi_test_1234567890_secret_test123",
  id: "pi_test_1234567890",
  amount: 2500, // $25.00
  currency: "usd",
  status: "requires_payment_method"
}
```

## Security Testing

Tests include validation for:
- Amount limits and validation
- Currency code validation
- Email format validation
- Duplicate payment prevention
- Fraud prevention patterns

## Error Scenarios Tested

- Insufficient funds
- Expired cards
- Card declined
- Network failures
- Invalid parameters
- Webhook validation failures

## Running Payment Tests

```bash
# Run all payment tests
deno run --allow-net --allow-env --allow-read tests/run-tests.ts

# Run only unit payment tests
deno test --allow-net --allow-env tests/unit/payment-processing.test.ts
deno test --allow-net --allow-env tests/unit/stripe-connect.test.ts

# Run only integration payment tests
deno test --allow-net --allow-env tests/integration/payment-workflows.test.ts
```

## Environment Setup

Payment tests use mock responses but require these environment variables for structure validation:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Test Coverage

The payment test suite provides comprehensive coverage of:

| Component | Coverage |
|-----------|----------|
| Payment Intents | ✅ Complete |
| Webhook Processing | ✅ Complete |
| Refund Handling | ✅ Complete |
| Error Scenarios | ✅ Complete |
| Security Validation | ✅ Complete |
| Cross-Platform | ✅ Complete |
| Stripe Connect | ✅ Complete |
| Windcave Integration | ✅ Complete |

## Future Enhancements

- [ ] Apple Pay / Google Pay tests
- [ ] Subscription payment tests
- [ ] Multi-currency tests
- [ ] Performance benchmarks
- [ ] Load testing scenarios