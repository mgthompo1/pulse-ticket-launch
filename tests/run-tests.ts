#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

// Test runner for all Edge Function tests
import { cleanupTestData } from "./setup.ts";

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface TestSuite {
  name: string;
  path: string;
  category: 'unit' | 'integration' | 'e2e';
}

const testSuites: TestSuite[] = [
  // Unit Tests
  { name: "Email Template System", path: "./unit/email-template.test.ts", category: "unit" },
  { name: "Wallet Pass Generation", path: "./unit/wallet-generation.test.ts", category: "unit" },
  { name: "Payment Processing", path: "./unit/payment-processing.test.ts", category: "unit" },
  { name: "Stripe Connect", path: "./unit/stripe-connect.test.ts", category: "unit" },

  // Integration Tests
  { name: "Organizer Notifications", path: "./integration/organizer-notifications.test.ts", category: "integration" },
  { name: "Payment Workflows", path: "./integration/payment-workflows.test.ts", category: "integration" },

  // E2E Tests (to be added)
  // { name: "Complete Purchase Flow", path: "./e2e/purchase-flow.test.ts", category: "e2e" },
];

async function runTestSuite(suite: TestSuite): Promise<boolean> {
  console.log(`${BLUE}Running ${suite.category.toUpperCase()}: ${suite.name}${RESET}`);

  try {
    const command = new Deno.Command("deno", {
      args: [
        "test",
        "--allow-net",
        "--allow-env",
        "--allow-read",
        suite.path
      ],
      stdout: "piped",
      stderr: "piped"
    });

    const { code, stdout, stderr } = await command.output();
    const output = new TextDecoder().decode(stdout);
    const error = new TextDecoder().decode(stderr);

    if (code === 0) {
      console.log(`${GREEN}✅ ${suite.name} - PASSED${RESET}`);

      // Show test summary
      const passedTests = (output.match(/ok \(\d+/g) || []).length;
      if (passedTests > 0) {
        console.log(`   📊 ${passedTests} tests passed`);
      }

      return true;
    } else {
      console.log(`${RED}❌ ${suite.name} - FAILED${RESET}`);
      console.log(`${RED}Error:${RESET}\n${error}`);

      // Show failed test details
      if (output.includes('FAILED')) {
        console.log(`${RED}Output:${RESET}\n${output}`);
      }

      return false;
    }
  } catch (error) {
    console.log(`${RED}❌ ${suite.name} - ERROR${RESET}`);
    console.log(`${RED}Error running test:${RESET} ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`${BLUE}🧪 Running TicketFlo Edge Function Tests${RESET}\n`);

  // Check environment
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.log(`${YELLOW}⚠️  Warning: SUPABASE_URL or SUPABASE_ANON_KEY not set${RESET}`);
    console.log(`${YELLOW}   Some integration tests may fail${RESET}\n`);
  } else {
    console.log(`${GREEN}✅ Environment configured${RESET}`);
    console.log(`   Supabase URL: ${supabaseUrl}`);
    console.log(`   API Key: ${supabaseKey.substring(0, 8)}...${RESET}\n`);
  }

  const results: { suite: TestSuite; passed: boolean }[] = [];

  // Filter tests by category if specified
  const category = Deno.args[0] as 'unit' | 'integration' | 'e2e' | undefined;
  const suitesToRun = category
    ? testSuites.filter(suite => suite.category === category)
    : testSuites;

  if (category) {
    console.log(`${BLUE}🎯 Running ${category.toUpperCase()} tests only${RESET}\n`);
  }

  // Run all test suites
  for (const suite of suitesToRun) {
    const passed = await runTestSuite(suite);
    results.push({ suite, passed });
    console.log(); // Empty line between tests
  }

  // Cleanup test data
  console.log(`${YELLOW}🧹 Cleaning up test data...${RESET}`);
  try {
    await cleanupTestData();
  } catch (error) {
    console.log(`${YELLOW}⚠️  Cleanup warning: ${error.message}${RESET}`);
  }

  // Summary
  console.log(`${BLUE}📊 Test Results Summary${RESET}`);
  console.log("━".repeat(50));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  results.forEach(({ suite, passed }) => {
    const status = passed ? `${GREEN}✅ PASSED${RESET}` : `${RED}❌ FAILED${RESET}`;
    console.log(`${suite.name.padEnd(30)} ${status}`);
  });

  console.log("━".repeat(50));
  console.log(`Total: ${total} | ${GREEN}Passed: ${passed}${RESET} | ${failed > 0 ? RED : GREEN}Failed: ${failed}${RESET}`);

  if (failed > 0) {
    console.log(`\n${RED}🚨 ${failed} test suite(s) failed${RESET}`);
    console.log(`${YELLOW}💡 Check the error messages above for details${RESET}`);
    Deno.exit(1);
  } else {
    console.log(`\n${GREEN}🎉 All tests passed!${RESET}`);
    Deno.exit(0);
  }
}

// Help text
if (Deno.args.includes('--help') || Deno.args.includes('-h')) {
  console.log(`
${BLUE}TicketFlo Edge Function Test Runner${RESET}

Usage:
  deno run --allow-net --allow-env --allow-read tests/run-tests.ts [category]

Categories:
  unit         Run only unit tests
  integration  Run only integration tests
  e2e          Run only end-to-end tests
  (no arg)     Run all tests

Examples:
  deno run --allow-net --allow-env --allow-read tests/run-tests.ts
  deno run --allow-net --allow-env --allow-read tests/run-tests.ts unit
  deno run --allow-net --allow-env --allow-read tests/run-tests.ts integration

Environment Variables:
  SUPABASE_URL              Your Supabase project URL
  SUPABASE_ANON_KEY        Your Supabase anon key
  SUPABASE_SERVICE_ROLE_KEY Your Supabase service role key
  `);
  Deno.exit(0);
}

if (import.meta.main) {
  await main();
}