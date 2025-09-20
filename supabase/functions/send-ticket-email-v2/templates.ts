// Email template generation service - FIXED VERSION
import { CONFIG } from './config.ts';
import { sanitizeHtml, validateAndSanitizeUrl } from './utils.ts';
import { Order, Ticket, Theme, QrUrls, EmailBlock, EmailCustomization, PaymentInfo } from './types.ts';
export class TemplateService {
  // Get theme-based styles with color presets
  getThemeStyles(theme: string, template: any): Theme {
    // Get theme preset or use template colors if custom
    const themeColors = (CONFIG.THEME_PRESETS as any)[theme] || {
      headerColor: template?.headerColor || "#1f2937",
      backgroundColor: template?.backgroundColor || "#ffffff",
      textColor: template?.textColor || "#374151",
      buttonColor: template?.buttonColor || "#1f2937",
      accentColor: template?.accentColor || "#f9fafb",
      borderColor: template?.borderColor || "#d1d5db",
      fontFamily: template?.fontFamily || "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    };
    const baseStyles = {
      ...themeColors,
      fontFamily: themeColors.fontFamily || "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    };
    // Apply theme-specific styling
    switch(theme){
      case 'modern':
        return {
          ...baseStyles,
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        };
      case 'elegant':
        return {
          ...baseStyles,
          borderRadius: '8px',
          border: `2px solid ${baseStyles.borderColor}`
        };
      case 'minimal':
        return {
          ...baseStyles,
          borderRadius: '4px',
          border: `1px solid ${baseStyles.borderColor}`
        };
      case 'creative':
        return {
          ...baseStyles,
          borderRadius: '16px',
          background: `linear-gradient(135deg, ${baseStyles.backgroundColor}, ${baseStyles.accentColor}15)`
        };
      case 'professional':
      default:
        return {
          ...baseStyles,
          borderRadius: '8px',
          border: `1px solid ${baseStyles.borderColor}`
        };
    }
  }
  // Generate email content based on order and customization
  generateEmailContent(order: Order, tickets: Ticket[], deliveryMethod: string, qrUrls: QrUrls, paymentInfo: PaymentInfo): string {
    const emailCustomization = order.events.email_customization;
    // Use saved blocks when present; otherwise fall back to defaults
    const blocks = Array.isArray(emailCustomization?.blocks) && emailCustomization.blocks.length > 0 ? emailCustomization.blocks : CONFIG.DEFAULT_EMAIL_BLOCKS;
    console.log('[TEMPLATE] Using blocks:', {
      hasCustomBlocks: Array.isArray(emailCustomization?.blocks) && emailCustomization.blocks.length > 0,
      blockCount: blocks.length,
      blockTypes: blocks.map((b: any) => b.type),
      hasButtonBlock: blocks.some((b: any) => b.type === 'button')
    });
    const html = this.renderBlocks(blocks, order, tickets, deliveryMethod, qrUrls, emailCustomization, paymentInfo);
    // Generate subject line
    const subject = deliveryMethod === 'confirmation_email' ? `Registration confirmation for ${order.events.name}` : `Your tickets for ${order.events.name}`;
    return {
      to: order.customer_email,
      subject,
      html
    };
  }
  // Render email blocks into HTML
  renderBlocks(blocks: EmailBlock[], order: Order, tickets: Ticket[], deliveryMethod: string, qrUrls: QrUrls, emailCustomization: EmailCustomization, paymentInfo: PaymentInfo): string {
    const theme = this.getThemeStyles(emailCustomization?.template?.theme || 'professional', emailCustomization?.template);
    const branding = {
      showLogo: true,
      logoPosition: 'header',
      logoSize: 'medium',
      logoSource: 'event',
      ...emailCustomization?.branding
    };
    const logoUrl = this.getLogoUrl(order, branding);
    const logoSize = (CONFIG.LOGO_SIZES as any)[branding.logoSize] || CONFIG.LOGO_SIZES.medium;
    const parts = [];
    // Add comprehensive HTML structure to match frontend
    parts.push(`<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

        /* Reset styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

        /* Responsive styles */
        @media screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          .email-content {
            padding: 15px !important;
          }
          .mobile-padding {
            padding: 15px !important;
          }
          .mobile-font-size {
            font-size: 14px !important;
          }
          .mobile-button {
            padding: 10px 18px !important;
            font-size: 14px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
      <div class="email-container" style="font-family:'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;max-width:600px;margin:0 auto;background:${theme.backgroundColor};border:1px solid ${theme.borderColor};">`);
    // Header logo
    if (branding.showLogo && branding.logoPosition === 'header' && logoUrl) {
      parts.push(`<div style="text-align:center;margin-bottom:15px;padding:20px 20px 0 20px;">
        <img src="${logoUrl}" alt="Logo" style="max-width:${logoSize};height:auto;display:block;margin:0 auto;"/>
      </div>`);
    }
    // Render blocks
    for (const block of blocks){
      if (block.hidden) continue;
      parts.push(this.renderBlock(block, order, tickets, deliveryMethod, qrUrls, theme, paymentInfo));
    }
    // Footer logo
    if (branding.showLogo && branding.logoPosition === 'footer' && logoUrl) {
      parts.push(`<div style="text-align:center;margin-top:15px;padding:0 20px 20px 20px;">
        <img src="${logoUrl}" alt="Logo" style="max-width:${logoSize};height:auto;display:block;margin:0 auto;"/>
      </div>`);
    }
    parts.push('</div></body></html>');
    return parts.join('');
  }
  // Render individual email block
  renderBlock(block: EmailBlock, order: Order, tickets: Ticket[], deliveryMethod: string, qrUrls: QrUrls, theme: Theme, paymentInfo: PaymentInfo): string {
    console.log('[RENDER-BLOCK] Processing block:', {
      type: block.type,
      block
    });
    switch(block.type){
      case 'header':
        return `<div style="background:${theme.headerColor};color:#fff;padding:20px;">
          <h1 style="margin:0;text-align:center;font-family:'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;font-weight:600;">
            ${sanitizeHtml(block.title || 'Thank you')}
          </h1>
        </div>`;
      case 'text':
        return `<div style="padding:16px 20px;color:${theme.textColor};">
          ${sanitizeHtml(block.html || '')}
        </div>`;
      case 'event_details':
        return this.renderEventDetails(order, theme);
      case 'ticket_list':
        // Only render if explicitly requested by the block configuration
        const showTickets = block.showTickets !== false; // Default to true for backward compatibility
        const showQRCodes = block.showQRCodes !== false; // Default to true
        const showWalletButton = block.showWalletButton !== false; // Default to true
        const customTitle = block.title || 'Your Tickets'; // Allow custom title
        const hideTitle = block.hideTitle === true; // Allow hiding title entirely
        if (!showTickets) {
          return ''; // Don't render anything if tickets are disabled
        }
        // Smart routing based on delivery method
        if (deliveryMethod === 'confirmation_email' || deliveryMethod === 'email_confirmation_only' || deliveryMethod === 'email_confirmation') {
          return this.renderOrderSummary(order, theme);
        } else {
          return this.renderTicketListConfigurable(tickets, qrUrls, theme, {
            showQRCodes,
            showWalletButton,
            customTitle: hideTitle ? '' : customTitle
          });
        }
      case 'registration_details':
        // Smart routing based on delivery method - opposite of ticket_list
        if (deliveryMethod === 'confirmation_email' || deliveryMethod === 'email_confirmation_only' || deliveryMethod === 'email_confirmation') {
          return this.renderRegistrationDetails(order, theme);
        } else {
          return this.renderTicketList(tickets, qrUrls, theme);
        }
      case 'payment_summary':
        return this.renderPaymentSummary(order, paymentInfo, theme);
      case 'button':
        return this.renderButton(block, theme, deliveryMethod, order);
      case 'divider':
        return `<hr style="border:0;border-top:1px solid ${theme.borderColor};margin:16px 20px;" />`;
      case 'image':
        if (!block.src) return '';
        const alignment = block.align || 'center';
        return `<div style="padding:16px 20px;text-align:${alignment};">
          <img src="${block.src}" alt="${sanitizeHtml(block.alt || '')}" style="max-width:100%;height:auto;" />
        </div>`;
      case 'footer':
        return `<div style="background:${theme.accentColor};padding:16px;text-align:center;border-top:1px solid ${theme.borderColor};">
          <small style="color:#999;">${sanitizeHtml(block.text || '')}</small>
        </div>`;
      case 'calendar_button':
        return this.renderCalendarButton(block, order, theme);
      case 'qr_tickets':
        return this.renderQRTickets(tickets, qrUrls, theme, block, deliveryMethod);
      case 'order_management':
        return this.renderOrderManagement(block, theme);
      case 'social_links':
        return this.renderSocialLinks(block, theme);
      case 'custom_message':
        return this.renderCustomMessage(block, theme, order);
      case 'next_steps':
        return this.renderNextSteps(block, theme);
      default:
        return '';
    }
  }
  // Render event details block
  renderEventDetails(order: Order, theme: Theme): string {
    const eventDate = new Date(order.events.event_date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
      <strong style="color:${theme.textColor}">${order.events.name}</strong>
      <div style="color:${theme.textColor};font-size:14px;line-height:1.6;margin-top:16px;">
        <div style="display:flex;align-items:center;margin:12px 0;padding:12px;background:${theme.backgroundColor};border-radius:8px;">
          <span style="color:${theme.textColor};margin-right:12px;">${CONFIG.ICONS.calendar}</span>
          <div>
            <div style="font-weight:600;color:${theme.headerColor};">${formattedDate}</div>
            <div style="color:${theme.textColor};margin-top:4px;">${formattedTime}</div>
          </div>
        </div>
        ${order.events.venue ? `<div style="display:flex;align-items:center;margin:12px 0;padding:12px;background:${theme.backgroundColor};border-radius:8px;">
          <span style="color:${theme.textColor};margin-right:12px;">${CONFIG.ICONS.mapPin}</span>
          <div>
            <div style="font-weight:600;color:${theme.headerColor};">Venue</div>
            <div style="color:${theme.textColor};margin-top:4px;">${order.events.venue}</div>
          </div>
        </div>` : ''}
      </div>
    </div>`;
  }
  // Render configurable ticket list with QR codes
  renderTicketListConfigurable(tickets: Ticket[], qrUrls: QrUrls, theme: Theme, config: any): string {
    if (tickets.length === 0) return '';
    const ticketHtml = tickets.map((ticket: Ticket, index: number) => {
      const qrUrl = qrUrls[ticket.code];
      const qrImg = config.showQRCodes && qrUrl ? `<img src="${qrUrl}" alt="QR Code" style="width:100px;height:100px;border:1px solid ${theme.borderColor};border-radius:4px;"/>` : '';
      // FIXED: Generate wallet pass URL using production Apple Wallet pass function with correct parameter name
      const walletUrl = `${CONFIG.SUPABASE_URL}/functions/v1/generate-apple-wallet-pass-production?ticket_code=${encodeURIComponent(ticket.code)}&download=true`;
      return `
        <table style="width:100%;border:1px solid ${theme.borderColor};border-radius:8px;margin:8px 0;background:${theme.backgroundColor};border-collapse:separate;border-spacing:0;">
          <tr>
            <td style="padding:16px;vertical-align:top;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top;width:60%;">
                    <div style="font-weight:600;color:${theme.headerColor};margin-bottom:8px;font-family:'Manrope', sans-serif;">${sanitizeHtml(ticket.type)}</div>
                    <div style="color:${theme.textColor};font-size:14px;margin-bottom:8px;">Ticket #${index + 1}</div>
                    <div style="color:${theme.textColor};font-size:12px;font-family:monospace;background:${theme.accentColor};padding:8px;border-radius:4px;word-break:break-all;margin-bottom:12px;">
                      ${sanitizeHtml(ticket.code)}
                    </div>
                    ${config.showWalletButton ? `<div style="margin-top:12px;">
                      <a href="${walletUrl}" style="display:inline-block;background:#007AFF;color:#ffffff;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:12px;font-weight:600;margin-right:8px;">📱 Add to Apple Wallet</a>
                    </div>` : ''}
                  </td>
                  ${qrImg ? `<td style="vertical-align:top;text-align:center;width:40%;padding-left:16px;">
                    <div>${qrImg}</div>
                    <div style="color:${theme.textColor};font-size:11px;margin-top:8px;">Scan at event</div>
                  </td>` : '<td style="width:40%;"></td>'}
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
    }).join('');
    return `<div class="email-content mobile-padding" style="margin:16px 20px;">
      ${config.customTitle ? `<h3 style="color:${theme.headerColor};margin-bottom:16px;font-family:'Manrope', sans-serif;">${sanitizeHtml(config.customTitle)}</h3>` : ''}
      ${ticketHtml}
    </div>`;
  }
  // Render ticket list with QR codes
  renderTicketList(tickets: Ticket[], qrUrls: QrUrls, theme: Theme): string {
    if (tickets.length === 0) return '';
    const ticketHtml = tickets.map((ticket: Ticket, index: number) => {
      const qrUrl = qrUrls[ticket.code];
      const qrImg = qrUrl ? `<img src="${qrUrl}" alt="QR Code" style="width:100px;height:100px;border:1px solid ${theme.borderColor};border-radius:4px;"/>` : '';
      // FIXED: Generate wallet pass URL using production Apple Wallet pass function with correct parameter name
      const walletUrl = `${CONFIG.SUPABASE_URL}/functions/v1/generate-apple-wallet-pass-production?ticket_code=${encodeURIComponent(ticket.code)}&download=true`;
      return `
        <table style="width:100%;border:1px solid ${theme.borderColor};border-radius:8px;margin:8px 0;background:${theme.backgroundColor};border-collapse:separate;border-spacing:0;">
          <tr>
            <td style="padding:16px;vertical-align:top;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top;width:60%;">
                    <div style="font-weight:600;color:${theme.headerColor};margin-bottom:8px;font-family:'Manrope', sans-serif;">${sanitizeHtml(ticket.type)}</div>
                    <div style="color:${theme.textColor};font-size:14px;margin-bottom:8px;">Ticket #${index + 1}</div>
                    <div style="color:${theme.textColor};font-size:12px;font-family:monospace;background:${theme.accentColor};padding:8px;border-radius:4px;word-break:break-all;margin-bottom:12px;">
                      ${sanitizeHtml(ticket.code)}
                    </div>
                    <div style="margin-top:12px;">
                      <a href="${walletUrl}" style="display:inline-block;background:#007AFF;color:#ffffff;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:12px;font-weight:600;margin-right:8px;">📱 Add to Apple Wallet</a>
                    </div>
                  </td>
                  ${qrImg ? `<td style="vertical-align:top;text-align:center;width:40%;padding-left:16px;">
                    <div>${qrImg}</div>
                    <div style="color:${theme.textColor};font-size:11px;margin-top:8px;">Scan at event</div>
                  </td>` : '<td style="width:40%;"></td>'}
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
    }).join('');
    return `<div class="email-content mobile-padding" style="margin:16px 20px;">
      <h3 style="color:${theme.headerColor};margin-bottom:16px;font-family:'Manrope', sans-serif;">Your Tickets</h3>
      ${ticketHtml}
    </div>`;
  }
  // Render order summary for confirmation emails
  renderOrderSummary(order: Order, theme: Theme): string {
    const itemsHtml = order.order_items.map((item: any) => {
      const name = item.item_type === 'ticket' ? item.ticket_types?.name || 'General Admission' : item.merchandise?.name || 'Merchandise';
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${theme.borderColor};vertical-align:top;">
          <div style="font-weight:600;color:${theme.textColor};margin-bottom:4px;">${sanitizeHtml(name)}</div>
          <div style="color:${theme.textColor};font-size:14px;">Quantity: ${item.quantity}</div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${theme.borderColor};text-align:right;vertical-align:top;">
          <div style="color:${theme.textColor};font-weight:600;">$${(item.unit_price * item.quantity).toFixed(2)}</div>
        </td>
      </tr>`;
    }).join('');
    // Calculate subtotal from order items
    const subtotal = order.order_items.reduce((sum: number, item: any) => sum + item.unit_price * item.quantity, 0);
    const processingFee = order.total_amount - subtotal;
    // Build the summary rows using table structure
    let summaryRows = '';
    // Add subtotal first
    summaryRows += `<tr>
      <td style="padding:8px 0;color:${theme.textColor};border-top:1px solid ${theme.borderColor};">Subtotal</td>
      <td style="padding:8px 0;color:${theme.textColor};text-align:right;border-top:1px solid ${theme.borderColor};">$${subtotal.toFixed(2)}</td>
    </tr>`;
    // Add processing fee if it exists
    if (processingFee > 0) {
      summaryRows += `<tr>
        <td style="padding:8px 0;color:${theme.textColor};">Processing Fee</td>
        <td style="padding:8px 0;color:${theme.textColor};text-align:right;">$${processingFee.toFixed(2)}</td>
      </tr>`;
    }
    return `<div style="margin:16px 20px;" class="email-content mobile-padding">
      <h3 style="color:${theme.headerColor};margin-bottom:16px;font-family:'Manrope', sans-serif;font-size:20px;">Order Summary</h3>
      <div style="border:1px solid ${theme.borderColor};border-radius:8px;padding:16px;background:${theme.backgroundColor};">
        <table style="width:100%;border-collapse:collapse;">
          ${itemsHtml}
          ${summaryRows}
          <tr>
            <td style="padding:16px 0 8px 0;font-weight:600;color:${theme.headerColor};border-top:2px solid ${theme.borderColor};font-size:16px;">Total</td>
            <td style="padding:16px 0 8px 0;font-weight:600;color:${theme.headerColor};text-align:right;border-top:2px solid ${theme.borderColor};font-size:16px;">$${order.total_amount.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>`;
  }
  // Render button block
  renderButton(block: EmailBlock, theme: Theme, deliveryMethod: string, order: Order): string {
    console.log('[BUTTON] renderButton called with:', {
      block,
      deliveryMethod,
      hasOrder: !!order
    });
    if (!block.url || block.url === '#') {
      console.log('[BUTTON] No URL or URL is #, skipping');
      return '';
    }
    try {
      // Replace template variables in URL
      let processedUrl = block.url;
      if (order) {
        processedUrl = processedUrl.replace('{{ORDER_ID}}', order.id);
        processedUrl = processedUrl.replace('{{CUSTOMER_EMAIL}}', encodeURIComponent(order.customer_email));
        // Handle legacy {{success_url}} template variable - use tickets page like the old function
        processedUrl = processedUrl.replace('{{success_url}}', `https://www.ticketflo.org/tickets?orderId=${order.id}&email=${encodeURIComponent(order.customer_email)}`);
      }
      console.log('[BUTTON] URL processing:', {
        originalUrl: block.url,
        processedUrl
      });
      const safeUrl = validateAndSanitizeUrl(processedUrl);
      console.log('[BUTTON] URL validation result:', {
        safeUrl
      });
      const alignment = block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : 'center';
      // Customize button text based on delivery method
      let buttonText = block.label || 'Click Here';
      if (block.label && block.label.toLowerCase().includes('view')) {
        if (deliveryMethod === 'confirmation_email' || deliveryMethod === 'email_confirmation_only' || deliveryMethod === 'email_confirmation') {
          buttonText = 'View Registration Confirmation';
        }
      }
      console.log('[BUTTON] Final button text:', {
        originalLabel: block.label,
        finalText: buttonText,
        deliveryMethod
      });
      return `<div class="email-content mobile-padding" style="padding:16px 20px;text-align:${alignment};">
        <a href="${safeUrl}" class="mobile-button" style="display:inline-block;background:${theme.buttonColor};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-family:'Manrope', sans-serif;">
          ${sanitizeHtml(buttonText)}
        </a>
      </div>`;
    } catch (error) {
      console.log('[BUTTON] Error rendering button:', error);
      // Skip invalid URLs
      return '';
    }
  }
  // Render payment summary block
  renderPaymentSummary(order: Order, paymentInfo: PaymentInfo, theme: Theme): string {
    console.log('[PAYMENT-SUMMARY] renderPaymentSummary called with:', {
      hasPaymentInfo: !!paymentInfo,
      paymentInfo: paymentInfo,
      hasLast4: !!(paymentInfo && paymentInfo.last4)
    });
    if (!paymentInfo || !paymentInfo.last4) {
      console.log('[PAYMENT-SUMMARY] Skipping payment summary - missing payment info or last4');
      return '';
    }
    return `<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
      <h3 style="color:${theme.headerColor};margin-bottom:16px;font-family:'Manrope', sans-serif;">Payment Summary</h3>
      <div style="color:${theme.textColor};font-size:14px;line-height:1.6;">
        <div style="display:flex;align-items:center;margin:12px 0;padding:12px;background:${theme.backgroundColor};border-radius:8px;">
          <span style="color:${theme.textColor};margin-right:12px;font-size:16px;">${CONFIG.ICONS.card}</span>
          <div>
            <div style="font-weight:600;color:${theme.headerColor};">Payment Method</div>
            <div style="color:${theme.textColor};margin-top:4px;">${sanitizeHtml(paymentInfo.brand)} ending in ${sanitizeHtml(paymentInfo.last4)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;margin:12px 0;padding:12px;background:${theme.backgroundColor};border-radius:8px;">
          <span style="color:${theme.textColor};margin-right:12px;font-size:16px;">💰</span>
          <div>
            <div style="font-weight:600;color:${theme.headerColor};">Total Paid</div>
            <div style="color:${theme.textColor};margin-top:4px;">$${order.total_amount.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>`;
  }
  // Get logo URL based on branding configuration
  getLogoUrl(order: Order, branding: any): string {
    // If showLogo is explicitly false, don't show any logo
    if (branding.showLogo === false) return null;
    // Default to showing logo if not specified
    const showLogo = branding.showLogo !== false;
    if (!showLogo) return null;
    const logoSource = branding.logoSource || 'event';
    console.log('[LOGO] Getting logo URL:', {
      logoSource,
      eventLogoUrl: order.events.logo_url,
      orgLogoUrl: order.events.organizations.logo_url,
      branding
    });
    switch(logoSource){
      case 'organization':
        const orgUrl = order.events.organizations.logo_url || null;
        console.log('[LOGO] Using organization logo:', orgUrl);
        return orgUrl;
      case 'custom':
        const customUrl = branding.customLogoUrl || null;
        console.log('[LOGO] Using custom logo:', customUrl);
        return customUrl;
      case 'event':
      default:
        // Always prioritize event logo first, then fall back to organization logo
        const eventLogo = order.events.logo_url?.trim();
        const orgLogo = order.events.organizations.logo_url?.trim();
        const finalUrl = eventLogo || orgLogo || null;
        console.log('[LOGO] Using event logo (with fallback):', {
          eventLogo,
          orgLogo,
          finalUrl
        });
        return finalUrl;
    }
  }
  // Render calendar button block
  renderCalendarButton(block: EmailBlock, order: Order, theme: Theme): string {
    const eventDate = new Date(order.events.event_date);
    const startTime = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; // 2 hours duration
    const calendarParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: order.events.name,
      dates: `${startTime}/${endTime}`,
      details: `Event: ${order.events.name}${order.events.venue ? `\nVenue: ${order.events.venue}` : ''}`,
      location: order.events.venue || '',
      sf: 'true',
      output: 'xml'
    });
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?${calendarParams.toString()}`;
    const alignment = block.align || 'center';
    const label = block.label || 'Add to Calendar';
    const showIcon = block.showIcon !== false;
    return `<div style="padding:16px 20px;text-align:${alignment};">
      <a href="${googleCalendarUrl}" style="display:inline-block;background:${theme.accentColor};color:${theme.textColor};border:2px solid ${theme.borderColor};padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-family:'Manrope', sans-serif;min-width:120px;">
        ${showIcon ? '📅 ' : ''}${sanitizeHtml(label)}
      </a>
    </div>`;
  }
  // Render QR tickets block
  renderQRTickets(tickets: Ticket[], qrUrls: QrUrls, theme: Theme, block: EmailBlock, deliveryMethod: string): string {
    const layout = block.layout || 'grid';
    const showInline = block.showInline !== false;
    const includeBarcode = block.includeBarcode === true;
    // For confirmation emails, don't show QR tickets block at all
    if (deliveryMethod === 'confirmation_email' || deliveryMethod === 'email_confirmation_only' || deliveryMethod === 'email_confirmation') {
      return '';
    }
    // If no tickets, show a placeholder message
    if (tickets.length === 0) {
      return `<div style="margin:16px 20px;padding:16px;background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:8px;text-align:center;">
        <h3 style="color:${theme.headerColor};margin-bottom:8px;font-family:'Manrope', sans-serif;">Your QR Tickets</h3>
        <p style="color:${theme.textColor};font-size:14px;margin:0;">Your QR codes are being generated and will be available shortly in your account.</p>
      </div>`;
    }
    if (!showInline) {
      return `<div style="margin:16px 20px;padding:16px;background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:8px;text-align:center;">
        <h3 style="color:${theme.headerColor};margin-bottom:8px;font-family:'Manrope', sans-serif;">Your QR Tickets</h3>
        <p style="color:${theme.textColor};font-size:14px;margin:0;">QR codes will be attached as separate files to this email.</p>
      </div>`;
    }
    const ticketStyle = layout === 'grid' ? 'display:inline-block;margin:8px;vertical-align:top;' : 'display:block;margin:8px 0;';
    const ticketHtml = tickets.map((ticket: Ticket, index: number) => {
      const qrUrl = qrUrls[ticket.code];
      const qrImg = qrUrl ? `<img src="${qrUrl}" alt="QR Code" style="width:100px;height:100px;margin:8px auto;border:1px solid ${theme.borderColor};border-radius:4px;display:block;"/>` : `<div style="width:100px;height:100px;background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:4px;margin:8px auto;display:flex;align-items:center;justify-content:center;color:${theme.textColor};font-size:12px;">QR Code<br/>Preview</div>`;
      return `<div style="${ticketStyle}border:1px solid ${theme.borderColor};border-radius:8px;padding:16px;background:${theme.backgroundColor};text-align:center;min-width:200px;">
        <div style="font-weight:600;color:${theme.headerColor};margin-bottom:8px;">${sanitizeHtml(ticket.type)}</div>
        <div style="color:${theme.textColor};font-size:14px;margin-bottom:8px;">Ticket #${index + 1}</div>
        ${qrImg}
        <div style="color:${theme.textColor};font-size:10px;font-family:monospace;background:${theme.accentColor};padding:4px;border-radius:4px;word-break:break-all;margin-top:8px;">
          ${sanitizeHtml(ticket.code)}
        </div>
      </div>`;
    }).join('');
    return `<div style="margin:16px 20px;">
      <h3 style="color:${theme.headerColor};margin-bottom:16px;font-family:'Manrope', sans-serif;">Your QR Tickets</h3>
      <div style="text-align:center;">
        ${ticketHtml}
      </div>
    </div>`;
  }
  // Render order management block
  renderOrderManagement(block: EmailBlock, theme: Theme): string {
    const showViewOrder = block.showViewOrder !== false;
    const showModifyOrder = block.showModifyOrder === true;
    const showCancelOrder = block.showCancelOrder === true;
    const customText = block.customText || 'Need help with your order?';
    const buttons = [];
    if (showViewOrder) {
      buttons.push(`<a href="#" style="display:inline-block;margin:4px;background:${theme.buttonColor};color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;font-size:14px;">View Order</a>`);
    }
    if (showModifyOrder) {
      buttons.push(`<a href="#" style="display:inline-block;margin:4px;background:${theme.accentColor};color:${theme.textColor};border:1px solid ${theme.borderColor};padding:8px 16px;text-decoration:none;border-radius:4px;font-size:14px;">Modify Order</a>`);
    }
    if (showCancelOrder) {
      buttons.push(`<a href="#" style="display:inline-block;margin:4px;background:#ef4444;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;font-size:14px;">Cancel Order</a>`);
    }
    if (buttons.length === 0) return '';
    return `<div style="margin:16px 20px;padding:16px;background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:8px;text-align:center;">
      <p style="color:${theme.textColor};margin-bottom:12px;font-weight:500;">${sanitizeHtml(customText)}</p>
      <div>
        ${buttons.join('')}
      </div>
    </div>`;
  }
  // Render social links block
  renderSocialLinks(block: EmailBlock, theme: Theme): string {
    const platforms = block.platforms || {};
    const alignment = block.align || 'center';
    const style = block.style || 'icons';
    const socialLinks = [];
    if (platforms.facebook) {
      const content = style === 'icons' ? '📘' : 'Facebook';
      socialLinks.push(`<a href="${validateAndSanitizeUrl(platforms.facebook)}" style="display:inline-block;margin:0 8px;color:${theme.textColor};text-decoration:none;">${content}</a>`);
    }
    if (platforms.twitter) {
      const content = style === 'icons' ? '🐦' : 'Twitter';
      socialLinks.push(`<a href="${validateAndSanitizeUrl(platforms.twitter)}" style="display:inline-block;margin:0 8px;color:${theme.textColor};text-decoration:none;">${content}</a>`);
    }
    if (platforms.instagram) {
      const content = style === 'icons' ? '📷' : 'Instagram';
      socialLinks.push(`<a href="${validateAndSanitizeUrl(platforms.instagram)}" style="display:inline-block;margin:0 8px;color:${theme.textColor};text-decoration:none;">${content}</a>`);
    }
    if (platforms.linkedin) {
      const content = style === 'icons' ? '💼' : 'LinkedIn';
      socialLinks.push(`<a href="${validateAndSanitizeUrl(platforms.linkedin)}" style="display:inline-block;margin:0 8px;color:${theme.textColor};text-decoration:none;">${content}</a>`);
    }
    if (platforms.website) {
      const content = style === 'icons' ? '🌐' : 'Website';
      socialLinks.push(`<a href="${validateAndSanitizeUrl(platforms.website)}" style="display:inline-block;margin:0 8px;color:${theme.textColor};text-decoration:none;">${content}</a>`);
    }
    if (socialLinks.length === 0) return '';
    return `<div style="padding:16px 20px;text-align:${alignment};">
      <div style="color:${theme.textColor};font-size:14px;">
        ${socialLinks.join('')}
      </div>
    </div>`;
  }
  // Render custom message block with personalization
  renderCustomMessage(block: EmailBlock, theme: Theme, order: Order): string {
    let message = block.message || block.markdown || '';
    if (!message) return '';
    // Apply personalization variables
    message = this.applyPersonalization(message, order);
    return `<div style="margin:16px 20px;padding:16px;background:${theme.accentColor};border-left:4px solid ${theme.buttonColor};border-radius:4px;">
      <div style="color:${theme.textColor};line-height:1.6;">
        ${sanitizeHtml(message)}
      </div>
    </div>`;
  }
  // Render next steps block
  renderNextSteps(block: EmailBlock, theme: Theme): string {
    const steps = block.steps || [];
    const title = block.title || 'What\'s Next?';
    const showIcons = block.showIcons !== false;
    if (steps.length === 0) return '';
    const stepsHtml = steps.map((step: any, index: number) => {
      const icon = showIcons ? `${index + 1}️⃣ ` : `${index + 1}. `;
      return `<li style="margin:8px 0;color:${theme.textColor};line-height:1.5;">
        ${icon}${sanitizeHtml(step)}
      </li>`;
    }).join('');
    return `<div style="margin:16px 20px;padding:16px;background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:8px;">
      <h3 style="color:${theme.headerColor};margin-bottom:12px;font-family:'Manrope', sans-serif;">${sanitizeHtml(title)}</h3>
      <ul style="margin:0;padding-left:0;list-style:none;">
        ${stepsHtml}
      </ul>
    </div>`;
  }
  // Render registration details block (same as order summary but different title)
  renderRegistrationDetails(order: Order, theme: Theme): string {
    const itemsHtml = order.order_items.map((item: any) => {
      const name = item.item_type === 'ticket' ? item.ticket_types?.name || 'General Admission' : item.merchandise?.name || 'Merchandise';
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${theme.borderColor};vertical-align:top;">
          <div style="font-weight:600;color:${theme.textColor};margin-bottom:4px;">${sanitizeHtml(name)}</div>
          <div style="color:${theme.textColor};font-size:14px;">Quantity: ${item.quantity}</div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${theme.borderColor};text-align:right;vertical-align:top;">
          <div style="color:${theme.textColor};font-weight:600;">$${(item.unit_price * item.quantity).toFixed(2)}</div>
        </td>
      </tr>`;
    }).join('');
    // Calculate subtotal from order items
    const subtotal = order.order_items.reduce((sum: number, item: any) => sum + item.unit_price * item.quantity, 0);
    const processingFee = order.total_amount - subtotal;
    // Build the summary rows using table structure
    let summaryRows = '';
    // Add subtotal first
    summaryRows += `<tr>
      <td style="padding:8px 0;color:${theme.textColor};border-top:1px solid ${theme.borderColor};">Subtotal</td>
      <td style="padding:8px 0;color:${theme.textColor};text-align:right;border-top:1px solid ${theme.borderColor};">$${subtotal.toFixed(2)}</td>
    </tr>`;
    // Add processing fee if it exists
    if (processingFee > 0) {
      summaryRows += `<tr>
        <td style="padding:8px 0;color:${theme.textColor};">Processing Fee</td>
        <td style="padding:8px 0;color:${theme.textColor};text-align:right;">$${processingFee.toFixed(2)}</td>
      </tr>`;
    }
    return `<div style="margin:16px 20px;" class="email-content mobile-padding">
      <h3 style="color:${theme.headerColor};margin-bottom:16px;font-family:'Manrope', sans-serif;font-size:20px;">Registration Details</h3>
      <div style="border:1px solid ${theme.borderColor};border-radius:8px;padding:16px;background:${theme.backgroundColor};">
        <table style="width:100%;border-collapse:collapse;">
          ${itemsHtml}
          ${summaryRows}
          <tr>
            <td style="padding:16px 0 8px 0;font-weight:600;color:${theme.headerColor};border-top:2px solid ${theme.borderColor};font-size:16px;">Total</td>
            <td style="padding:16px 0 8px 0;font-weight:600;color:${theme.headerColor};text-align:right;border-top:2px solid ${theme.borderColor};font-size:16px;">$${order.total_amount.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>`;
  }
  // Apply personalization variables to text
  applyPersonalization(text: string, order: Order): string {
    const eventDate = new Date(order.events.event_date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    // Extract customer name from email if not available
    const customerName = order.customer_name || order.customer_email.split('@')[0];
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] || customerName;
    const lastName = nameParts.slice(1).join(' ') || '';
    const variables = {
      '@FirstName': firstName,
      '@LastName': lastName,
      '@FullName': customerName,
      '@EventName': order.events.name,
      '@EventDate': formattedDate,
      '@EventTime': formattedTime,
      '@EventVenue': order.events.venue || '',
      '@OrderNumber': order.id || 'N/A',
      '@TotalAmount': `$${order.total_amount.toFixed(2)}`,
      '@TicketCount': order.order_items.filter((item: any) => item.item_type === 'ticket').reduce((sum: number, item: any) => sum + item.quantity, 0).toString(),
      '@OrganizerName': order.events.organizations?.name || '',
      '@ContactEmail': order.events.organizations?.contact_email || order.events?.contact_email || '',
      '@EventDescription': order.events?.description || '',
      '@SpecialInstructions': order.events?.special_instructions || ''
    };
    let result = text;
    Object.entries(variables).forEach(([key, value])=>{
      result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    return result;
  }
}