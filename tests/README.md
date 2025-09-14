# 🧪 TicketFlo Edge Function Testing

Comprehensive test suite for Supabase Edge Functions with unit, integration, and end-to-end testing.

## 🚀 Quick Start

```bash
# Run all tests
npm run test

# Run specific test categories
npm run test:unit
npm run test:integration

# Watch mode for development
npm run test:watch

# Direct Deno execution
deno run --allow-net --allow-env --allow-read tests/run-tests.ts
```

## 📁 Test Structure

```
tests/
├── 📁 unit/              # Individual function tests
│   ├── email-template.test.ts
│   ├── wallet-generation.test.ts
│   └── payment-processing.test.ts
│
├── 📁 integration/       # Function + database tests
│   ├── organizer-notifications.test.ts
│   ├── complete-purchase-flow.test.ts
│   └── email-delivery.test.ts
│
├── 📁 e2e/               # Full workflow tests
│   ├── ticket-purchase.test.ts
│   └── event-management.test.ts
│
├── 📁 fixtures/          # Test data and mocks
│   ├── sample-orders.json
│   └── test-events.json
│
├── setup.ts              # Test utilities and configuration
├── run-tests.ts          # Test runner
└── README.md
```

## 🔧 Environment Setup

### Required Environment Variables

```bash
# Add to your .env file or CI/CD secrets
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional for wallet testing
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_PASS_TYPE_ID=pass.com.yourdomain.ticketflo.eventticket
RESEND_API_KEY=your-resend-key
```

### Local Development

```bash
# Install Deno (if not already installed)
curl -fsSL https://deno.land/install.sh | sh

# Make test runner executable
chmod +x tests/run-tests.ts

# Run tests
npm run test
```

## 📊 Test Categories

### 🔬 Unit Tests
Test individual functions in isolation:

- **Email Template System**
  - Template generation
  - Block rendering
  - Theme application
  - Personalization variables

- **Wallet Pass Generation**
  - Apple Wallet pass structure
  - Google Pay pass generation
  - Error handling
  - URL generation

- **Payment Processing**
  - Stripe integration
  - Windcave handling
  - Order validation
  - Receipt generation

### 🔗 Integration Tests
Test functions with database and external services:

- **Organizer Notifications**
  - Email sending with real data
  - Database lookups
  - Configuration handling

- **Complete Purchase Flow**
  - Order creation → Email → Notification flow
  - Payment success handling
  - Ticket generation pipeline

- **Email Delivery**
  - Template rendering with real data
  - Resend API integration
  - Delivery tracking

### 🌐 End-to-End Tests
Test complete user workflows:

- **Ticket Purchase Journey**
  - Widget → Checkout → Payment → Confirmation
  - Email receipt and tickets
  - Organizer notification

- **Event Management**
  - Create event → Configure → Test purchase
  - Email customization → Preview → Send

## 🎯 Writing Tests

### Basic Test Structure

```typescript
import { assertEquals, assertExists, TestDataFactory } from "../setup.ts";

Deno.test("Feature Name", async (t) => {
  await t.step("should do something specific", async () => {
    // Arrange
    const testData = TestDataFactory.createTestOrder();

    // Act
    const result = await functionUnderTest(testData);

    // Assert
    assertEquals(result.success, true);
    assertExists(result.data);
  });
});
```

### Test Data Factories

Use the built-in test data factories:

```typescript
// Create test order with all relationships
const order = TestDataFactory.createTestOrder();

// Create test tickets
const tickets = TestDataFactory.createTestTickets();

// Create email customization
const customization = TestDataFactory.createTestEmailCustomization();
```

### Custom Assertions

```typescript
// Validate email HTML
assertValidEmail(htmlContent);

// Validate QR URLs
assertValidQRUrl(qrImageUrl);

// Validate wallet passes
assertValidWalletPass(passData);
```

## 🤖 CI/CD Integration

### GitHub Actions

The `.github/workflows/test.yml` file automatically:

- ✅ Runs tests on every push and PR
- ✅ Tests multiple categories in parallel
- ✅ Performs security scanning
- ✅ Deploys to staging on develop branch
- ✅ Runs performance benchmarks

### Manual CI Commands

```bash
# Run in GitHub Actions style locally
act -j test-functions

# Deploy after tests pass
npx supabase functions deploy --project-ref your-project-ref
```

## 🔍 Debugging Tests

### Verbose Output

```bash
# Run with detailed logging
DENO_LOG_LEVEL=DEBUG deno run --allow-net --allow-env --allow-read tests/run-tests.ts

# Test specific function
deno test --allow-net --allow-env tests/unit/email-template.test.ts
```

### Common Issues

**Environment Variables Missing**
```bash
# Check if variables are set
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

**Permission Errors**
```bash
# Ensure test runner is executable
chmod +x tests/run-tests.ts
```

**Database Connection Issues**
```bash
# Test connection manually
curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/orders?limit=1"
```

## 📈 Test Coverage Goals

- **Unit Tests**: 90%+ coverage for critical functions
- **Integration Tests**: All major workflows covered
- **E2E Tests**: Primary user journeys validated
- **Error Handling**: All error paths tested

## 🚀 Advanced Testing

### Performance Testing

```bash
# Run performance benchmarks
deno run --allow-net --allow-env tests/performance/email-generation.bench.ts
```

### Load Testing

```bash
# Simulate high load (requires wrk or similar)
wrk -t2 -c10 -d30s "https://your-project.supabase.co/functions/v1/send-ticket-email-v2"
```

### Security Testing

```bash
# Check for hardcoded secrets
grep -r "sk_live\|pk_live" supabase/functions/

# SQL injection testing (manual)
# Test with malicious inputs in request bodies
```

## 🔧 Test Configuration

### Custom Test Settings

Edit `tests/setup.ts` to modify:

- Database connection settings
- Test data factories
- Assertion helpers
- Cleanup procedures

### Environment-Specific Tests

```typescript
const isProduction = Deno.env.get("NODE_ENV") === "production";
const skipIntegrationTests = !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.test({
  name: "Integration test",
  ignore: skipIntegrationTests,
  fn: async () => {
    // Test implementation
  }
});
```

## 📚 Best Practices

### ✅ Do
- Write tests first (TDD)
- Use descriptive test names
- Test both success and error cases
- Mock external services appropriately
- Clean up test data after each test
- Use proper assertion methods

### ❌ Don't
- Test implementation details
- Write overly complex tests
- Share state between tests
- Skip error case testing
- Commit secrets to test files
- Ignore flaky tests

## 🎯 Testing Strategy Summary

**Build here with Claude first** → **Integrate with admin dashboard for monitoring**

This approach gives you:
- ✅ Version-controlled tests
- ✅ Automated CI/CD pipeline
- ✅ Developer-friendly workflow
- ✅ Comprehensive coverage
- ✅ Easy debugging and maintenance

The testing system is designed to catch issues before they reach production while maintaining fast development cycles.