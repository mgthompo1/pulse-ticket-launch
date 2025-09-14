import { jsPDF } from "npm:jspdf@2.5.1";
import { TicketData, OrderData, ImageData, PdfGenerationResult } from './types.ts';
import { PDF_CONFIG } from './config.ts';
import { SecurityUtils, DateUtils, PerformanceUtils, ErrorUtils, MemoryUtils } from './utils.ts';

export class PdfGenerator {
  private config = PDF_CONFIG;

  async generatePDF(
    order: OrderData,
    tickets: TicketData[],
    qrCodes: Map<string, string>
  ): Promise<PdfGenerationResult> {
    const timer = 'pdf-generation-total';
    PerformanceUtils.startTimer(timer);
    MemoryUtils.logMemoryUsage('PDF Generation Start');

    let pdf: jsPDF | null = null;
    let logoImageData: ImageData | null = null;

    try {
      // Pre-load logo if available
      logoImageData = await this.preloadLogo(order);
      
      // Create PDF document
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true, // Enable compression
      });

      // Generate pages for each ticket
      for (let i = 0; i < tickets.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const ticket = tickets[i];
        const qrCode = qrCodes.get(ticket.ticket_code);

        if (!qrCode) {
          console.warn(`No QR code found for ticket: ${ticket.ticket_code}`);
        }

        await this.createTicketPage(pdf, ticket, order, logoImageData, qrCode);
        
        // Log progress for large PDFs
        if (tickets.length > 10 && (i + 1) % 10 === 0) {
          console.log(`Generated ${i + 1}/${tickets.length} ticket pages`);
          MemoryUtils.logMemoryUsage(`After ${i + 1} pages`);
        }
      }

      // Generate PDF as base64
      const pdfArrayBuffer = pdf.output('arraybuffer');
      const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

      const result: PdfGenerationResult = {
        pdf: pdfBase64,
        filename: `tickets-${order.id}.pdf`,
        ticketCount: tickets.length,
      };

      PerformanceUtils.endTimer(timer);
      MemoryUtils.logMemoryUsage('PDF Generation Complete');

      return result;
    } catch (error) {
      ErrorUtils.logError('PDF generation failed', error, {
        orderId: order.id,
        ticketCount: tickets.length,
      });
      throw ErrorUtils.createError(
        this.config.ERROR_MESSAGES.PDF_GENERATION_FAILED,
        'PDF_GENERATION_ERROR',
        { orderId: order.id, originalError: error }
      );
    } finally {
      // Cleanup resources
      MemoryUtils.cleanup(pdf, logoImageData);
      PerformanceUtils.endTimer(timer);
    }
  }

  private async preloadLogo(order: OrderData): Promise<ImageData | null> {
    const logoUrl = this.getLogoUrl(order);
    if (!logoUrl) return null;

    try {
      return await SecurityUtils.fetchImageWithSecurity(logoUrl);
    } catch (error) {
      ErrorUtils.logError('Logo preload failed', error, { logoUrl });
      return null;
    }
  }

  private getLogoUrl(order: OrderData): string | null {
    // Priority: Event logo -> Organization logo
    return order.events.logo_url || order.events.organizations.logo_url || null;
  }

  private async createTicketPage(
    pdf: jsPDF,
    ticket: TicketData,
    order: OrderData,
    logoImageData: ImageData | null,
    qrCode?: string
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Clear page with background
    this.drawBackground(pdf, pageWidth, pageHeight);
    
    // Draw main ticket container
    const ticketBounds = this.drawTicketContainer(pdf, pageWidth, pageHeight);
    
    // Draw header section
    let currentY = await this.drawHeader(pdf, order, logoImageData, ticketBounds);
    
    // Draw event details
    currentY = this.drawEventDetails(pdf, ticket, order, ticketBounds, currentY);
    
    // Draw QR code section
    currentY = await this.drawQRSection(pdf, ticket, qrCode, ticketBounds, currentY);
    
    // Draw footer
    this.drawFooter(pdf, ticket, ticketBounds);
  }

  private drawBackground(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
    // Subtle gradient background
    const bgColor = this.config.COLORS.BACKGROUND as [number, number, number];
    pdf.setFillColor(...bgColor);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  private drawTicketContainer(pdf: jsPDF, pageWidth: number, pageHeight: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const margin = this.config.LAYOUT.PAGE.MARGIN;
    const ticketWidth = pageWidth - (margin * 2);
    const ticketHeight = pageHeight - (margin * 2);
    const ticketX = margin;
    const ticketY = margin;

    // Main ticket background
    const whiteColor = this.config.COLORS.WHITE as [number, number, number];
    pdf.setFillColor(...whiteColor);
    pdf.roundedRect(ticketX, ticketY, ticketWidth, ticketHeight,
      this.config.LAYOUT.TICKET.BORDER_RADIUS,
      this.config.LAYOUT.TICKET.BORDER_RADIUS, 'F');

    // Elegant border
    const borderColor = this.config.COLORS.BORDER as [number, number, number];
    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(2);
    pdf.roundedRect(ticketX, ticketY, ticketWidth, ticketHeight,
      this.config.LAYOUT.TICKET.BORDER_RADIUS,
      this.config.LAYOUT.TICKET.BORDER_RADIUS, 'S');

    return { x: ticketX, y: ticketY, width: ticketWidth, height: ticketHeight };
  }

  private async drawHeader(
    pdf: jsPDF,
    order: OrderData,
    logoImageData: ImageData | null,
    bounds: { x: number; y: number; width: number; height: number }
  ): Promise<number> {
    const headerHeight = this.config.LAYOUT.TICKET.HEADER_HEIGHT;
    const padding = this.config.LAYOUT.TICKET.CONTENT_PADDING;
    
    // Header background
    const secondaryColor = this.config.COLORS.SECONDARY as [number, number, number];
    pdf.setFillColor(...secondaryColor);
    pdf.roundedRect(bounds.x, bounds.y, bounds.width, headerHeight,
      this.config.LAYOUT.TICKET.BORDER_RADIUS,
      this.config.LAYOUT.TICKET.BORDER_RADIUS, 'F');

    // Extend header down to eliminate rounded corners at bottom
    pdf.setFillColor(...secondaryColor);
    pdf.rect(bounds.x, bounds.y + 40, bounds.width, 20, 'F');

    let currentY = bounds.y + 20;
    const contentX = bounds.x + padding;
    const contentWidth = bounds.width - (padding * 2);

    // Logo in header
    if (logoImageData) {
      try {
        const logoHeight = this.config.LAYOUT.LOGO.MAX_HEIGHT;
        const logoWidth = this.config.LAYOUT.LOGO.MAX_WIDTH;
        pdf.addImage(logoImageData.dataUrl, logoImageData.format, 
          contentX, currentY, logoWidth, logoHeight);
      } catch (logoError) {
        ErrorUtils.logError('Logo rendering failed', logoError);
      }
    }

    // Event name in header (white text)
    pdf.setFont(this.config.FONTS.PRIMARY, this.config.FONTS.WEIGHTS.BOLD);
    pdf.setFontSize(this.config.FONTS.SIZES.TITLE);
    const whiteColor = this.config.COLORS.WHITE as [number, number, number];
    pdf.setTextColor(...whiteColor);
    
    const eventNameLines = pdf.splitTextToSize(order.events.name, contentWidth * 0.6);
    pdf.text(eventNameLines, contentX + contentWidth - 20, currentY + 15, { align: 'right' });

    return bounds.y + headerHeight + 30;
  }

  private drawEventDetails(
    pdf: jsPDF,
    ticket: TicketData,
    order: OrderData,
    bounds: { x: number; y: number; width: number; height: number },
    startY: number
  ): number {
    const padding = this.config.LAYOUT.TICKET.CONTENT_PADDING;
    const contentX = bounds.x + padding;
    const columnWidth = (bounds.width - (padding * 2)) * 0.35;
    
    let currentY = startY;

    // Date section
    currentY = this.drawInfoSection(pdf, {
      x: contentX,
      y: currentY,
      width: columnWidth,
      icon: '📅',
      title: 'DATE & TIME',
      primaryText: DateUtils.formatDate(order.events.event_date),
      secondaryText: DateUtils.formatTime(order.events.event_date),
      backgroundColor: [...(this.config.COLORS.PRIMARY as [number, number, number]), 0.1],
    });

    // Venue section
    if (order.events.venue) {
      currentY = this.drawInfoSection(pdf, {
        x: contentX,
        y: currentY,
        width: columnWidth,
        icon: '📍',
        title: 'VENUE',
        primaryText: order.events.venue,
        backgroundColor: [...(this.config.COLORS.SUCCESS as [number, number, number]), 0.1],
      });
    }

    // Attendee section
    currentY = this.drawInfoSection(pdf, {
      x: contentX,
      y: currentY,
      width: columnWidth,
      icon: '👤',
      title: 'ATTENDEE',
      primaryText: ticket.customer_name,
      secondaryText: `🎫 ${ticket.ticket_type_name}`,
      backgroundColor: [...(this.config.COLORS.WARNING as [number, number, number]), 0.1],
    });

    return currentY;
  }

  private drawInfoSection(pdf: jsPDF, options: {
    x: number;
    y: number;
    width: number;
    icon: string;
    title: string;
    primaryText: string;
    secondaryText?: string;
    backgroundColor: number[];
  }): number {
    const sectionHeight = 45;
    
    // Background
    if (options.backgroundColor.length >= 3) {
      pdf.setFillColor(...options.backgroundColor.slice(0, 3));
      pdf.roundedRect(options.x - 10, options.y - 5, options.width + 20, sectionHeight, 8, 8, 'F');
    }

    // Title
    pdf.setFont(this.config.FONTS.PRIMARY, this.config.FONTS.WEIGHTS.NORMAL);
    pdf.setFontSize(this.config.FONTS.SIZES.SMALL);
    const mutedColor = this.config.COLORS.MUTED as [number, number, number];
    pdf.setTextColor(...mutedColor);
    pdf.text(`${options.icon} ${options.title}`, options.x, options.y + 5);

    // Primary text
    pdf.setFont(this.config.FONTS.PRIMARY, this.config.FONTS.WEIGHTS.BOLD);
    pdf.setFontSize(this.config.FONTS.SIZES.HEADING);
    const secondaryColor = this.config.COLORS.SECONDARY as [number, number, number];
    pdf.setTextColor(...secondaryColor);
    const primaryLines = pdf.splitTextToSize(options.primaryText, options.width);
    pdf.text(primaryLines, options.x, options.y + 18);

    // Secondary text
    if (options.secondaryText) {
      pdf.setFont(this.config.FONTS.PRIMARY, this.config.FONTS.WEIGHTS.NORMAL);
      pdf.setFontSize(this.config.FONTS.SIZES.BODY);
      pdf.setTextColor(...mutedColor);
      pdf.text(options.secondaryText, options.x, options.y + 30);
    }

    return options.y + sectionHeight + 15;
  }

  private async drawQRSection(
    pdf: jsPDF,
    ticket: TicketData,
    qrCode: string | undefined,
    bounds: { x: number; y: number; width: number; height: number },
    startY: number
  ): Promise<number> {
    const padding = this.config.LAYOUT.TICKET.CONTENT_PADDING;
    const rightColumnX = bounds.x + (bounds.width * 0.6);
    const qrSectionWidth = (bounds.width - (padding * 2)) * 0.35 + 40;
    
    let currentY = startY;

    // QR section background
    const bgColor = this.config.COLORS.BACKGROUND as [number, number, number];
    pdf.setFillColor(...bgColor);
    pdf.roundedRect(rightColumnX - 20, currentY - 10, qrSectionWidth, 140, 12, 12, 'F');

    // QR section border
    const borderColor = this.config.COLORS.BORDER as [number, number, number];
    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(2);
    pdf.roundedRect(rightColumnX - 20, currentY - 10, qrSectionWidth, 140, 12, 12, 'S');

    // QR section header
    pdf.setFont(this.config.FONTS.PRIMARY, this.config.FONTS.WEIGHTS.BOLD);
    pdf.setFontSize(this.config.FONTS.SIZES.HEADING);
    const secondaryColor = this.config.COLORS.SECONDARY as [number, number, number];
    pdf.setTextColor(...secondaryColor);
    pdf.text("Your Ticket", rightColumnX + (qrSectionWidth/2) - 20, currentY + 5, { align: 'center' });
    currentY += 25;

    // QR code
    if (qrCode && qrCode.length > 50) {
      try {
        const qrSize = this.config.LAYOUT.QR_CODE.SIZE;
        const qrX = rightColumnX + (qrSectionWidth/2) - 20 - (qrSize/2);

        // QR background
        const whiteColor = this.config.COLORS.WHITE as [number, number, number];
        pdf.setFillColor(...whiteColor);
        pdf.roundedRect(qrX - 5, currentY - 5, qrSize + 10, qrSize + 10, 8, 8, 'F');

        // QR border
        const qrBorderColor = this.config.COLORS.BORDER as [number, number, number];
        pdf.setDrawColor(...qrBorderColor);
        pdf.setLineWidth(this.config.LAYOUT.QR_CODE.BORDER_WIDTH);
        pdf.roundedRect(qrX - 5, currentY - 5, qrSize + 10, qrSize + 10, 8, 8, 'S');

        pdf.addImage(qrCode, 'PNG', qrX, currentY, qrSize, qrSize);
        currentY += qrSize + 15;
      } catch (qrError) {
        ErrorUtils.logError('QR code rendering failed', qrError);
        currentY += 30;
      }
    } else {
      currentY += 30;
    }

    // Ticket code
    pdf.setFont(this.config.FONTS.PRIMARY, this.config.FONTS.WEIGHTS.BOLD);
    pdf.setFontSize(this.config.FONTS.SIZES.SMALL);
    const mutedColor = this.config.COLORS.MUTED as [number, number, number];
    pdf.setTextColor(...mutedColor);
    pdf.text("TICKET CODE", rightColumnX + (qrSectionWidth/2) - 20, currentY, { align: 'center' });

    pdf.setFont(this.config.FONTS.MONOSPACE, this.config.FONTS.WEIGHTS.BOLD);
    pdf.setFontSize(this.config.FONTS.SIZES.BODY);
    pdf.setTextColor(...secondaryColor);
    pdf.text(ticket.ticket_code, rightColumnX + (qrSectionWidth/2) - 20, currentY + 12, { align: 'center' });
    currentY += 25;

    // Status badge
    const successColor = [...(this.config.COLORS.SUCCESS as [number, number, number]), 0.2] as const;
    pdf.setFillColor(...successColor);
    pdf.roundedRect(rightColumnX - 5, currentY - 3, qrSectionWidth - 30, 15, 6, 6, 'F');

    pdf.setFont(this.config.FONTS.PRIMARY, this.config.FONTS.WEIGHTS.BOLD);
    pdf.setFontSize(this.config.FONTS.SIZES.SMALL);
    const statusTextColor = this.config.COLORS.SUCCESS as [number, number, number];
    pdf.setTextColor(...statusTextColor);
    const statusText = `✓ ${ticket.status.toUpperCase()}`;
    pdf.text(statusText, rightColumnX + (qrSectionWidth/2) - 20, currentY + 5, { align: 'center' });

    return currentY + 20;
  }

  private drawFooter(
    pdf: jsPDF,
    ticket: TicketData,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const padding = this.config.LAYOUT.TICKET.CONTENT_PADDING;
    const footerY = bounds.y + bounds.height - 40;
    const contentX = bounds.x + padding;
    const contentWidth = bounds.width - (padding * 2);

    // Footer separator
    const footerBorderColor = this.config.COLORS.BORDER as [number, number, number];
    pdf.setDrawColor(...footerBorderColor);
    pdf.setLineWidth(1);
    pdf.line(contentX, footerY - 20, contentX + contentWidth, footerY - 20);

    // Footer text
    pdf.setFont(this.config.FONTS.PRIMARY, this.config.FONTS.WEIGHTS.NORMAL);
    pdf.setFontSize(this.config.FONTS.SIZES.SMALL);
    const footerMutedColor = this.config.COLORS.MUTED as [number, number, number];
    pdf.setTextColor(...footerMutedColor);
    pdf.text(
      "Please present this ticket at the event entrance",
      contentX + contentWidth / 2,
      footerY - 5,
      { align: 'center' }
    );

    // Price information (if available)
    if (ticket.price > 0) {
      pdf.setFont(this.config.FONTS.PRIMARY, this.config.FONTS.WEIGHTS.BOLD);
      pdf.setFontSize(this.config.FONTS.SIZES.BODY);
      const priceSecondaryColor = this.config.COLORS.SECONDARY as [number, number, number];
      pdf.setTextColor(...priceSecondaryColor);
      pdf.text(
        `$${ticket.price.toFixed(2)}`,
        contentX + contentWidth - 20,
        footerY - 5,
        { align: 'right' }
      );
    }
  }
}
