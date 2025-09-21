// Email template generation service - FIXED VERSION
import { CONFIG } from './config.ts';
import { sanitizeHtml, validateAndSanitizeUrl } from './utils.ts';
import { Order, Ticket, Theme, QrUrls, EmailBlock, EmailCustomization, PaymentInfo, EmailContent } from './types.ts';
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
  generateEmailContent(order: Order, tickets: Ticket[], deliveryMethod: string, qrUrls: QrUrls, paymentInfo: PaymentInfo): EmailContent {
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
    const theme = this.getThemeStyles(emailCustomization?.theme || 'professional', emailCustomization?.template);
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
      const walletUrl = `${CONFIG.SUPABASE_URL}/functions/v1/generate-apple-wallet-pass-production?ticketCode=${encodeURIComponent(ticket.code)}&download=true`;
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
                      <a href="${walletUrl}" download="ticket.pkpass" style="display:inline-block;text-decoration:none;">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" id="Artwork" width="110.739" height="35.016" x="0" y="0" version="1.1"><style>.st3{clip-path:url(#SVGID_2_)}.st9{fill:#fff}</style><path d="M100.211 0H9.533c-.367 0-.729 0-1.094.002-.307.002-.61.008-.919.013-.666.016-1.339.057-2.004.176a6.7 6.7 0 0 0-1.9.627 6.43 6.43 0 0 0-2.797 2.8 6.6 6.6 0 0 0-.625 1.903c-.12.662-.162 1.331-.179 2.001-.009.307-.01.614-.015.921v17.134c.005.31.006.611.015.922.017.67.059 1.34.179 2.002.117.67.314 1.298.625 1.904.303.596.7 1.144 1.178 1.614.473.477 1.02.875 1.618 1.178.609.312 1.231.51 1.901.631.664.119 1.338.158 2.004.177q.462.01.919.011c.366.002.728.002 1.095.002h90.678c.359 0 .724 0 1.084-.002.305 0 .617-.004.922-.011.67-.018 1.342-.058 2-.177a6.8 6.8 0 0 0 1.908-.631 6.3 6.3 0 0 0 1.617-1.178 6.4 6.4 0 0 0 1.181-1.614 6.6 6.6 0 0 0 .619-1.904c.123-.662.162-1.332.186-2.002.004-.311.004-.611.004-.922.008-.363.008-.724.008-1.094V9.534c0-.366 0-.729-.008-1.092q.001-.46-.004-.921c-.023-.67-.062-1.34-.186-2.002a6.6 6.6 0 0 0-.619-1.903 6.47 6.47 0 0 0-2.798-2.8 6.7 6.7 0 0 0-1.908-.627c-.658-.119-1.33-.16-2-.177-.305-.005-.617-.011-.922-.013z" style="fill:#a6a6a6"/><path d="M100.211.65a94.038 94.038 0 0 1 1.826.012l.164.003c.529.013 1.222.044 1.904.167a6.1 6.1 0 0 1 1.723.565 5.8 5.8 0 0 1 1.455 1.061c.423.42.78.91 1.059 1.452.271.539.454 1.101.56 1.729.117.63.153 1.288.175 1.891.004.304.004.609.004.926.008.358.008.716.008 1.078v14.948c0 .364 0 .721-.008 1.094q.001.46-.004.899c-.022.617-.058 1.275-.177 1.916a6 6 0 0 1-.555 1.713 5.7 5.7 0 0 1-1.066 1.456c-.423.427-.91.782-1.449 1.056a6.2 6.2 0 0 1-1.729.571c-.655.119-1.329.151-1.898.167-.3.007-.607.011-.911.011-.358.002-.722.002-1.08.002H9.533c-.365 0-.726 0-1.095-.002q-.45 0-.901-.01c-.572-.016-1.245-.048-1.906-.167a6 6 0 0 1-1.722-.571 5.6 5.6 0 0 1-1.457-1.063 5.6 5.6 0 0 1-1.055-1.447 6 6 0 0 1-.564-1.724c-.124-.681-.155-1.374-.169-1.904a32 32 0 0 1-.011-.616l-.003-.287V8.453l.004-.299q.003-.305.011-.615c.013-.528.045-1.221.17-1.907a6 6 0 0 1 .564-1.721 5.6 5.6 0 0 1 1.058-1.455A5.8 5.8 0 0 1 3.91 1.398 6 6 0 0 1 5.631.831C6.315.708 7.009.678 7.53.664l.198-.003q.358-.007.714-.009Q8.987.65 9.533.65z"/><defs><path id="SVGID_1_" d="M33.265 23.054v.265l-.001.381-.005.321c-.006.233-.02.468-.061.698a2.4 2.4 0 0 1-.219.664 2.26 2.26 0 0 1-1.64 1.195c-.23.041-.465.055-.698.061l-.321.005-.381.001-1.459-.001 1.358.001H10.985l1.358-.001-1.459.001-.381-.001-.321-.005a5 5 0 0 1-.698-.061 2.4 2.4 0 0 1-.664-.219 2.26 2.26 0 0 1-1.195-1.64 5 5 0 0 1-.061-.698 12 12 0 0 1-.004-.321l-.001-.381v-12.42 1.25-1.458l.001-.381q.001-.16.005-.321c.006-.233.02-.468.061-.698.042-.234.111-.452.219-.664a2.26 2.26 0 0 1 1.64-1.195c.23-.041.465-.055.698-.061q.16-.004.321-.005l.381-.001h19.054a48 48 0 0 1 .702.006c.233.006.468.02.698.061.234.042.451.111.664.219q.316.16.565.411a2.26 2.26 0 0 1 .63 1.229c.041.23.055.465.061.698q.004.16.005.321l.001.381v12.363"/></defs><clipPath id="SVGID_2_"><use xlink:href="#SVGID_1_" style="overflow:visible"/></clipPath><path d="M8.352 8.169h24.099v16.78H8.352z" style="clip-path:url(#SVGID_2_);fill:#dedbce"/><path d="M8.63 8.436h23.564v9.997H8.63z" style="clip-path:url(#SVGID_2_);fill-rule:evenodd;clip-rule:evenodd;fill:#40a5d9"/><g class="st3"><path d="M32.194 12.688v-.242l-.003-.204a3 3 0 0 0-.039-.443 1.5 1.5 0 0 0-.139-.421 1.41 1.41 0 0 0-1.04-.759 3 3 0 0 0-.443-.039l-.204-.003H10.498l-.204.003a3 3 0 0 0-.443.039c-.148.027-.286.07-.421.139a1.4 1.4 0 0 0-.619.62 1.5 1.5 0 0 0-.139.421 3 3 0 0 0-.039.443l-.003.204v1.167-.727 7.689h23.564v-7.887" style="fill-rule:evenodd;clip-rule:evenodd;fill:#ffb003"/></g><g class="st3"><path d="M32.194 14.83v-.242l-.003-.204a3 3 0 0 0-.039-.443 1.5 1.5 0 0 0-.139-.421 1.41 1.41 0 0 0-1.04-.759 3 3 0 0 0-.443-.039l-.204-.003H10.498l-.204.003a3 3 0 0 0-.443.039c-.148.027-.286.07-.421.139a1.4 1.4 0 0 0-.619.62 1.5 1.5 0 0 0-.139.421 3 3 0 0 0-.039.443l-.003.204v1.167-.727 7.689h23.564V14.83" style="fill-rule:evenodd;clip-rule:evenodd;fill:#40c740"/></g><g class="st3"><path d="M32.194 16.972v-.242l-.003-.204a3 3 0 0 0-.039-.443 1.5 1.5 0 0 0-.139-.421 1.41 1.41 0 0 0-1.04-.759 3 3 0 0 0-.443-.039l-.204-.003H10.498l-.204.003a3 3 0 0 0-.443.039c-.148.027-.286.07-.421.139a1.4 1.4 0 0 0-.619.62 1.5 1.5 0 0 0-.139.421 3 3 0 0 0-.039.443l-.003.204v1.167-.727 7.689h23.564v-7.887" style="fill-rule:evenodd;clip-rule:evenodd;fill:#f26d5f"/></g><path d="M7.202 7.008v11.068H8.63v-7.772l.003-.204c.004-.148.013-.297.039-.443.027-.148.07-.286.139-.421a1.41 1.41 0 0 1 1.04-.757c.146-.026.295-.035.443-.039l.204-.003h19.828l.204.003c.148.004.297.013.443.039.148.027.286.07.421.139a1.4 1.4 0 0 1 .619.62c.069.135.112.273.139.421.026.146.035.295.039.443l.003.204v7.772h1.428V7.008z" style="clip-path:url(#SVGID_2_);fill-rule:evenodd;clip-rule:evenodd;fill:#d9d6cc"/><g class="st3"><path d="m26.985 17.005-.46.001q-.194 0-.387.006a6 6 0 0 0-.843.074 2.9 2.9 0 0 0-.801.264c-.033.017-.738.337-1.372 1.323-.481.749-1.417 1.543-2.727 1.543s-2.246-.794-2.727-1.543c-.667-1.039-1.428-1.351-1.373-1.323a2.8 2.8 0 0 0-.801-.264 5.6 5.6 0 0 0-.843-.074l-.387-.006-.46-.001h-6.6v9.996h26.42v-9.996z" style="fill-rule:evenodd;clip-rule:evenodd;fill:#dedbce"/></g><path d="M41.23 17.661h1.351l2.926 8.057h-1.312l-.737-2.177h-3.105l-.743 2.177h-1.312zm-.542 4.875h2.429l-1.2-3.54h-.022zM46.28 19.844h1.206v1.011h.028c.352-.698 1-1.122 1.837-1.122 1.497 0 2.457 1.173 2.457 3.048v.006c0 1.871-.966 3.048-2.44 3.048-.832 0-1.508-.424-1.854-1.105h-.028v2.943H46.28zm4.3 2.943v-.006c0-1.251-.598-2.015-1.541-2.015-.916 0-1.558.793-1.558 2.015v.006c0 1.218.648 2.01 1.558 2.01.948 0 1.541-.771 1.541-2.01M52.999 19.844h1.206v1.011h.028c.352-.698.999-1.122 1.837-1.122 1.497 0 2.457 1.173 2.457 3.048v.006c0 1.871-.966 3.048-2.44 3.048-.832 0-1.508-.424-1.854-1.105h-.028v2.943h-1.206zm4.299 2.943v-.006c0-1.251-.598-2.015-1.541-2.015-.916 0-1.558.793-1.558 2.015v.006c0 1.218.648 2.01 1.558 2.01.949 0 1.541-.771 1.541-2.01M59.59 17.661h1.207v8.057H59.59zM61.97 22.803v-.006c0-1.837 1.061-3.065 2.709-3.065s2.658 1.183 2.658 2.948v.408h-4.159c.022 1.111.631 1.758 1.591 1.758.715 0 1.19-.368 1.341-.809l.017-.045h1.144l-.011.062c-.189.932-1.095 1.781-2.518 1.781-1.727 0-2.772-1.178-2.772-3.032m1.224-.569h2.948c-.101-1.016-.67-1.513-1.457-1.513-.783 0-1.386.53-1.491 1.513M71.171 17.661h1.301l1.503 6.315h.022l1.703-6.315h1.183l1.703 6.315h.028l1.502-6.315h1.302l-2.178 8.057h-1.2l-1.731-6.075h-.029l-1.737 6.075h-1.201zM81.761 24.048v-.011c0-1.022.794-1.647 2.184-1.731l1.596-.095v-.441c0-.647-.419-1.039-1.167-1.039-.698 0-1.128.33-1.228.799l-.012.051h-1.138l.005-.062c.084-1.011.961-1.787 2.407-1.787 1.435 0 2.345.76 2.345 1.937v4.048h-1.212v-.927h-.022c-.341.631-1.021 1.033-1.798 1.033-1.172.001-1.96-.719-1.96-1.775m2.289.811c.848 0 1.491-.575 1.491-1.341v-.458l-1.435.09c-.725.044-1.128.362-1.128.859v.012c0 .513.425.838 1.072.838M88.074 17.661h1.206v8.057h-1.206zM90.979 17.661h1.206v8.057h-1.206zM93.245 22.803v-.006c0-1.837 1.06-3.065 2.708-3.065s2.659 1.183 2.659 2.948v.408h-4.16c.022 1.111.631 1.758 1.592 1.758.715 0 1.189-.368 1.34-.809l.018-.045h1.144l-.011.062c-.19.932-1.095 1.781-2.519 1.781-1.727 0-2.771-1.178-2.771-3.032m1.223-.569h2.949c-.101-1.016-.67-1.513-1.458-1.513-.782 0-1.385.53-1.491 1.513M100.142 24.171v-3.367h-.844v-.961h.844v-1.53h1.233v1.53h1.1v.961h-1.1v3.294c0 .598.269.776.776.776.129 0 .234-.012.324-.022v.932c-.14.022-.368.05-.614.05-1.161.001-1.719-.49-1.719-1.663M42.193 12.483h-2.408l-.608 1.733h-.793l2.232-6.054h.747l2.232 6.054h-.793zm-2.185-.642h1.964l-.949-2.702h-.067zM44.074 11.954c0-1.418.751-2.341 1.901-2.341.629 0 1.162.298 1.418.793h.063V7.897h.722v6.318h-.688v-.722h-.067c-.285.503-.822.801-1.448.801-1.158.001-1.901-.918-1.901-2.34m.747 0c0 1.057.495 1.691 1.322 1.691.822 0 1.33-.646 1.33-1.691 0-1.036-.512-1.691-1.33-1.691-.823 0-1.322.638-1.322 1.691M49.342 11.954c0-1.418.751-2.341 1.901-2.341.629 0 1.162.298 1.418.793h.063V7.897h.722v6.318h-.688v-.722h-.068c-.285.503-.822.801-1.448.801-1.158.001-1.9-.918-1.9-2.34m.746 0c0 1.057.495 1.691 1.322 1.691.822 0 1.33-.646 1.33-1.691 0-1.036-.512-1.691-1.33-1.691-.823 0-1.322.638-1.322 1.691M58.274 8.522v1.171h1.008v.604h-1.008v2.56c0 .533.202.759.672.759.13 0 .201-.004.336-.017v.608a2.5 2.5 0 0 1-.424.042c-.931 0-1.305-.344-1.305-1.208v-2.744h-.729v-.604h.729V8.522zM60.072 11.954c0-1.456.798-2.341 2.086-2.341s2.085.885 2.085 2.341c0 1.451-.797 2.341-2.085 2.341s-2.086-.89-2.086-2.341m3.424 0c0-1.074-.483-1.691-1.339-1.691s-1.339.617-1.339 1.691c0 1.07.482 1.691 1.339 1.691.856 0 1.339-.621 1.339-1.691" class="st9"/></svg>
                      </a>
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
      const walletUrl = `${CONFIG.SUPABASE_URL}/functions/v1/generate-apple-wallet-pass-production?ticketCode=${encodeURIComponent(ticket.code)}&download=true`;
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
                      <a href="${walletUrl}" download="ticket.pkpass" style="display:inline-block;text-decoration:none;">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" id="Artwork" width="110.739" height="35.016" x="0" y="0" version="1.1"><style>.st3{clip-path:url(#SVGID_2_)}.st9{fill:#fff}</style><path d="M100.211 0H9.533c-.367 0-.729 0-1.094.002-.307.002-.61.008-.919.013-.666.016-1.339.057-2.004.176a6.7 6.7 0 0 0-1.9.627 6.43 6.43 0 0 0-2.797 2.8 6.6 6.6 0 0 0-.625 1.903c-.12.662-.162 1.331-.179 2.001-.009.307-.01.614-.015.921v17.134c.005.31.006.611.015.922.017.67.059 1.34.179 2.002.117.67.314 1.298.625 1.904.303.596.7 1.144 1.178 1.614.473.477 1.02.875 1.618 1.178.609.312 1.231.51 1.901.631.664.119 1.338.158 2.004.177q.462.01.919.011c.366.002.728.002 1.095.002h90.678c.359 0 .724 0 1.084-.002.305 0 .617-.004.922-.011.67-.018 1.342-.058 2-.177a6.8 6.8 0 0 0 1.908-.631 6.3 6.3 0 0 0 1.617-1.178 6.4 6.4 0 0 0 1.181-1.614 6.6 6.6 0 0 0 .619-1.904c.123-.662.162-1.332.186-2.002.004-.311.004-.611.004-.922.008-.363.008-.724.008-1.094V9.534c0-.366 0-.729-.008-1.092q.001-.46-.004-.921c-.023-.67-.062-1.34-.186-2.002a6.6 6.6 0 0 0-.619-1.903 6.47 6.47 0 0 0-2.798-2.8 6.7 6.7 0 0 0-1.908-.627c-.658-.119-1.33-.16-2-.177-.305-.005-.617-.011-.922-.013z" style="fill:#a6a6a6"/><path d="M100.211.65a94.038 94.038 0 0 1 1.826.012l.164.003c.529.013 1.222.044 1.904.167a6.1 6.1 0 0 1 1.723.565 5.8 5.8 0 0 1 1.455 1.061c.423.42.78.91 1.059 1.452.271.539.454 1.101.56 1.729.117.63.153 1.288.175 1.891.004.304.004.609.004.926.008.358.008.716.008 1.078v14.948c0 .364 0 .721-.008 1.094q.001.46-.004.899c-.022.617-.058 1.275-.177 1.916a6 6 0 0 1-.555 1.713 5.7 5.7 0 0 1-1.066 1.456c-.423.427-.91.782-1.449 1.056a6.2 6.2 0 0 1-1.729.571c-.655.119-1.329.151-1.898.167-.3.007-.607.011-.911.011-.358.002-.722.002-1.08.002H9.533c-.365 0-.726 0-1.095-.002q-.45 0-.901-.01c-.572-.016-1.245-.048-1.906-.167a6 6 0 0 1-1.722-.571 5.6 5.6 0 0 1-1.457-1.063 5.6 5.6 0 0 1-1.055-1.447 6 6 0 0 1-.564-1.724c-.124-.681-.155-1.374-.169-1.904a32 32 0 0 1-.011-.616l-.003-.287V8.453l.004-.299q.003-.305.011-.615c.013-.528.045-1.221.17-1.907a6 6 0 0 1 .564-1.721 5.6 5.6 0 0 1 1.058-1.455A5.8 5.8 0 0 1 3.91 1.398 6 6 0 0 1 5.631.831C6.315.708 7.009.678 7.53.664l.198-.003q.358-.007.714-.009Q8.987.65 9.533.65z"/><defs><path id="SVGID_1_" d="M33.265 23.054v.265l-.001.381-.005.321c-.006.233-.02.468-.061.698a2.4 2.4 0 0 1-.219.664 2.26 2.26 0 0 1-1.64 1.195c-.23.041-.465.055-.698.061l-.321.005-.381.001-1.459-.001 1.358.001H10.985l1.358-.001-1.459.001-.381-.001-.321-.005a5 5 0 0 1-.698-.061 2.4 2.4 0 0 1-.664-.219 2.26 2.26 0 0 1-1.195-1.64 5 5 0 0 1-.061-.698 12 12 0 0 1-.004-.321l-.001-.381v-12.42 1.25-1.458l.001-.381q.001-.16.005-.321c.006-.233.02-.468.061-.698.042-.234.111-.452.219-.664a2.26 2.26 0 0 1 1.64-1.195c.23-.041.465-.055.698-.061q.16-.004.321-.005l.381-.001h19.054a48 48 0 0 1 .702.006c.233.006.468.02.698.061.234.042.451.111.664.219q.316.16.565.411a2.26 2.26 0 0 1 .63 1.229c.041.23.055.465.061.698q.004.16.005.321l.001.381v12.363"/></defs><clipPath id="SVGID_2_"><use xlink:href="#SVGID_1_" style="overflow:visible"/></clipPath><path d="M8.352 8.169h24.099v16.78H8.352z" style="clip-path:url(#SVGID_2_);fill:#dedbce"/><path d="M8.63 8.436h23.564v9.997H8.63z" style="clip-path:url(#SVGID_2_);fill-rule:evenodd;clip-rule:evenodd;fill:#40a5d9"/><g class="st3"><path d="M32.194 12.688v-.242l-.003-.204a3 3 0 0 0-.039-.443 1.5 1.5 0 0 0-.139-.421 1.41 1.41 0 0 0-1.04-.759 3 3 0 0 0-.443-.039l-.204-.003H10.498l-.204.003a3 3 0 0 0-.443.039c-.148.027-.286.07-.421.139a1.4 1.4 0 0 0-.619.62 1.5 1.5 0 0 0-.139.421 3 3 0 0 0-.039.443l-.003.204v1.167-.727 7.689h23.564v-7.887" style="fill-rule:evenodd;clip-rule:evenodd;fill:#ffb003"/></g><g class="st3"><path d="M32.194 14.83v-.242l-.003-.204a3 3 0 0 0-.039-.443 1.5 1.5 0 0 0-.139-.421 1.41 1.41 0 0 0-1.04-.759 3 3 0 0 0-.443-.039l-.204-.003H10.498l-.204.003a3 3 0 0 0-.443.039c-.148.027-.286.07-.421.139a1.4 1.4 0 0 0-.619.62 1.5 1.5 0 0 0-.139.421 3 3 0 0 0-.039.443l-.003.204v1.167-.727 7.689h23.564V14.83" style="fill-rule:evenodd;clip-rule:evenodd;fill:#40c740"/></g><g class="st3"><path d="M32.194 16.972v-.242l-.003-.204a3 3 0 0 0-.039-.443 1.5 1.5 0 0 0-.139-.421 1.41 1.41 0 0 0-1.04-.759 3 3 0 0 0-.443-.039l-.204-.003H10.498l-.204.003a3 3 0 0 0-.443.039c-.148.027-.286.07-.421.139a1.4 1.4 0 0 0-.619.62 1.5 1.5 0 0 0-.139.421 3 3 0 0 0-.039.443l-.003.204v1.167-.727 7.689h23.564v-7.887" style="fill-rule:evenodd;clip-rule:evenodd;fill:#f26d5f"/></g><path d="M7.202 7.008v11.068H8.63v-7.772l.003-.204c.004-.148.013-.297.039-.443.027-.148.07-.286.139-.421a1.41 1.41 0 0 1 1.04-.757c.146-.026.295-.035.443-.039l.204-.003h19.828l.204.003c.148.004.297.013.443.039.148.027.286.07.421.139a1.4 1.4 0 0 1 .619.62c.069.135.112.273.139.421.026.146.035.295.039.443l.003.204v7.772h1.428V7.008z" style="clip-path:url(#SVGID_2_);fill-rule:evenodd;clip-rule:evenodd;fill:#d9d6cc"/><g class="st3"><path d="m26.985 17.005-.46.001q-.194 0-.387.006a6 6 0 0 0-.843.074 2.9 2.9 0 0 0-.801.264c-.033.017-.738.337-1.372 1.323-.481.749-1.417 1.543-2.727 1.543s-2.246-.794-2.727-1.543c-.667-1.039-1.428-1.351-1.373-1.323a2.8 2.8 0 0 0-.801-.264 5.6 5.6 0 0 0-.843-.074l-.387-.006-.46-.001h-6.6v9.996h26.42v-9.996z" style="fill-rule:evenodd;clip-rule:evenodd;fill:#dedbce"/></g><path d="M41.23 17.661h1.351l2.926 8.057h-1.312l-.737-2.177h-3.105l-.743 2.177h-1.312zm-.542 4.875h2.429l-1.2-3.54h-.022zM46.28 19.844h1.206v1.011h.028c.352-.698 1-1.122 1.837-1.122 1.497 0 2.457 1.173 2.457 3.048v.006c0 1.871-.966 3.048-2.44 3.048-.832 0-1.508-.424-1.854-1.105h-.028v2.943H46.28zm4.3 2.943v-.006c0-1.251-.598-2.015-1.541-2.015-.916 0-1.558.793-1.558 2.015v.006c0 1.218.648 2.01 1.558 2.01.948 0 1.541-.771 1.541-2.01M52.999 19.844h1.206v1.011h.028c.352-.698.999-1.122 1.837-1.122 1.497 0 2.457 1.173 2.457 3.048v.006c0 1.871-.966 3.048-2.44 3.048-.832 0-1.508-.424-1.854-1.105h-.028v2.943h-1.206zm4.299 2.943v-.006c0-1.251-.598-2.015-1.541-2.015-.916 0-1.558.793-1.558 2.015v.006c0 1.218.648 2.01 1.558 2.01.949 0 1.541-.771 1.541-2.01M59.59 17.661h1.207v8.057H59.59zM61.97 22.803v-.006c0-1.837 1.061-3.065 2.709-3.065s2.658 1.183 2.658 2.948v.408h-4.159c.022 1.111.631 1.758 1.591 1.758.715 0 1.19-.368 1.341-.809l.017-.045h1.144l-.011.062c-.189.932-1.095 1.781-2.518 1.781-1.727 0-2.772-1.178-2.772-3.032m1.224-.569h2.948c-.101-1.016-.67-1.513-1.457-1.513-.783 0-1.386.53-1.491 1.513M71.171 17.661h1.301l1.503 6.315h.022l1.703-6.315h1.183l1.703 6.315h.028l1.502-6.315h1.302l-2.178 8.057h-1.2l-1.731-6.075h-.029l-1.737 6.075h-1.201zM81.761 24.048v-.011c0-1.022.794-1.647 2.184-1.731l1.596-.095v-.441c0-.647-.419-1.039-1.167-1.039-.698 0-1.128.33-1.228.799l-.012.051h-1.138l.005-.062c.084-1.011.961-1.787 2.407-1.787 1.435 0 2.345.76 2.345 1.937v4.048h-1.212v-.927h-.022c-.341.631-1.021 1.033-1.798 1.033-1.172.001-1.96-.719-1.96-1.775m2.289.811c.848 0 1.491-.575 1.491-1.341v-.458l-1.435.09c-.725.044-1.128.362-1.128.859v.012c0 .513.425.838 1.072.838M88.074 17.661h1.206v8.057h-1.206zM90.979 17.661h1.206v8.057h-1.206zM93.245 22.803v-.006c0-1.837 1.06-3.065 2.708-3.065s2.659 1.183 2.659 2.948v.408h-4.16c.022 1.111.631 1.758 1.592 1.758.715 0 1.189-.368 1.34-.809l.018-.045h1.144l-.011.062c-.19.932-1.095 1.781-2.519 1.781-1.727 0-2.771-1.178-2.771-3.032m1.223-.569h2.949c-.101-1.016-.67-1.513-1.458-1.513-.782 0-1.385.53-1.491 1.513M100.142 24.171v-3.367h-.844v-.961h.844v-1.53h1.233v1.53h1.1v.961h-1.1v3.294c0 .598.269.776.776.776.129 0 .234-.012.324-.022v.932c-.14.022-.368.05-.614.05-1.161.001-1.719-.49-1.719-1.663M42.193 12.483h-2.408l-.608 1.733h-.793l2.232-6.054h.747l2.232 6.054h-.793zm-2.185-.642h1.964l-.949-2.702h-.067zM44.074 11.954c0-1.418.751-2.341 1.901-2.341.629 0 1.162.298 1.418.793h.063V7.897h.722v6.318h-.688v-.722h-.067c-.285.503-.822.801-1.448.801-1.158.001-1.901-.918-1.901-2.34m.747 0c0 1.057.495 1.691 1.322 1.691.822 0 1.33-.646 1.33-1.691 0-1.036-.512-1.691-1.33-1.691-.823 0-1.322.638-1.322 1.691M49.342 11.954c0-1.418.751-2.341 1.901-2.341.629 0 1.162.298 1.418.793h.063V7.897h.722v6.318h-.688v-.722h-.068c-.285.503-.822.801-1.448.801-1.158.001-1.9-.918-1.9-2.34m.746 0c0 1.057.495 1.691 1.322 1.691.822 0 1.33-.646 1.33-1.691 0-1.036-.512-1.691-1.33-1.691-.823 0-1.322.638-1.322 1.691M58.274 8.522v1.171h1.008v.604h-1.008v2.56c0 .533.202.759.672.759.13 0 .201-.004.336-.017v.608a2.5 2.5 0 0 1-.424.042c-.931 0-1.305-.344-1.305-1.208v-2.744h-.729v-.604h.729V8.522zM60.072 11.954c0-1.456.798-2.341 2.086-2.341s2.085.885 2.085 2.341c0 1.451-.797 2.341-2.085 2.341s-2.086-.89-2.086-2.341m3.424 0c0-1.074-.483-1.691-1.339-1.691s-1.339.617-1.339 1.691c0 1.07.482 1.691 1.339 1.691.856 0 1.339-.621 1.339-1.691" class="st9"/></svg>
                      </a>
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
  getLogoUrl(order: Order, branding: any): string | null {
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