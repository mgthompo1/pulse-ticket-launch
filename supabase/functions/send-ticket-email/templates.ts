// Email template generation service
import { Order, EmailCustomization, ThemeStyles, Ticket } from './types.ts';
import { CONFIG } from './config.ts';
import { sanitizeHtml, validateAndSanitizeUrl } from './utils.ts';

export class TemplateService {
  // Get theme-based styles with color presets
  getThemeStyles(theme: string, template?: any): ThemeStyles {
    // Get theme preset or use template colors if custom
    const themeColors = CONFIG.THEME_PRESETS[theme as keyof typeof CONFIG.THEME_PRESETS] || {
      headerColor: template?.headerColor || "#1f2937",
      backgroundColor: template?.backgroundColor || "#ffffff",
      textColor: template?.textColor || "#374151",
      buttonColor: template?.buttonColor || "#1f2937",
      accentColor: template?.accentColor || "#f9fafb",
      borderColor: template?.borderColor || "#d1d5db",
      fontFamily: template?.fontFamily || "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    };

    const baseStyles: ThemeStyles = {
      ...themeColors,
      fontFamily: themeColors.fontFamily || "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    };

    // Apply theme-specific styling
    switch (theme) {
      case 'modern':
        return { ...baseStyles, borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' };
      case 'elegant':
        return { ...baseStyles, borderRadius: '8px', border: `2px solid ${baseStyles.borderColor}` };
      case 'minimal':
        return { ...baseStyles, borderRadius: '4px', border: `1px solid ${baseStyles.borderColor}` };
      case 'creative':
        return { 
          ...baseStyles, 
          borderRadius: '16px', 
          background: `linear-gradient(135deg, ${baseStyles.backgroundColor}, ${baseStyles.accentColor}15)` 
        };
      case 'professional':
      default:
        return { ...baseStyles, borderRadius: '8px', border: `1px solid ${baseStyles.borderColor}` };
    }
  }

  // Generate email content based on order and customization
  generateEmailContent(
    order: Order,
    tickets: Ticket[],
    deliveryMethod: string,
    qrUrls: Record<string, string>
  ): { to: string; subject: string; html: string } {
    const emailCustomization = order.events.email_customization;
    
    // Use saved blocks when present; otherwise fall back to defaults
    const blocks = Array.isArray(emailCustomization?.blocks) && emailCustomization.blocks.length > 0
      ? emailCustomization.blocks
      : CONFIG.DEFAULT_EMAIL_BLOCKS;

    const html = this.renderBlocks(blocks, order, tickets, deliveryMethod, qrUrls, emailCustomization);
    
    // Generate subject line
    const subject = deliveryMethod === 'qr_ticket' 
      ? `Your tickets for ${order.events.name}` 
      : `Order confirmation for ${order.events.name}`;

    return {
      to: order.customer_email,
      subject,
      html
    };
  }

  // Render email blocks into HTML
  private renderBlocks(
    blocks: any[],
    order: Order,
    tickets: Ticket[],
    deliveryMethod: string,
    qrUrls: Record<string, string>,
    emailCustomization?: EmailCustomization
  ): string {
    const theme = this.getThemeStyles(
      emailCustomization?.template?.theme || 'professional',
      emailCustomization?.template
    );

    const branding = emailCustomization?.branding || {};
    const logoUrl = this.getLogoUrl(order, branding);
    const logoSize = CONFIG.LOGO_SIZES[(branding as any)?.logoSize as keyof typeof CONFIG.LOGO_SIZES] || CONFIG.LOGO_SIZES.medium;

    const parts: string[] = [];
    
    // Add Google Fonts import
    parts.push(`<style>
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
    </style>`);
    
    // Container
    parts.push(`<div style="font-family:'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;max-width:600px;margin:0 auto;background:${theme.backgroundColor};border:1px solid ${theme.borderColor};">`);
    
    // Header logo
    if ((branding as any)?.showLogo && (branding as any)?.logoPosition === 'header' && logoUrl) {
      parts.push(`<div style="text-align:center;margin-bottom:15px;padding:20px 20px 0 20px;">
        <img src="${logoUrl}" alt="Logo" style="max-width:${logoSize};height:auto;display:block;margin:0 auto;"/>
      </div>`);
    }
    
    // Render blocks
    for (const block of blocks) {
      if (block.hidden) continue;
      parts.push(this.renderBlock(block, order, tickets, deliveryMethod, qrUrls, theme));
    }
    
    // Footer logo
    if ((branding as any)?.showLogo && (branding as any)?.logoPosition === 'footer' && logoUrl) {
      parts.push(`<div style="text-align:center;margin-top:15px;padding:0 20px 20px 20px;">
        <img src="${logoUrl}" alt="Logo" style="max-width:${logoSize};height:auto;display:block;margin:0 auto;"/>
      </div>`);
    }
    
    parts.push('</div>');
    return parts.join('');
  }

  // Render individual email block
  private renderBlock(
    block: any,
    order: Order,
    tickets: Ticket[],
    deliveryMethod: string,
    qrUrls: Record<string, string>,
    theme: ThemeStyles
  ): string {
    switch (block.type) {
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
        return deliveryMethod === 'qr_ticket' 
          ? this.renderTicketList(tickets, qrUrls, theme)
          : this.renderOrderSummary(order, theme);

      case 'button':
        return this.renderButton(block, theme);

      default:
        return '';
    }
  }

  // Render event details block
  private renderEventDetails(order: Order, theme: ThemeStyles): string {
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

  // Render ticket list with QR codes
  private renderTicketList(tickets: Ticket[], qrUrls: Record<string, string>, theme: ThemeStyles): string {
    if (tickets.length === 0) return '';

    const ticketHtml = tickets.map((ticket, index) => {
      const qrUrl = qrUrls[ticket.code];
      const qrImg = qrUrl 
        ? `<img src="${qrUrl}" alt="QR Code" style="width:100px;height:100px;margin-top:8px;border:1px solid ${theme.borderColor};border-radius:4px;"/>` 
        : '';

      return `<div style="border:1px solid ${theme.borderColor};border-radius:8px;padding:16px;margin:8px 0;background:${theme.backgroundColor};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-weight:600;color:${theme.headerColor};margin-bottom:8px;">${ticket.type}</div>
            <div style="color:${theme.textColor};font-size:14px;margin-bottom:4px;">Ticket #${index + 1}</div>
            <div style="color:${theme.textColor};font-size:12px;font-family:monospace;background:${theme.accentColor};padding:8px;border-radius:4px;word-break:break-all;">
              ${ticket.code}
            </div>
          </div>
          ${qrImg ? `<div style="margin-left:16px;text-align:center;">${qrImg}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div style="margin:16px 20px;">
      <h3 style="color:${theme.headerColor};margin-bottom:16px;font-family:'Manrope', sans-serif;">Your Tickets</h3>
      ${ticketHtml}
    </div>`;
  }

  // Render order summary for confirmation emails
  private renderOrderSummary(order: Order, theme: ThemeStyles): string {
    const itemsHtml = order.order_items.map(item => {
      const name = item.item_type === 'ticket' 
        ? item.ticket_types?.name || 'General Admission'
        : item.merchandise?.name || 'Merchandise';
      
      return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${theme.borderColor};">
        <div>
          <div style="font-weight:600;color:${theme.textColor};">${name}</div>
          <div style="color:${theme.textColor};font-size:14px;">Quantity: ${item.quantity}</div>
        </div>
        <div style="color:${theme.textColor};font-weight:600;">$${(item.unit_price * item.quantity).toFixed(2)}</div>
      </div>`;
    }).join('');

    return `<div style="margin:16px 20px;">
      <h3 style="color:${theme.headerColor};margin-bottom:16px;font-family:'Manrope', sans-serif;">Order Summary</h3>
      <div style="border:1px solid ${theme.borderColor};border-radius:8px;padding:16px;background:${theme.backgroundColor};">
        ${itemsHtml}
        <div style="display:flex;justify-content:space-between;padding:16px 0 8px 0;font-weight:600;color:${theme.headerColor};border-top:2px solid ${theme.borderColor};margin-top:16px;">
          <div>Total</div>
          <div>$${order.total_amount.toFixed(2)}</div>
        </div>
      </div>
    </div>`;
  }

  // Render button block
  private renderButton(block: any, theme: ThemeStyles): string {
    if (!block.url || block.url === '#') return '';

    try {
      const safeUrl = validateAndSanitizeUrl(block.url);
      const alignment = block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : 'center';
      
      return `<div style="padding:16px 20px;text-align:${alignment};">
        <a href="${safeUrl}" style="display:inline-block;background:${theme.buttonColor};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-family:'Manrope', sans-serif;">
          ${sanitizeHtml(block.label || 'Click Here')}
        </a>
      </div>`;
    } catch (error) {
      // Skip invalid URLs
      return '';
    }
  }

  // Get logo URL based on branding configuration
  private getLogoUrl(order: Order, branding: any): string | null {
    if (!(branding as any)?.showLogo) return null;

    const logoSource = (branding as any)?.logoSource || 'event';
    
    switch (logoSource) {
      case 'organization':
        return (order.events.organizations as any)?.logo_url || null;
      case 'custom':
        return (branding as any)?.customLogoUrl || null;
      case 'event':
      default:
        return order.events.logo_url || (order.events.organizations as any)?.logo_url || null;
    }
  }
}
