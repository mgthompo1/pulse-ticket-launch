import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, MinusCircle, Download, RotateCcw, FileText, ArrowLeft } from "lucide-react";

type TestStatus = "pass" | "fail" | "skip" | "pending";

interface TestCase {
  id: string;
  name: string;
  description?: string;
}

interface TestResult {
  status: TestStatus;
  notes: string;
  timestamp?: string;
  tester?: string;
}

interface TestCategory {
  id: string;
  name: string;
  tests: TestCase[];
}

const QATestingDashboard = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [globalNotes, setGlobalNotes] = useState({
    testerName: "",
    environment: "",
    buildVersion: "",
  });

  // Load saved results from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("qa-test-results");
    const savedNotes = localStorage.getItem("qa-global-notes");
    if (saved) setTestResults(JSON.parse(saved));
    if (savedNotes) setGlobalNotes(JSON.parse(savedNotes));
  }, []);

  // Save results to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("qa-test-results", JSON.stringify(testResults));
  }, [testResults]);

  useEffect(() => {
    localStorage.setItem("qa-global-notes", JSON.stringify(globalNotes));
  }, [globalNotes]);

  const testCategories: TestCategory[] = [
    {
      id: "auth-registration",
      name: "1. User Registration & Authentication",
      tests: [
        { id: "email-signup", name: "Email/Password Registration", description: "Complete signup flow with email verification" },
        { id: "email-validation", name: "Email validation errors", description: "Test invalid email formats" },
        { id: "password-strength", name: "Password strength validation", description: "Test weak passwords" },
        { id: "email-exists", name: "Duplicate email error", description: "Test existing email error" },
        { id: "email-verification", name: "Email verification link", description: "Receive and click verification email" },
        { id: "google-signup", name: "Google OAuth Sign Up", description: "Complete Google OAuth flow" },
        { id: "google-cancel", name: "Google OAuth cancellation", description: "Cancel Google OAuth mid-flow" },
        { id: "apple-signup", name: "Apple Sign In", description: "Complete Apple OAuth flow" },
        { id: "apple-hide-email", name: "Apple hide email option", description: "Test Apple's hide email feature" },
        { id: "apple-cancel", name: "Apple OAuth cancellation", description: "Cancel Apple OAuth mid-flow" },
        { id: "email-login", name: "Email/Password Login", description: "Login with valid credentials" },
        { id: "invalid-credentials", name: "Invalid credentials error", description: "Test wrong password" },
        { id: "forgot-password", name: "Forgot password flow", description: "Complete password reset" },
      ],
    },
    {
      id: "passkey",
      name: "2. Passkey/WebAuthn Setup & Login",
      tests: [
        { id: "passkey-setup", name: "Passkey setup (Chrome Desktop)", description: "Register passkey on Chrome" },
        { id: "passkey-setup-safari", name: "Passkey setup (Safari Desktop)", description: "Register passkey on Safari" },
        { id: "passkey-setup-ios", name: "Passkey setup (iOS Safari)", description: "Register passkey on iPhone" },
        { id: "passkey-setup-android", name: "Passkey setup (Android Chrome)", description: "Register passkey on Android" },
        { id: "passkey-login", name: "Passkey login", description: "Login using passkey" },
        { id: "passkey-cancel", name: "Passkey cancellation", description: "Cancel passkey authentication" },
        { id: "passkey-multiple", name: "Multiple passkeys", description: "Register passkeys on different devices" },
        { id: "passkey-biometric", name: "Biometric authentication", description: "Test Face ID/Touch ID/Fingerprint" },
      ],
    },
    {
      id: "event-creation",
      name: "3. Event Creation & Management",
      tests: [
        { id: "event-basic", name: "Create basic event", description: "First event with all required fields" },
        { id: "event-image-upload", name: "Upload event image", description: "Test image upload and display" },
        { id: "event-date-validation", name: "Past date validation", description: "Test creating event with past date" },
        { id: "event-ticket-types", name: "Multiple ticket types", description: "Add different ticket types with prices" },
        { id: "event-beta-checkout", name: "Create event with Beta Checkout", description: "Enable beta checkout option" },
        { id: "event-multistep", name: "Create event with Multi-Step Checkout", description: "Configure multi-step checkout" },
        { id: "event-singlepage", name: "Create event with Single Page Checkout", description: "Configure single page checkout" },
        { id: "event-edit", name: "Edit existing event", description: "Update event details" },
        { id: "event-duplicate", name: "Duplicate event", description: "Clone an event" },
        { id: "event-publish", name: "Publish/unpublish event", description: "Toggle event visibility" },
        { id: "event-delete", name: "Delete event", description: "Delete event with confirmation" },
        { id: "event-search", name: "Search/filter events", description: "Test event search and filtering" },
      ],
    },
    {
      id: "stripe",
      name: "4. Stripe Connect Integration",
      tests: [
        { id: "stripe-connect", name: "Connect Stripe account", description: "Complete Stripe OAuth flow" },
        { id: "stripe-oauth-cancel", name: "Stripe OAuth cancellation", description: "Cancel Stripe connection" },
        { id: "stripe-account-display", name: "Stripe account details", description: "View connected account info" },
        { id: "stripe-disconnect", name: "Disconnect Stripe account", description: "Remove Stripe connection" },
        { id: "stripe-reconnect", name: "Reconnect different account", description: "Switch Stripe accounts" },
        { id: "stripe-test-mode", name: "Stripe test mode toggle", description: "Switch between test/live mode" },
      ],
    },
    {
      id: "checkout-beta",
      name: "5. Beta Checkout Flow",
      tests: [
        { id: "beta-select-tickets", name: "Select tickets", description: "Choose ticket type and quantity" },
        { id: "beta-price-calc", name: "Price calculation", description: "Verify total price calculation" },
        { id: "beta-customer-info", name: "Enter customer info", description: "Fill customer details form" },
        { id: "beta-payment-card", name: "Payment with test card (4242)", description: "Use Stripe test card" },
        { id: "beta-payment-declined", name: "Declined card handling", description: "Test declined card (4000 0000 0000 0002)" },
        { id: "beta-promo-code", name: "Apply promo code", description: "Test discount code application" },
        { id: "beta-order-summary", name: "Order summary display", description: "Review order details" },
        { id: "beta-payment-success", name: "Payment success", description: "Complete payment successfully" },
        { id: "beta-confirmation-email", name: "Confirmation email", description: "Receive order confirmation email" },
        { id: "beta-ticket-qr", name: "Ticket QR code", description: "QR code in email" },
        { id: "beta-apple-wallet", name: "Apple Wallet pass", description: "Add to Apple Wallet" },
        { id: "beta-pdf-download", name: "PDF ticket download", description: "Download ticket as PDF" },
      ],
    },
    {
      id: "checkout-multistep",
      name: "6. Multi-Step Checkout Flow",
      tests: [
        { id: "multi-step1", name: "Step 1: Select tickets", description: "First step of multi-step checkout" },
        { id: "multi-progress", name: "Progress indicator", description: "Step progress display" },
        { id: "multi-step2", name: "Step 2: Customer details", description: "Enter customer information" },
        { id: "multi-validation", name: "Form validation", description: "Test field validation" },
        { id: "multi-back-btn", name: "Back button (data preserved)", description: "Navigate back without losing data" },
        { id: "multi-step3", name: "Step 3: Payment", description: "Payment information step" },
        { id: "multi-step4", name: "Step 4: Review order", description: "Order review step" },
        { id: "multi-confirm", name: "Confirm purchase", description: "Final confirmation" },
        { id: "multi-success", name: "Payment success", description: "Successful payment" },
        { id: "multi-confirmation", name: "Confirmation email", description: "Email received" },
      ],
    },
    {
      id: "checkout-single",
      name: "7. Single Page Checkout Flow",
      tests: [
        { id: "single-all-fields", name: "All fields visible", description: "All checkout fields on one page" },
        { id: "single-select-tickets", name: "Select tickets", description: "Ticket selection" },
        { id: "single-customer-info", name: "Customer details", description: "Fill customer form" },
        { id: "single-payment", name: "Payment information", description: "Enter payment details" },
        { id: "single-realtime-validation", name: "Real-time validation", description: "Live form validation" },
        { id: "single-order-summary", name: "Dynamic order summary", description: "Auto-updating totals" },
        { id: "single-purchase", name: "Complete purchase", description: "Submit payment" },
        { id: "single-mobile-responsive", name: "Mobile responsive layout", description: "Test on mobile device" },
      ],
    },
    {
      id: "payment-methods",
      name: "8. Payment Methods Testing",
      tests: [
        { id: "payment-visa", name: "Visa (4242 4242 4242 4242)", description: "Test Visa card" },
        { id: "payment-mastercard", name: "Mastercard (5555 5555 5555 4444)", description: "Test Mastercard" },
        { id: "payment-amex", name: "American Express (3782 822463 10005)", description: "Test Amex" },
        { id: "payment-discover", name: "Discover (6011 1111 1111 1117)", description: "Test Discover" },
        { id: "payment-declined", name: "Declined card (4000 0000 0000 0002)", description: "Test declined card" },
        { id: "payment-insufficient", name: "Insufficient funds error", description: "Test insufficient funds" },
        { id: "payment-expired", name: "Expired card error", description: "Test expired card" },
        { id: "payment-apple-pay", name: "Apple Pay", description: "Test Apple Pay (if available)" },
        { id: "payment-google-pay", name: "Google Pay", description: "Test Google Pay (if available)" },
      ],
    },
    {
      id: "apple-wallet",
      name: "9. Apple Wallet Pass",
      tests: [
        { id: "wallet-button-confirmation", name: "Add to Wallet button (confirmation)", description: "Button appears on confirmation page" },
        { id: "wallet-link-email", name: "Add to Wallet link (email)", description: "Link in confirmation email" },
        { id: "wallet-download", name: "Download .pkpass file", description: "File downloads successfully" },
        { id: "wallet-opens-ios", name: "Opens in Wallet app (iOS)", description: "Pass opens in Apple Wallet" },
        { id: "wallet-ticket-details", name: "Ticket details correct", description: "Event name, date, location" },
        { id: "wallet-qr-code", name: "QR code visible", description: "Scannable QR code on pass" },
        { id: "wallet-barcode-scan", name: "Barcode scans", description: "QR code scans successfully" },
        { id: "wallet-ios-mail", name: "iOS Mail app compatibility", description: "Test in iOS Mail" },
        { id: "wallet-gmail-mobile", name: "Gmail Mobile compatibility", description: "Test in Gmail app" },
        { id: "wallet-outlook-mobile", name: "Outlook Mobile compatibility", description: "Test in Outlook app" },
      ],
    },
    {
      id: "groups",
      name: "10. Groups Feature",
      tests: [
        { id: "group-create", name: "Create new group", description: "Create group with name and description" },
        { id: "group-permissions", name: "Set group permissions", description: "Configure group access" },
        { id: "group-allocate", name: "Allocate tickets to group", description: "Assign tickets to group" },
        { id: "group-allocation-rules", name: "Set allocation rules", description: "Configure restrictions" },
        { id: "group-insufficient-tickets", name: "Insufficient tickets error", description: "Test ticket limit" },
        { id: "group-public-link", name: "Group ticket public link", description: "Share group ticket URL" },
        { id: "group-purchase", name: "Purchase group ticket", description: "Buy ticket via group link" },
        { id: "group-pricing", name: "Group pricing applied", description: "Verify special pricing" },
        { id: "group-allocation-decrease", name: "Allocation count decreases", description: "Track remaining tickets" },
        { id: "group-no-tickets-error", name: "No tickets remaining error", description: "Test sold out" },
        { id: "group-add-members", name: "Add group members", description: "Add users to group" },
        { id: "group-remove-members", name: "Remove group members", description: "Remove users from group" },
        { id: "group-view-history", name: "View purchase history", description: "Group transaction history" },
        { id: "group-export", name: "Export group data", description: "Export group information" },
        { id: "group-delete", name: "Delete group", description: "Remove group with confirmation" },
      ],
    },
    {
      id: "analytics",
      name: "11. Analytics & Reporting",
      tests: [
        { id: "analytics-dashboard", name: "View analytics dashboard", description: "Access analytics page" },
        { id: "analytics-total-sales", name: "Total sales summary", description: "View sales totals" },
        { id: "analytics-by-event", name: "Sales by event", description: "Event-specific sales" },
        { id: "analytics-by-ticket", name: "Sales by ticket type", description: "Ticket type breakdown" },
        { id: "analytics-charts", name: "Sales charts/graphs", description: "Visual data display" },
        { id: "analytics-revenue", name: "Revenue breakdown", description: "Revenue analysis" },
        { id: "analytics-refunds", name: "Refunds/cancellations", description: "Track refunds" },
        { id: "analytics-conversion", name: "Conversion rates", description: "Purchase funnel" },
        { id: "analytics-date-filter", name: "Filter by date range", description: "Date range picker" },
        { id: "analytics-event-filter", name: "Filter by event", description: "Event filter" },
        { id: "report-sales-summary", name: "Generate sales summary report", description: "Sales report" },
        { id: "report-ticket-sales", name: "Generate ticket sales report", description: "Ticket report" },
        { id: "report-revenue", name: "Generate revenue report", description: "Revenue report" },
        { id: "report-customer", name: "Generate customer report", description: "Customer list" },
        { id: "report-group-sales", name: "Generate group sales report", description: "Group analytics" },
        { id: "export-csv", name: "Export to CSV", description: "CSV download" },
        { id: "export-pdf", name: "Export to PDF", description: "PDF download" },
        { id: "export-excel", name: "Export to Excel", description: "Excel download" },
        { id: "attendee-list", name: "Generate attendee list", description: "Event attendees" },
        { id: "attendee-search", name: "Search attendees", description: "Find specific attendee" },
        { id: "attendee-export", name: "Export attendee list", description: "Export attendees" },
      ],
    },
    {
      id: "cross-browser",
      name: "12. Cross-Browser & Device Testing",
      tests: [
        { id: "chrome-desktop", name: "Chrome Desktop - Full flow", description: "Test complete flow on Chrome" },
        { id: "safari-desktop", name: "Safari Desktop - Full flow", description: "Test complete flow on Safari" },
        { id: "firefox-desktop", name: "Firefox Desktop - Full flow", description: "Test complete flow on Firefox" },
        { id: "edge-desktop", name: "Edge Desktop - Full flow", description: "Test complete flow on Edge" },
        { id: "ios-safari", name: "iOS Safari - Full flow", description: "Test on iPhone" },
        { id: "android-chrome", name: "Android Chrome - Full flow", description: "Test on Android" },
        { id: "ipad", name: "iPad - Full flow", description: "Test on iPad" },
        { id: "mobile-responsive", name: "Mobile responsive layout", description: "Check mobile UI" },
        { id: "tablet-responsive", name: "Tablet responsive layout", description: "Check tablet UI" },
      ],
    },
  ];

  const updateTestResult = (testId: string, status: TestStatus) => {
    setTestResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        status,
        timestamp: new Date().toISOString(),
        tester: globalNotes.testerName || "Unknown",
      },
    }));
  };

  const updateTestNotes = (testId: string, notes: string) => {
    setTestResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        notes,
      },
    }));
  };

  const resetAllTests = () => {
    if (confirm("Are you sure you want to reset all test results?")) {
      setTestResults({});
    }
  };

  const calculateStats = () => {
    const allTests = testCategories.flatMap((cat) => cat.tests);
    const total = allTests.length;
    const passed = allTests.filter((test) => testResults[test.id]?.status === "pass").length;
    const failed = allTests.filter((test) => testResults[test.id]?.status === "fail").length;
    const skipped = allTests.filter((test) => testResults[test.id]?.status === "skip").length;
    const pending = total - passed - failed - skipped;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { total, passed, failed, skipped, pending, passRate };
  };

  const exportToCSV = () => {
    const allTests = testCategories.flatMap((cat) =>
      cat.tests.map((test) => ({
        category: cat.name,
        test: test.name,
        description: test.description || "",
        status: testResults[test.id]?.status || "pending",
        notes: testResults[test.id]?.notes || "",
        timestamp: testResults[test.id]?.timestamp || "",
        tester: testResults[test.id]?.tester || "",
      }))
    );

    const csvHeader = "Category,Test,Description,Status,Notes,Timestamp,Tester\n";
    const csvRows = allTests
      .map(
        (t) =>
          `"${t.category}","${t.test}","${t.description}","${t.status}","${t.notes}","${t.timestamp}","${t.tester}"`
      )
      .join("\n");

    const csv = csvHeader + csvRows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-test-results-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportToMarkdown = () => {
    const stats = calculateStats();
    let md = `# QA Testing Report\n\n`;
    md += `**Date:** ${new Date().toLocaleDateString()}\n`;
    md += `**Tester:** ${globalNotes.testerName || "N/A"}\n`;
    md += `**Environment:** ${globalNotes.environment || "N/A"}\n`;
    md += `**Build/Version:** ${globalNotes.buildVersion || "N/A"}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Total Tests:** ${stats.total}\n`;
    md += `- **Passed:** ${stats.passed}\n`;
    md += `- **Failed:** ${stats.failed}\n`;
    md += `- **Skipped:** ${stats.skipped}\n`;
    md += `- **Pending:** ${stats.pending}\n`;
    md += `- **Pass Rate:** ${stats.passRate}%\n\n`;

    testCategories.forEach((cat) => {
      md += `## ${cat.name}\n\n`;
      cat.tests.forEach((test) => {
        const result = testResults[test.id];
        const status = result?.status || "pending";
        const emoji = {
          pass: "✅",
          fail: "❌",
          skip: "⏭️",
          pending: "⏸️",
        }[status];
        md += `${emoji} **${test.name}**`;
        if (test.description) md += ` - ${test.description}`;
        md += `\n`;
        if (result?.status && result.status !== "pending") {
          md += `   - Status: ${status.toUpperCase()}\n`;
          if (result.notes) md += `   - Notes: ${result.notes}\n`;
          if (result.timestamp) md += `   - Tested: ${new Date(result.timestamp).toLocaleString()}\n`;
        }
        md += `\n`;
      });
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-test-report-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
  };

  const stats = calculateStats();

  const StatusButton = ({ testId, status }: { testId: string; status: TestStatus }) => {
    const current = testResults[testId]?.status;
    const isActive = current === status;
    const colors = {
      pass: isActive ? "bg-green-500 hover:bg-green-600" : "bg-green-100 hover:bg-green-200",
      fail: isActive ? "bg-red-500 hover:bg-red-600" : "bg-red-100 hover:bg-red-200",
      skip: isActive ? "bg-gray-500 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200",
    };
    const icons = {
      pass: <CheckCircle2 className="h-4 w-4" />,
      fail: <XCircle className="h-4 w-4" />,
      skip: <MinusCircle className="h-4 w-4" />,
    };
    const textColor = isActive ? "text-white" : "text-gray-700";

    return (
      <Button
        size="sm"
        variant="outline"
        className={`${colors[status]} ${textColor} border-0`}
        onClick={() => updateTestResult(testId, status)}
      >
        {icons[status]}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/master-admin")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <h1 className="text-3xl font-bold mb-2">QA Testing Dashboard</h1>
          <p className="text-gray-600">Interactive manual testing checklist and progress tracker</p>
        </div>

        {/* Global Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Session Info</CardTitle>
            <CardDescription>Enter testing session details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Tester Name</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Your name"
                  value={globalNotes.testerName}
                  onChange={(e) => setGlobalNotes({ ...globalNotes, testerName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Environment</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="e.g., Production, Staging"
                  value={globalNotes.environment}
                  onChange={(e) => setGlobalNotes({ ...globalNotes, environment: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Build/Version</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="e.g., v1.0.0"
                  value={globalNotes.buildVersion}
                  onChange={(e) => setGlobalNotes({ ...globalNotes, buildVersion: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm font-medium">{stats.passRate}% Pass Rate</span>
                </div>
                <Progress value={(stats.passed + stats.failed + stats.skipped) / stats.total * 100} className="h-2" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.skipped}</div>
                  <div className="text-sm text-gray-600">Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={exportToMarkdown} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Markdown Report
          </Button>
          <Button onClick={resetAllTests} variant="destructive">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All Tests
          </Button>
        </div>

        {/* Test Categories */}
        <Tabs defaultValue={testCategories[0].id} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max mb-4">
              {testCategories.map((cat) => {
                const catTests = cat.tests;
                const catPassed = catTests.filter((t) => testResults[t.id]?.status === "pass").length;
                const catTotal = catTests.length;
                return (
                  <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-2">
                    {cat.name.split(".")[0]}
                    <Badge variant="secondary" className="ml-1">
                      {catPassed}/{catTotal}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>

          {testCategories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{category.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {category.tests.map((test) => {
                      const result = testResults[test.id];
                      return (
                        <div
                          key={test.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium mb-1">{test.name}</h4>
                              {test.description && (
                                <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                              )}
                              {result?.timestamp && (
                                <p className="text-xs text-gray-500">
                                  Last tested: {new Date(result.timestamp).toLocaleString()} by{" "}
                                  {result.tester}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <StatusButton testId={test.id} status="pass" />
                              <StatusButton testId={test.id} status="fail" />
                              <StatusButton testId={test.id} status="skip" />
                            </div>
                          </div>
                          {result?.status && result.status !== "pending" && (
                            <div className="mt-3">
                              <Textarea
                                placeholder="Add notes (optional)..."
                                value={result?.notes || ""}
                                onChange={(e) => updateTestNotes(test.id, e.target.value)}
                                className="min-h-[60px]"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default QATestingDashboard;
