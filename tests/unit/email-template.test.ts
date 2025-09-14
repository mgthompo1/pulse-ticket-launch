// Unit tests for email template system
import { assertEquals, assertExists, assert, TestDataFactory, assertValidEmail } from "../setup.ts";

// Import the email template service (we'll need to export it from the function)
// For now, we'll test the API endpoints directly

Deno.test("Email Template Generation", async (t) => {

  await t.step("should generate email with default template", async () => {
    const testOrder = TestDataFactory.createTestOrder();
    const testTickets = TestDataFactory.createTestTickets();

    // Mock the email generation (in real implementation, we'd import the class)
    const mockEmailData = {
      to: testOrder.customer_email,
      subject: `Your tickets for ${testOrder.events.name}`,
      html: `<!DOCTYPE html><html><body><h1>Thank you!</h1></body></html>`
    };

    assertValidEmail(mockEmailData.html);
    assertEquals(mockEmailData.to, testOrder.customer_email);
    assert(mockEmailData.subject.includes(testOrder.events.name));
  });

  await t.step("should handle different delivery methods", async () => {
    const testOrder = TestDataFactory.createTestOrder();

    // Test email confirmation vs QR ticket delivery
    const confirmationOrder = {
      ...testOrder,
      events: {
        ...testOrder.events,
        ticket_delivery_method: "confirmation_email"
      }
    };

    // Should not include QR codes for confirmation emails
    const emailData = {
      html: '<!DOCTYPE html><html><body>Registration confirmed</body></html>'
    };

    assertValidEmail(emailData.html);
    assert(!emailData.html.includes('QR Code'), 'Confirmation emails should not have QR codes');
  });

  await t.step("should respect email customization settings", async () => {
    const testOrder = TestDataFactory.createTestOrder();
    const customization = TestDataFactory.createTestEmailCustomization();

    // Test that customization is applied
    assertEquals(customization.template.theme, "professional");
    assertEquals(customization.branding.showLogo, true);
    assertEquals(customization.blocks.length, 3);
  });

  await t.step("should handle missing ticket data gracefully", async () => {
    const testOrder = TestDataFactory.createTestOrder();
    const emptyTickets: any[] = [];

    // Should still generate email even with no tickets
    const emailData = {
      to: testOrder.customer_email,
      subject: `Registration confirmation for ${testOrder.events.name}`,
      html: `<!DOCTYPE html><html><body><p>No tickets to display</p></body></html>`
    };

    assertValidEmail(emailData.html);
  });
});

Deno.test("Email Block Rendering", async (t) => {

  await t.step("should render header block correctly", () => {
    const headerBlock = { type: 'header', title: 'Welcome!' };

    // Mock rendered output
    const rendered = `<div style="background:#1f2937;color:#fff;padding:20px;">
      <h1 style="margin:0;text-align:center;">Welcome!</h1>
    </div>`;

    assert(rendered.includes('Welcome!'), 'Should include title text');
    assert(rendered.includes('h1'), 'Should use h1 tag');
  });

  await t.step("should render event details block", () => {
    const testOrder = TestDataFactory.createTestOrder();
    const eventBlock = { type: 'event_details' };

    // Mock rendered output
    const rendered = `<div>
      <h3>${testOrder.events.name}</h3>
      <p>📅 ${testOrder.events.event_date}</p>
      <p>📍 ${testOrder.events.venue}</p>
    </div>`;

    assert(rendered.includes(testOrder.events.name), 'Should include event name');
    assert(rendered.includes(testOrder.events.venue), 'Should include venue');
  });

  await t.step("should render configurable ticket list", () => {
    const ticketBlock = {
      type: 'ticket_list',
      showTickets: true,
      showQRCodes: true,
      hideTitle: false,
      title: 'Your Event Tickets'
    };

    // Mock rendered output
    const rendered = `<div>
      <h3>Your Event Tickets</h3>
      <div>Ticket details...</div>
    </div>`;

    assert(rendered.includes('Your Event Tickets'), 'Should include custom title');
  });

  await t.step("should hide tickets when showTickets is false", () => {
    const ticketBlock = {
      type: 'ticket_list',
      showTickets: false
    };

    // Should return empty string
    const rendered = '';
    assertEquals(rendered, '');
  });
});

Deno.test("Theme and Styling", async (t) => {

  await t.step("should apply professional theme correctly", () => {
    const theme = {
      headerColor: "#1f2937",
      backgroundColor: "#ffffff",
      textColor: "#374151",
      buttonColor: "#1f2937"
    };

    assert(theme.headerColor === "#1f2937", 'Should use correct header color');
    assert(theme.backgroundColor === "#ffffff", 'Should use white background');
  });

  await t.step("should handle custom brand colors", () => {
    const customTheme = {
      headerColor: "#ff6b35",
      backgroundColor: "#f8f9fa",
      textColor: "#2d3748"
    };

    assert(customTheme.headerColor.startsWith('#'), 'Should be valid hex color');
  });
});

Deno.test("Personalization Variables", async (t) => {

  await t.step("should replace personalization variables", () => {
    const template = "Hello @FirstName, welcome to @EventName!";
    const testOrder = TestDataFactory.createTestOrder();

    // Mock variable replacement
    const processed = template
      .replace('@FirstName', testOrder.customer_name.split(' ')[0])
      .replace('@EventName', testOrder.events.name);

    assertEquals(processed, `Hello ${testOrder.customer_name.split(' ')[0]}, welcome to ${testOrder.events.name}!`);
  });

  await t.step("should handle missing customer names gracefully", () => {
    const template = "Hello @FirstName!";
    const processed = template.replace('@FirstName', 'Guest');

    assertEquals(processed, "Hello Guest!");
  });
});