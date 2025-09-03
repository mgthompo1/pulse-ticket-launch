// @ts-nocheck
import { DatabaseService } from './database.ts';
import { QRService } from './qr-service.ts';
import { PdfGenerator } from './pdf-generator.ts';
import { TicketData } from './types.ts';
import { ValidationUtils, ErrorUtils, PerformanceUtils, MemoryUtils } from './utils.ts';
import { PDF_CONFIG, getEnvironmentConfig } from './config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced logging with context
const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
  console.log(`[PDF-GEN] ${timestamp} | ${step}${detailsStr}`);
};

class PdfGenerationService {
  private database: DatabaseService;
  private qrService: QRService;
  private pdfGenerator: PdfGenerator;
  private config = getEnvironmentConfig();

  constructor() {
    this.database = new DatabaseService();
    this.qrService = new QRService();
    this.pdfGenerator = new PdfGenerator();
  }

  async generateTicketPDF(orderId: string) {
    const operationTimer = 'pdf-generation-complete';
    PerformanceUtils.startTimer(operationTimer);
    
    let success = false;
    let ticketCount = 0;

    try {
      logStep("PDF generation started", { orderId });
      MemoryUtils.logMemoryUsage('Operation Start');

      // Validate input
      const validation = ValidationUtils.validateOrderId(orderId);
      if (!validation.isValid) {
        throw ErrorUtils.createError(validation.error!, 'VALIDATION_ERROR');
      }

      // Health check
      const isHealthy = await this.database.healthCheck();
      if (!isHealthy) {
        throw ErrorUtils.createError('Database health check failed', 'DATABASE_UNAVAILABLE');
      }

      // Get order and tickets data
      logStep("Fetching order and tickets data");
      const { order, tickets } = await this.database.getOrderWithTickets(validation.sanitizedValue!);
      ticketCount = tickets.length;

      logStep("Order data retrieved", {
        customerName: order.customer_name,
        eventName: order.events.name,
        ticketCount: tickets.length
      });

      // Convert ProcessedTicket[] to TicketData[]
      const ticketData: TicketData[] = tickets.map(ticket => ({
        ticket_code: ticket.ticket_code,
        ticket_type_name: ticket.ticket_type_name,
        customer_name: order.customer_name,
        event_name: order.events.name,
        event_date: order.events.event_date,
        venue: order.events.venue,
        price: ticket.unit_price,
        order_id: order.id,
        status: ticket.status,
      }));

      // Generate QR codes in parallel
      logStep("Generating QR codes", { ticketCount: ticketData.length });
      const qrCodes = await PerformanceUtils.withTimeout(
        this.qrService.generateQRCodesBatch(ticketData),
        this.config.TIMEOUTS.PDF_GENERATION / 2, // Use half the total timeout for QR generation
        'QR code generation timed out'
      );

      logStep("QR codes generated", { 
        successCount: qrCodes.size,
        expectedCount: ticketData.length 
      });

      // Generate PDF
      logStep("Generating PDF document");
      const pdfResult = await PerformanceUtils.withTimeout(
        this.pdfGenerator.generatePDF(order, ticketData, qrCodes),
        this.config.TIMEOUTS.PDF_GENERATION,
        'PDF generation timed out'
      );

      // Log successful generation
      await this.database.logPdfGeneration(order.id, true, {
        ticketCount: pdfResult.ticketCount,
        fileSize: pdfResult.pdf.length,
        generationTime: PerformanceUtils.endTimer(operationTimer),
      });

      success = true;
      logStep("PDF generation completed successfully", {
        filename: pdfResult.filename,
        ticketCount: pdfResult.ticketCount,
        fileSizeKB: Math.round(pdfResult.pdf.length / 1024)
      });

      MemoryUtils.logMemoryUsage('Operation Complete');

      return new Response(
        JSON.stringify({
          pdf: pdfResult.pdf,
          filename: pdfResult.filename,
          ticketCount: pdfResult.ticketCount,
          metadata: {
            orderId: order.id,
            eventName: order.events.name,
            customerName: order.customer_name,
            generatedAt: new Date().toISOString(),
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );

    } catch (error) {
      // Log failed generation
      await this.database.logPdfGeneration(orderId, false, {
        ticketCount,
        error: error instanceof Error ? error.message : String(error),
        errorCode: (error as any).code,
      }).catch(() => {}); // Don't fail on logging error

      const isTimeout = ErrorUtils.isTimeoutError(error);
      const errorCode = (error as any).code || (isTimeout ? 'TIMEOUT' : 'UNKNOWN_ERROR');
      
      ErrorUtils.logError('PDF generation failed', error, {
        orderId,
        ticketCount,
        isTimeout,
        errorCode,
      });

      const statusCode = this.getErrorStatusCode(errorCode);
      const errorMessage = this.getErrorMessage(error, errorCode);

      return new Response(
        JSON.stringify({
          error: errorMessage,
          code: errorCode,
          orderId,
          timestamp: new Date().toISOString(),
          ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: statusCode,
        }
      );
    } finally {
      PerformanceUtils.endTimer(operationTimer);
      MemoryUtils.logMemoryUsage('Operation End');
      
      // Force garbage collection if available (Deno specific)
      if (typeof Deno !== 'undefined' && Deno.run) {
        try {
          // Trigger GC to clean up PDF generation resources
          (globalThis as any).gc?.();
        } catch {
          // GC not available, continue
        }
      }
    }
  }

  private getErrorStatusCode(errorCode: string): number {
    switch (errorCode) {
      case 'VALIDATION_ERROR':
      case 'INVALID_ORDER_ID':
        return 400;
      case 'ORDER_NOT_FOUND':
      case 'NO_TICKETS_FOUND':
        return 404;
      case 'TIMEOUT':
        return 408;
      case 'TICKET_LIMIT_EXCEEDED':
      case 'RESOURCE_LIMIT_EXCEEDED':
        return 413;
      case 'DATABASE_UNAVAILABLE':
        return 503;
      default:
        return 500;
    }
  }

  private getErrorMessage(error: unknown, errorCode: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    switch (errorCode) {
      case 'TIMEOUT':
        return 'PDF generation timed out. Please try again with fewer tickets.';
      case 'VALIDATION_ERROR':
        return 'Invalid request parameters.';
      case 'ORDER_NOT_FOUND':
        return 'Order not found or access denied.';
      case 'NO_TICKETS_FOUND':
        return 'No tickets found for this order.';
      case 'DATABASE_UNAVAILABLE':
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return 'PDF generation failed. Please try again.';
    }
  }
}

// Main handler function
const handler = async (req: Request): Promise<Response> => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      return new Response(
        JSON.stringify({ 
          error: "Missing orderId parameter",
          code: "MISSING_PARAMETER" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const service = new PdfGenerationService();
    return await service.generateTicketPDF(orderId);

  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON in request body",
          code: "INVALID_JSON" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Handle unexpected errors
    ErrorUtils.logError('Unexpected handler error', error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        code: "HANDLER_ERROR",
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

// Export the handler
export default handler;

// Start the Deno server
Deno.serve(handler);
