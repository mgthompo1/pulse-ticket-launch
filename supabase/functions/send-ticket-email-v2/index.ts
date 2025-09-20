// Refactored send-ticket-email Edge function with improved architecture
import { Resend } from "npm:resend@2.0.0";
import { CORS_HEADERS, CONFIG } from './config.ts';
import { DatabaseService } from './database.ts';
import { PaymentService } from './payment.ts';
import { TemplateService } from './templates.ts';
<<<<<<< HEAD
import { Order, EmailContent, PdfAttachment, Ticket } from './types.ts';
import { 
  logStep, 
  validateOrderId, 
  validateEmailAddress, 
  EmailServiceError, 
  handleError,
  withRetry 
} from './utils.ts';

// Main email service class
class EmailService {
  private database: DatabaseService;
  private payment: PaymentService;
  private templates: TemplateService;
  private resend: Resend;

  constructor() {
    this.database = new DatabaseService();
    this.payment = new PaymentService();
    this.templates = new TemplateService();
    
=======
import { logStep, validateOrderId, validateEmailAddress, EmailServiceError, handleError, withRetry } from './utils.ts';
// Main email service class
class EmailService {
  database;
  payment;
  templates;
  resend;
  constructor(){
    this.database = new DatabaseService();
    this.payment = new PaymentService();
    this.templates = new TemplateService();
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new EmailServiceError("RESEND_API_KEY environment variable is not set", 'CONFIG_ERROR');
    }
    this.resend = new Resend(resendApiKey);
  }
<<<<<<< HEAD

  // Main processing method
  async processOrderEmail(orderId: string): Promise<{ success: boolean; ticketsGenerated: number; emailSent: boolean }> {
    // Validate input
    const validOrderId = validateOrderId(orderId);
    logStep("Processing order", { orderId: validOrderId });

    // Get order details with all related data
    const order = await this.database.getOrderWithDetails(validOrderId);
    
=======
  // Main processing method
  async processOrderEmail(orderId) {
    // Validate input
    const validOrderId = validateOrderId(orderId);
    logStep("Processing order", {
      orderId: validOrderId
    });
    // Get order details with all related data
    const order = await this.database.getOrderWithDetails(validOrderId);
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
    // Validate email address
    if (!validateEmailAddress(order.customer_email)) {
      throw new EmailServiceError(`Invalid customer email: ${order.customer_email}`, 'INVALID_EMAIL');
    }
<<<<<<< HEAD

    // Get payment method information
    const credentials = await this.database.getPaymentCredentials(order.events.organizations.id);
    const paymentInfo = await this.payment.getPaymentMethodInfo(
      order.stripe_session_id || null,
      credentials?.stripe_secret_key || null
    );

    // Determine delivery method from event setting (not custom answers)
    // The event's ticket_delivery_method determines whether to generate actual tickets or send confirmation only
    const deliveryMethod = order.events.ticket_delivery_method || 'qr_ticket';
    logStep("Processing delivery method", { 
      deliveryMethod, 
      source: "event.ticket_delivery_method",
      eventId: order.events.id 
    });

    // Handle ticket generation
    const tickets = await this.handleTicketGeneration(order, deliveryMethod);

    // Get QR code URLs for tickets
    const orderItemIds = order.order_items
      .filter(item => item.item_type === 'ticket')
      .map(item => item.id);
    const qrUrls = await this.database.getTicketQrUrls(orderItemIds);

    // Generate email content
    const emailContent = this.templates.generateEmailContent(
      order,
      tickets,
      deliveryMethod,
      qrUrls,
      paymentInfo
    );

    // Generate PDF attachment if needed
    const pdfAttachment = await this.generatePdfAttachment(order, tickets, deliveryMethod);

    // Send email
    await this.sendEmail(order, emailContent, pdfAttachment);

    // Update order status
    await this.database.updateOrderStatus(validOrderId, "completed");

    // Send organizer notification if enabled
    await this.sendOrganizerNotificationIfEnabled(order, validOrderId);

=======
    // Get payment method information
    const credentials = await this.database.getPaymentCredentials(order.events.organizations.id);
    const paymentInfo = await this.payment.getPaymentMethodInfo(order.stripe_session_id || null, credentials?.stripe_secret_key || null);
    // Determine delivery method from event setting (not custom answers)
    // The event's ticket_delivery_method determines whether to generate actual tickets or send confirmation only
    const deliveryMethod = order.events.ticket_delivery_method || 'qr_ticket';
    logStep("Processing delivery method", {
      deliveryMethod,
      source: "event.ticket_delivery_method",
      eventId: order.events.id
    });
    // Handle ticket generation
    const tickets = await this.handleTicketGeneration(order, deliveryMethod);
    // Get QR code URLs for tickets
    const orderItemIds = order.order_items.filter((item)=>item.item_type === 'ticket').map((item)=>item.id);
    const qrUrls = await this.database.getTicketQrUrls(orderItemIds);
    // Generate email content
    const emailContent = this.templates.generateEmailContent(order, tickets, deliveryMethod, qrUrls, paymentInfo);
    // Generate PDF attachment if needed
    const pdfAttachment = await this.generatePdfAttachment(order, tickets, deliveryMethod);
    // Send email
    await this.sendEmail(order, emailContent, pdfAttachment);
    // Update order status
    await this.database.updateOrderStatus(validOrderId, "completed");
    // Send organizer notification if enabled
    await this.sendOrganizerNotificationIfEnabled(order, validOrderId);
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
    return {
      success: true,
      ticketsGenerated: tickets.length,
      emailSent: true
    };
  }
<<<<<<< HEAD

  // Handle ticket generation logic
  private async handleTicketGeneration(order: Order, deliveryMethod: string): Promise<Ticket[]> {
    if (deliveryMethod === 'confirmation_email' || deliveryMethod === 'email_confirmation_only' || deliveryMethod === 'email_confirmation') {
      logStep("Skipping ticket generation for confirmation email", { deliveryMethod });
      return [];
    }

    const ticketItems = order.order_items.filter(item => item.item_type === 'ticket');
    if (ticketItems.length === 0) return [];

    // Check for existing tickets first
    const existingTickets = await this.database.getExistingTickets(
      ticketItems.map(item => item.id)
    );

    if (existingTickets.length > 0) {
      // Use existing tickets
      const tickets = existingTickets.map(ticket => {
        const orderItem = ticketItems.find(item => item.id === ticket.order_item_id);
=======
  // Handle ticket generation logic
  async handleTicketGeneration(order, deliveryMethod) {
    if (deliveryMethod === 'confirmation_email' || deliveryMethod === 'email_confirmation_only' || deliveryMethod === 'email_confirmation') {
      logStep("Skipping ticket generation for confirmation email", {
        deliveryMethod
      });
      return [];
    }
    const ticketItems = order.order_items.filter((item)=>item.item_type === 'ticket');
    if (ticketItems.length === 0) return [];
    // Check for existing tickets first
    const existingTickets = await this.database.getExistingTickets(ticketItems.map((item)=>item.id));
    if (existingTickets.length > 0) {
      // Use existing tickets
      const tickets = existingTickets.map((ticket)=>{
        const orderItem = ticketItems.find((item)=>item.id === ticket.order_item_id);
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
        return {
          code: ticket.ticket_code,
          type: orderItem?.ticket_types?.name || 'General Admission',
          price: orderItem?.unit_price || 0
        };
      });
<<<<<<< HEAD
      
      logStep("Using existing tickets", { count: tickets.length });
      return tickets;
    }

    // Generate new tickets
    return await this.database.generateTickets(ticketItems);
  }

  // Generate PDF attachment
  private async generatePdfAttachment(
    order: Order, 
    tickets: Ticket[], 
    deliveryMethod: string
  ): Promise<PdfAttachment | null> {
    if (deliveryMethod !== 'qr_ticket' || tickets.length === 0) {
      return null;
    }

    try {
      logStep("Generating PDF attachment");
      
      // Add timeout to PDF generation
      const pdfPromise = this.generatePdf(order, tickets);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF generation timeout')), CONFIG.PDF_CONFIG.timeout)
      );

      const pdfResponse = await Promise.race([pdfPromise, timeoutPromise]) as any;

      if (pdfResponse?.content) {
        const pdfAttachment: PdfAttachment = {
=======
      logStep("Using existing tickets", {
        count: tickets.length
      });
      return tickets;
    }
    // Generate new tickets
    return await this.database.generateTickets(ticketItems);
  }
  // Generate PDF attachment
  async generatePdfAttachment(order, tickets, deliveryMethod) {
    if (deliveryMethod !== 'qr_ticket' || tickets.length === 0) {
      return null;
    }
    try {
      logStep("Generating PDF attachment");
      // Add timeout to PDF generation
      const pdfPromise = this.generatePdf(order, tickets);
      const timeoutPromise = new Promise((_, reject)=>setTimeout(()=>reject(new Error('PDF generation timeout')), CONFIG.PDF_CONFIG.timeout));
      const pdfResponse = await Promise.race([
        pdfPromise,
        timeoutPromise
      ]);
      if (pdfResponse?.content) {
        const pdfAttachment = {
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
          filename: `tickets-${order.id}.pdf`,
          content: pdfResponse.content,
          content_type: 'application/pdf'
        };
<<<<<<< HEAD
        
        logStep("PDF generated successfully", { filename: pdfAttachment.filename });
        return pdfAttachment;
      }

      logStep("PDF generation returned no data");
      return null;
    } catch (error) {
      logStep("PDF generation failed", { 
        error: error instanceof Error ? error.message : String(error)
      });
      
=======
        logStep("PDF generated successfully", {
          filename: pdfAttachment.filename
        });
        return pdfAttachment;
      }
      logStep("PDF generation returned no data");
      return null;
    } catch (error) {
      logStep("PDF generation failed", {
        error: error instanceof Error ? error.message : String(error)
      });
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
      // Continue with email sending even if PDF fails
      return null;
    }
  }
<<<<<<< HEAD

  // PDF generation logic (placeholder - implement based on your PDF service)
  private async generatePdf(order: Order, tickets: Ticket[]): Promise<any> {
=======
  // PDF generation logic (placeholder - implement based on your PDF service)
  async generatePdf(order, tickets) {
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
    // This would call your PDF generation service
    // For now, return null to indicate PDF generation is not implemented
    return null;
  }
<<<<<<< HEAD

  // Send email with proper error handling
  private async sendEmail(
    order: Order,
    emailContent: EmailContent,
    pdfAttachment: PdfAttachment | null
  ): Promise<void> {
    logStep("Sending email", { 
=======
  // Send email with proper error handling
  async sendEmail(order, emailContent, pdfAttachment) {
    logStep("Sending email", {
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
      recipient: emailContent.to,
      subject: emailContent.subject,
      hasPdfAttachment: !!pdfAttachment
    });
<<<<<<< HEAD

    const emailOptions: any = {
      from: `${order.events.name} <${CONFIG.FROM_EMAIL}>`,
      to: [emailContent.to],
      subject: emailContent.subject,
      html: emailContent.html,
    };

    // Add PDF attachment if available
    if (pdfAttachment) {
      emailOptions.attachments = [{
        filename: pdfAttachment.filename,
        content: pdfAttachment.content,
        contentType: pdfAttachment.content_type,
        contentDisposition: 'attachment'
      }];
    }

    const emailResponse = await withRetry(
      () => this.resend.emails.send(emailOptions),
      CONFIG.PDF_CONFIG.maxRetries
    );

    logStep("Email response received", { 
      hasError: !!emailResponse.error,
      hasData: !!emailResponse.data
    });

    if (emailResponse.error) {
      throw new EmailServiceError(
        `Email failed: ${JSON.stringify(emailResponse.error)}`,
        'EMAIL_SEND_FAILED'
      );
    }

    if (!emailResponse.data) {
      throw new EmailServiceError(
        'Email failed: No data returned from Resend API',
        'EMAIL_NO_DATA'
      );
    }

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });
  }

  // Send organizer notification if enabled
  private async sendOrganizerNotificationIfEnabled(order: Order, orderId: string): Promise<void> {
    try {
      const emailCustomization = order.events.email_customization;
      const notificationsEnabled = emailCustomization?.notifications?.organiserNotifications;
      
=======
    const emailOptions = {
      from: `${order.events.name} <${CONFIG.FROM_EMAIL}>`,
      to: [
        emailContent.to
      ],
      subject: emailContent.subject,
      html: emailContent.html
    };
    // Add PDF attachment if available
    if (pdfAttachment) {
      emailOptions.attachments = [
        {
          filename: pdfAttachment.filename,
          content: pdfAttachment.content,
          contentType: pdfAttachment.content_type,
          contentDisposition: 'attachment'
        }
      ];
    }
    const emailResponse = await withRetry(()=>this.resend.emails.send(emailOptions), CONFIG.PDF_CONFIG.maxRetries);
    logStep("Email response received", {
      hasError: !!emailResponse.error,
      hasData: !!emailResponse.data
    });
    if (emailResponse.error) {
      throw new EmailServiceError(`Email failed: ${JSON.stringify(emailResponse.error)}`, 'EMAIL_SEND_FAILED');
    }
    if (!emailResponse.data) {
      throw new EmailServiceError('Email failed: No data returned from Resend API', 'EMAIL_NO_DATA');
    }
    logStep("Email sent successfully", {
      emailId: emailResponse.data?.id
    });
  }
  // Send organizer notification if enabled
  async sendOrganizerNotificationIfEnabled(order, orderId) {
    try {
      const emailCustomization = order.events.email_customization;
      const notificationsEnabled = emailCustomization?.notifications?.organiserNotifications;
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
      if (notificationsEnabled) {
        logStep("Sending organizer notification");
        await this.database.sendOrganizerNotification(orderId);
      }
    } catch (error) {
      // Don't fail the main function if notification fails
<<<<<<< HEAD
      logStep("Failed to send organizer notification", { 
=======
      logStep("Failed to send organizer notification", {
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
<<<<<<< HEAD

// Main Deno serve handler
Deno.serve(async (req) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    logStep("Function started");

=======
// Main Deno serve handler
Deno.serve(async (req)=>{
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS
    });
  }
  try {
    logStep("Function started");
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      throw new EmailServiceError("Invalid JSON in request body", 'INVALID_REQUEST');
    }
<<<<<<< HEAD

    // Extract and validate order ID
    const { orderId } = requestBody;
    
    // Process the email
    const emailService = new EmailService();
    const result = await emailService.processOrderEmail(orderId);

    // Return success response
    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Handle all errors consistently
    const emailError = handleError(error, 'main handler');
    
    // Determine appropriate HTTP status code
    const statusCode = emailError.code === 'INVALID_REQUEST' ? 400 :
                      emailError.code === 'ORDER_NOT_FOUND' ? 404 :
                      emailError.code === 'CONFIG_ERROR' ? 500 : 500;

    return new Response(
      JSON.stringify({ 
        error: emailError.message,
        code: emailError.code
      }), 
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
=======
    // Extract and validate order ID
    const { orderId } = requestBody;
    // Process the email
    const emailService = new EmailService();
    const result = await emailService.processOrderEmail(orderId);
    // Return success response
    return new Response(JSON.stringify(result), {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    // Handle all errors consistently
    const emailError = handleError(error, 'main handler');
    // Determine appropriate HTTP status code
    const statusCode = emailError.code === 'INVALID_REQUEST' ? 400 : emailError.code === 'ORDER_NOT_FOUND' ? 404 : emailError.code === 'CONFIG_ERROR' ? 500 : 500;
    return new Response(JSON.stringify({
      error: emailError.message,
      code: emailError.code
    }), {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json"
      },
      status: statusCode
    });
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
  }
});
