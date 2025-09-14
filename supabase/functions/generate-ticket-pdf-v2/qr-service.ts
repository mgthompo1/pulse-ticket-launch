import QRCode from "npm:qrcode@1.5.3";
import { TicketData } from './types.ts';
import { PDF_CONFIG } from './config.ts';
import { PerformanceUtils, ErrorUtils } from './utils.ts';

export class QRService {
  async generateQRCode(ticket: TicketData): Promise<string> {
    const timer = `qr-generation-${ticket.ticket_code}`;
    PerformanceUtils.startTimer(timer);

    try {
      const qrData = this.createQRData(ticket);
      
      const qrCodeUrl = await PerformanceUtils.withTimeout(
        QRCode.toDataURL(qrData, {
          width: PDF_CONFIG.QR_CODE.WIDTH,
          margin: PDF_CONFIG.QR_CODE.MARGIN,
          errorCorrectionLevel: PDF_CONFIG.QR_CODE.ERROR_CORRECTION,
          color: {
            dark: PDF_CONFIG.QR_CODE.COLOR.DARK,
            light: PDF_CONFIG.QR_CODE.COLOR.LIGHT,
          },
        }),
        PDF_CONFIG.TIMEOUTS.QR_GENERATION,
        'QR code generation timed out'
      );

      PerformanceUtils.endTimer(timer);
      return qrCodeUrl as string;
    } catch (error) {
      PerformanceUtils.endTimer(timer);
      ErrorUtils.logError('QR code generation failed', error, {
        ticketCode: ticket.ticket_code,
        orderId: ticket.order_id,
      });

      // Return fallback QR code instead of failing
      return this.getFallbackQRCode();
    }
  }

  async generateQRCodesBatch(tickets: TicketData[]): Promise<Map<string, string>> {
    const qrCodes = new Map<string, string>();
    
    // Process QR codes in parallel with concurrency limit
    const batchSize = 5; // Process 5 QR codes at a time
    
    for (let i = 0; i < tickets.length; i += batchSize) {
      const batch = tickets.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (ticket) => {
        const qrCode = await this.generateQRCode(ticket);
        return { ticketCode: ticket.ticket_code, qrCode };
      });

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          const ticket = batch[index];
          if (result.status === 'fulfilled') {
            qrCodes.set(ticket.ticket_code, result.value.qrCode);
          } else {
            ErrorUtils.logError('Batch QR generation failed', result.reason, {
              ticketCode: ticket.ticket_code,
            });
            qrCodes.set(ticket.ticket_code, this.getFallbackQRCode());
          }
        });
      } catch (error) {
        ErrorUtils.logError('QR batch processing failed', error);
        
        // Fallback: set fallback QR for all tickets in this batch
        batch.forEach(ticket => {
          qrCodes.set(ticket.ticket_code, this.getFallbackQRCode());
        });
      }
    }

    return qrCodes;
  }

  private createQRData(ticket: TicketData): string {
    // Create structured QR data that can be easily parsed by scanners
    const qrData = {
      version: '1.0',
      type: 'ticket',
      ticketId: ticket.ticket_code,
      ticketCode: ticket.ticket_code,
      eventName: ticket.event_name,
      customerName: ticket.customer_name,
      status: ticket.status,
      orderId: ticket.order_id,
      timestamp: new Date().toISOString(),
      // Add checksum for validation
      checksum: this.generateChecksum(ticket),
    };

    return JSON.stringify(qrData);
  }

  private generateChecksum(ticket: TicketData): string {
    // Simple checksum for ticket validation
    const data = `${ticket.ticket_code}${ticket.event_name}${ticket.customer_name}${ticket.status}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private getFallbackQRCode(): string {
    // Return a meaningful fallback QR code instead of a 1x1 pixel
    try {
      const fallbackData = JSON.stringify({
        type: 'error',
        message: 'QR code generation failed',
        instructions: 'Please show ticket code at entrance',
        timestamp: new Date().toISOString(),
      });

      // Generate a simple QR code synchronously with fallback data
      return QRCode.toDataURL(fallbackData, {
        width: 64,
        margin: 1,
        errorCorrectionLevel: 'L',
      }).then((url: any) => url as string).catch(() => PDF_CONFIG.QR_CODE.FALLBACK_DATA_URL);
    } catch {
      // Ultimate fallback
      return PDF_CONFIG.QR_CODE.FALLBACK_DATA_URL;
    }
  }

  // Validate QR code data (useful for testing)
  validateQRData(qrData: string): boolean {
    try {
      const parsed = JSON.parse(qrData);
      return !!(parsed.ticketCode && parsed.eventName && parsed.customerName && parsed.checksum);
    } catch {
      return false;
    }
  }

  // Extract ticket info from QR data (useful for scanning)
  extractTicketInfo(qrData: string): any {
    try {
      const parsed = JSON.parse(qrData);
      if (parsed.type === 'ticket') {
        return {
          ticketCode: parsed.ticketCode,
          eventName: parsed.eventName,
          customerName: parsed.customerName,
          status: parsed.status,
          checksum: parsed.checksum,
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}
