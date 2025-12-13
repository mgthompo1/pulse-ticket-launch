// Unified email rendering service that works for both preview and production
import type { EmailTemplate, EmailBlock } from '@/types/email-template';

interface ThemeStyles {
  headerColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  accentColor?: string;
  borderColor?: string;
  fontFamily?: string;
  borderRadius?: string;
  boxShadow?: string;
  border?: string;
  background?: string;
}

interface OrderData {
  events: {
    name: string;
    venue?: string;
    event_date: string;
    logo_url?: string;
    organizations: {
      name: string;
      logo_url?: string;
    };
  };
  customer_email: string;
  customer_name?: string;
  total_amount: number;
  order_items: Array<{
    item_type: string;
    quantity: number;
    unit_price: number;
    ticket_types?: { name: string };
    merchandise?: { name: string };
  }>;
}

interface TicketData {
  code: string;
  type: string;
}

interface BrandingConfig {
  showLogo?: boolean;
  logoPosition?: 'header' | 'footer';
  logoSize?: 'small' | 'medium' | 'large';
  logoSource?: 'event' | 'organization' | 'custom';
  customLogoUrl?: string;
}

interface PaymentData {
  brand: string;
  last4: string;
  type: string;
}

// Theme presets matching the backend config
const THEME_PRESETS = {
  professional: {
    headerColor: "#0f172a",
    backgroundColor: "#ffffff", 
    textColor: "#334155",
    buttonColor: "#0f172a",
    accentColor: "#f8fafc",
    borderColor: "#e2e8f0",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  modern: {
    headerColor: "#1e40af",
    backgroundColor: "#ffffff",
    textColor: "#1e293b", 
    buttonColor: "#2563eb",
    accentColor: "#eff6ff",
    borderColor: "#bfdbfe",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  elegant: {
    headerColor: "#581c87",
    backgroundColor: "#ffffff",
    textColor: "#374151",
    buttonColor: "#7c3aed", 
    accentColor: "#faf5ff",
    borderColor: "#d8b4fe",
    fontFamily: "'Georgia', serif"
  },
  minimal: {
    headerColor: "#18181b",
    backgroundColor: "#ffffff",
    textColor: "#3f3f46",
    buttonColor: "#18181b",
    accentColor: "#fafafa",
    borderColor: "#e4e4e7",
    fontFamily: "'system-ui', -apple-system, sans-serif"
  },
  creative: {
    headerColor: "#be185d",
    backgroundColor: "#ffffff",
    textColor: "#374151",
    buttonColor: "#ec4899",
    accentColor: "#fdf2f8", 
    borderColor: "#f9a8d4",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  }
};

const LOGO_SIZES = {
  small: '80px',
  medium: '120px',
  large: '150px'
};

// Icons matching backend (using Unicode text variants)
const ICONS = {
  calendar: '📅\uFE0E',
  mapPin: '⌖',
  user: '👤\uFE0E',
  ticket: '🎟\uFE0E',
  card: '💳\uFE0E'
};

export class EmailRenderer {
  private getThemeStyles(theme: string, customTemplate?: any): ThemeStyles {
    const preset = THEME_PRESETS[theme as keyof typeof THEME_PRESETS];
    const baseStyles = preset || THEME_PRESETS.professional;
    
    // Override with custom template colors if provided
    if (customTemplate) {
      Object.keys(baseStyles).forEach(key => {
        if (customTemplate[key]) {
          (baseStyles as any)[key] = customTemplate[key];
        }
      });
    }

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
      default:
        return { ...baseStyles, borderRadius: '8px', border: `1px solid ${baseStyles.borderColor}` };
    }
  }

  private getLogoUrl(orderData: OrderData, branding: BrandingConfig): string | null {
    // If showLogo is explicitly false, don't show any logo
    if (branding.showLogo === false) return null;
    
    // Default to showing logo if not specified
    const showLogo = branding.showLogo !== false;
    if (!showLogo) return null;
    
    const logoSource = branding.logoSource || 'event';
    
    switch (logoSource) {
      case 'organization':
        return orderData.events.organizations.logo_url || null;
      case 'custom':
        return branding.customLogoUrl || null;
      case 'event':
      default: {
        // Always prioritize event logo first, then fall back to organization logo
        const eventLogo = orderData.events.logo_url?.trim();
        const orgLogo = orderData.events.organizations.logo_url?.trim();
        return eventLogo || orgLogo || null;
      }
    }
  }

  private sanitizeHtml(html: string): string {
    if (!html) return '';

    // First, decode any HTML entities that might be used to bypass filters
    const decoded = html
      .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

    // Comprehensive HTML sanitization to prevent XSS
    let sanitized = decoded
      // Remove potentially dangerous tags (including self-closing variants)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script\b[^>]*\/?>/gi, '')
      .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<iframe\b[^>]*\/?>/gi, '')
      .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
      .replace(/<object\b[^>]*\/?>/gi, '')
      .replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, '')
      .replace(/<embed\b[^>]*\/?>/gi, '')
      .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
      .replace(/<form\b[^>]*\/?>/gi, '')
      .replace(/<input\b[^>]*\/?>/gi, '')
      .replace(/<textarea\b[^>]*>[\s\S]*?<\/textarea>/gi, '')
      .replace(/<select\b[^>]*>[\s\S]*?<\/select>/gi, '')
      .replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, '')
      .replace(/<link\b[^>]*\/?>/gi, '')
      .replace(/<meta\b[^>]*\/?>/gi, '')
      .replace(/<base\b[^>]*\/?>/gi, '')
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/<math\b[^>]*>[\s\S]*?<\/math>/gi, '')
      // Remove event handlers (comprehensive pattern)
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '')
      // Remove javascript:, data:, and vbscript: protocols
      .replace(/href\s*=\s*["']?\s*(?:javascript|data|vbscript):[^"'\s>]*/gi, 'href="#"')
      .replace(/src\s*=\s*["']?\s*(?:javascript|data|vbscript):[^"'\s>]*/gi, 'src=""')
      .replace(/action\s*=\s*["']?\s*(?:javascript|data|vbscript):[^"'\s>]*/gi, '')
      // Remove dangerous CSS (expression, behavior, -moz-binding, etc.)
      .replace(/style\s*=\s*["'][^"']*(?:expression|behavior|javascript|-moz-binding|@import)[^"']*["']/gi, '')
      // Remove style tags entirely
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      // Allow only safe tags for basic formatting
      .replace(/<(?!\/?(?:p|br|strong|b|em|i|u|ul|ol|li|h[1-6]|div|span|a|table|tr|td|th|thead|tbody|tfoot)\b)[^>]*>/gi, '');

    // Escape special characters in text content (but preserve allowed HTML tags)
    // Only escape ampersands that aren't already part of entities
    sanitized = sanitized.replace(/&(?!(?:amp|lt|gt|quot|#x?[0-9a-fA-F]+);)/g, '&amp;');

    return sanitized;
  }

  // Replace personalization variables with actual or sample values
  private replacePersonalizationVariables(
    text: string,
    orderData: OrderData,
    tickets: TicketData[]
  ): string {
    if (!text) return '';

    const eventDate = new Date(orderData.events.event_date);
    const now = new Date();
    const diffTime = eventDate.getTime() - now.getTime();
    const daysUntil = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const hoursUntil = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60)));

    const firstName = orderData.customer_name?.split(' ')[0] || 'Customer';
    const lastName = orderData.customer_name?.split(' ').slice(1).join(' ') || '';

    const variables: Record<string, string> = {
      '@FirstName': firstName,
      '@LastName': lastName,
      '@FullName': orderData.customer_name || orderData.customer_email,
      '@EventName': orderData.events.name,
      '@EventDate': eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      '@EventTime': eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      '@EventVenue': orderData.events.venue || 'Venue TBA',
      '@OrderNumber': 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      '@TotalAmount': `$${orderData.total_amount.toFixed(2)}`,
      '@TicketCount': String(tickets.length),
      '@OrganizerName': orderData.events.organizations.name,
      '@ContactEmail': 'support@example.com',
      '@DaysUntilEvent': String(daysUntil),
      '@HoursUntilEvent': String(hoursUntil),
      '@EventCountdown': daysUntil > 0 ? `${daysUntil} days` : `${hoursUntil} hours`,
      '@VenueAddress': orderData.events.venue || 'Address TBA',
      '@CheckInTime': eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      '@DoorOpenTime': new Date(eventDate.getTime() - 30 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      '@AttendeeCount': String(tickets.length),
      '@TicketTypes': [...new Set(tickets.map(t => t.type))].join(', ') || 'General Admission',
    };

    let result = text;
    for (const [variable, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(variable.replace('@', '@'), 'g'), value);
    }

    return result;
  }

  private sanitizeUrl(url: string): string {
    if (!url) return '#';
    
    // Only allow safe protocols
    const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    try {
      const parsedUrl = new URL(url);
      if (safeProtocols.includes(parsedUrl.protocol)) {
        return url;
      }
    } catch {
      // If URL parsing fails, check for relative URLs
      if (url.startsWith('/') || url.startsWith('#')) {
        return url;
      }
    }
    
    return '#'; // Fallback to safe URL
  }

  renderBlock(
    block: EmailBlock,
    orderData: OrderData,
    tickets: TicketData[],
    deliveryMethod: string,
    theme: ThemeStyles,
    paymentData?: PaymentData
  ): string {
    switch (block.type) {
      case 'header': {
        const headerBlock = block as any;
        const title = this.replacePersonalizationVariables(
          this.sanitizeHtml(headerBlock.title || 'Thank you'),
          orderData,
          tickets
        );
        const subtitle = headerBlock.subtitle
          ? this.replacePersonalizationVariables(this.sanitizeHtml(headerBlock.subtitle), orderData, tickets)
          : '';
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${theme.headerColor};">
          <tr>
            <td style="padding:20px;text-align:center;" class="email-content mobile-padding">
              <h1 style="margin:0;color:#fff;font-family:'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;font-weight:600;font-size:24px;" class="mobile-font-size">
                ${title}
              </h1>
              ${subtitle ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${subtitle}</p>` : ''}
            </td>
          </tr>
        </table>`;
      }

      case 'text': {
        const textBlock = block as any;
        const content = this.replacePersonalizationVariables(
          this.sanitizeHtml(textBlock.html || ''),
          orderData,
          tickets
        );
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:16px 20px;color:${theme.textColor};line-height:1.6;" class="email-content mobile-padding mobile-font-size">
              ${content}
            </td>
          </tr>
        </table>`;
      }

      case 'event_details':
        return this.renderEventDetails(orderData, theme);

      case 'ticket_list':
        return deliveryMethod === 'confirmation_email' 
          ? this.renderOrderSummary(orderData, theme)
          : this.renderTicketList(tickets, theme);

      case 'payment_summary':
        return this.renderPaymentSummary(orderData, theme, paymentData);

      case 'button':
        return this.renderButton(block as any, theme, deliveryMethod);

      case 'divider':
        return `<hr style="border:0;border-top:1px solid ${theme.borderColor};margin:16px 20px;" />`;

      case 'image': {
        const imageBlock = block as any;
        if (!imageBlock.src) return '';
        const alignment = imageBlock.align || 'center';
        return `<div style="padding:16px 20px;text-align:${alignment};">
          <img src="${imageBlock.src}" alt="${this.sanitizeHtml(imageBlock.alt || '')}" style="max-width:100%;height:auto;" />
        </div>`;
      }

      case 'footer': {
        const footerBlock = block as any;
        const footerText = this.replacePersonalizationVariables(
          this.sanitizeHtml(footerBlock.text || ''),
          orderData,
          tickets
        );
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${theme.accentColor};border-top:1px solid ${theme.borderColor};">
          <tr>
            <td style="padding:16px;text-align:center;">
              <small style="color:#999;">${footerText}</small>
            </td>
          </tr>
        </table>`;
      }

      case 'calendar_button':
        return this.renderCalendarButton(block as any, orderData, theme);

      case 'qr_tickets':
        return this.renderQRTickets(tickets, theme, block as any);

      case 'order_management':
        return this.renderOrderManagement(block as any, theme, orderData);

      case 'social_links':
        return this.renderSocialLinks(block as any, theme);

      case 'custom_message':
        return this.renderCustomMessage(block as any, theme, orderData, tickets);

      case 'next_steps':
        return this.renderNextSteps(block as any, theme);

      case 'registration_details':
        return this.renderRegistrationDetails(orderData, theme);

      // Reminder email specific blocks
      case 'event_countdown':
        return this.renderEventCountdown(block as any, orderData, theme);
      case 'attendance_info':
        return this.renderAttendanceInfo(block as any, orderData, theme);
      case 'important_updates':
        return this.renderImportantUpdates(block as any, theme);
      case 'venue_directions':
        return this.renderVenueDirections(block as any, orderData, theme);
      case 'check_in_info':
        return this.renderCheckInInfo(block as any, theme);
      case 'weather_info':
        return this.renderWeatherInfo(block as any, theme);
      case 'recommended_items':
        return this.renderRecommendedItems(block as any, theme);

      default:
        return '';
    }
  }

  private renderEventDetails(orderData: OrderData, theme: ThemeStyles): string {
    const eventDate = new Date(orderData.events.event_date);
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

    return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:8px;">
            <tr>
              <td style="padding:16px;">
                <strong style="color:${theme.textColor};font-size:18px;">${this.sanitizeHtml(orderData.events.name)}</strong>

                <!-- Date/Time Row -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
                  <tr>
                    <td style="padding:12px;background:${theme.backgroundColor};border-radius:8px;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align:top;padding-right:12px;font-size:16px;color:${theme.textColor};">${ICONS.calendar}</td>
                          <td>
                            <div style="font-weight:600;color:${theme.headerColor};">${formattedDate}</div>
                            <div style="color:${theme.textColor};margin-top:4px;font-size:14px;">${formattedTime}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                ${orderData.events.venue ? `
                <!-- Venue Row -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                  <tr>
                    <td style="padding:12px;background:${theme.backgroundColor};border-radius:8px;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align:top;padding-right:12px;font-size:16px;color:${theme.textColor};">${ICONS.mapPin}</td>
                          <td>
                            <div style="font-weight:600;color:${theme.headerColor};">Venue</div>
                            <div style="color:${theme.textColor};margin-top:4px;font-size:14px;">${this.sanitizeHtml(orderData.events.venue)}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                ` : ''}

                <!-- Customer Row -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                  <tr>
                    <td style="padding:12px;background:${theme.backgroundColor};border-radius:8px;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align:top;padding-right:12px;font-size:16px;color:${theme.textColor};">${ICONS.user}</td>
                          <td>
                            <div style="font-weight:600;color:${theme.headerColor};">Customer</div>
                            <div style="color:${theme.textColor};margin-top:4px;font-size:14px;">${this.sanitizeHtml(orderData.customer_name || orderData.customer_email)}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  private renderTicketList(tickets: TicketData[], theme: ThemeStyles): string {
    if (tickets.length === 0) return '';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yoxsewbpoqxscsutqlcb.supabase.co';
    const appleWalletBadge = `${supabaseUrl}/storage/v1/object/public/event-logos/add-to-apple-wallet.png`;

    const ticketHtml = tickets.map((ticket, index) => {
      return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
        <tr>
          <td style="border:1px solid ${theme.borderColor};border-radius:8px;padding:16px;background:${theme.backgroundColor};">
            <div style="font-weight:600;color:${theme.headerColor};margin-bottom:8px;">${this.sanitizeHtml(ticket.type)}</div>
            <div style="color:${theme.textColor};font-size:14px;margin-bottom:4px;">Ticket #${index + 1}</div>
            <div style="color:${theme.textColor};font-size:12px;font-family:monospace;background:${theme.accentColor};padding:8px;border-radius:4px;word-break:break-all;margin-bottom:12px;">
              ${this.sanitizeHtml(ticket.code)}
            </div>
            <!-- Add to Apple Wallet button -->
            <a href="#" style="display:inline-block;text-decoration:none;line-height:0;">
              <img src="${appleWalletBadge}" width="120" height="40" alt="Add to Apple Wallet" style="display:block;border:0;outline:none;"/>
            </a>
          </td>
        </tr>
      </table>`;
    }).join('');

    return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:16px 20px;">
          <h3 style="color:${theme.headerColor};margin:0 0 16px;font-family:'Manrope', sans-serif;">Your Tickets</h3>
          ${ticketHtml}
        </td>
      </tr>
    </table>`;
  }

  private renderOrderSummary(orderData: OrderData, theme: ThemeStyles): string {
    const itemsHtml = orderData.order_items.map(item => {
      const name = item.item_type === 'ticket'
        ? item.ticket_types?.name || 'General Admission'
        : item.merchandise?.name || 'Merchandise';

      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid ${theme.borderColor};">
          <div style="font-weight:600;color:${theme.textColor};">${this.sanitizeHtml(name)}</div>
          <div style="color:${theme.textColor};font-size:14px;">Quantity: ${item.quantity}</div>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid ${theme.borderColor};text-align:right;vertical-align:top;">
          <div style="color:${theme.textColor};font-weight:600;">$${(item.unit_price * item.quantity).toFixed(2)}</div>
        </td>
      </tr>`;
    }).join('');

    return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:16px 20px;">
          <h3 style="color:${theme.headerColor};margin:0 0 16px;font-family:'Manrope', sans-serif;">Order Summary</h3>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${theme.borderColor};border-radius:8px;background:${theme.backgroundColor};">
            <tr>
              <td style="padding:16px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${itemsHtml}
                  <tr>
                    <td style="padding:16px 0 8px 0;font-weight:600;color:${theme.headerColor};border-top:2px solid ${theme.borderColor};">Total</td>
                    <td style="padding:16px 0 8px 0;font-weight:600;color:${theme.headerColor};border-top:2px solid ${theme.borderColor};text-align:right;">$${orderData.total_amount.toFixed(2)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  private renderPaymentSummary(orderData: OrderData, theme: ThemeStyles, paymentData?: PaymentData): string {
    if (!paymentData || !paymentData.last4) {
      return '';
    }

    return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:8px;">
            <tr>
              <td style="padding:16px;">
                <h3 style="color:${theme.headerColor};margin:0 0 16px;font-family:'Manrope', sans-serif;">Payment Summary</h3>

                <!-- Payment Method -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                  <tr>
                    <td style="padding:12px;background:${theme.backgroundColor};border-radius:8px;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align:top;padding-right:12px;font-size:16px;color:${theme.textColor};">${ICONS.card}</td>
                          <td>
                            <div style="font-weight:600;color:${theme.headerColor};">Payment Method</div>
                            <div style="color:${theme.textColor};margin-top:4px;font-size:14px;">${this.sanitizeHtml(paymentData.brand)} ending in ${this.sanitizeHtml(paymentData.last4)}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Total Paid -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:12px;background:${theme.backgroundColor};border-radius:8px;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align:top;padding-right:12px;font-size:16px;">💰</td>
                          <td>
                            <div style="font-weight:600;color:${theme.headerColor};">Total Paid</div>
                            <div style="color:${theme.textColor};margin-top:4px;font-size:14px;">$${orderData.total_amount.toFixed(2)}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  private renderButton(block: any, theme: ThemeStyles, deliveryMethod?: string): string {
    const safeUrl = this.sanitizeUrl(block.url);
    if (safeUrl === '#' && !block.url) return '';

    const alignment = block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : 'center';

    // Customize button text based on delivery method
    let buttonText = block.label || 'Click Here';

    if (block.label && block.label.toLowerCase().includes('view tickets')) {
      if (deliveryMethod === 'confirmation_email' || deliveryMethod === 'email_confirmation_only' || deliveryMethod === 'email_confirmation') {
        buttonText = 'View Registration Confirmation';
      }
    }

    return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:16px 20px;text-align:${alignment};" class="email-content mobile-padding mobile-text-center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="14%" stroke="f" fillcolor="${theme.buttonColor}">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;">${this.sanitizeHtml(buttonText)}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${safeUrl}" style="display:inline-block;background:${theme.buttonColor};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-family:'Manrope', sans-serif;min-width:120px;" class="mobile-button">
            ${this.sanitizeHtml(buttonText)}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
  }

  private renderCalendarButton(block: any, orderData: OrderData, theme: ThemeStyles): string {
    const eventDate = new Date(orderData.events.event_date);
    const startTime = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = new Date(eventDate.getTime() + (2 * 60 * 60 * 1000)).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; // 2 hours duration
    
    const calendarParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: orderData.events.name,
      dates: `${startTime}/${endTime}`,
      details: `Event: ${orderData.events.name}${orderData.events.venue ? `\nVenue: ${orderData.events.venue}` : ''}`,
      location: orderData.events.venue || '',
      sf: 'true',
      output: 'xml'
    });
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?${calendarParams.toString()}`;
    const alignment = block.align || 'center';
    const label = block.label || 'Add to Calendar';
    const showIcon = block.showIcon !== false;
    
    return `<div style="padding:16px 20px;text-align:${alignment};" class="email-content mobile-padding mobile-text-center">
      <a href="${googleCalendarUrl}" style="display:inline-block;background:${theme.accentColor};color:${theme.textColor};border:2px solid ${theme.borderColor};padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-family:'Manrope', sans-serif;min-width:120px;" class="mobile-button">
        ${showIcon ? '📅 ' : ''}${this.sanitizeHtml(label)}
      </a>
    </div>`;
  }

  private renderQRTickets(tickets: TicketData[], theme: ThemeStyles, block: any): string {
    if (tickets.length === 0) return '';

    const layout = block.layout || 'grid';
    const showInline = block.showInline !== false;
    const includeBarcode = block.includeBarcode === true;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yoxsewbpoqxscsutqlcb.supabase.co';
    const appleWalletBadge = `${supabaseUrl}/storage/v1/object/public/event-logos/add-to-apple-wallet.png`;

    if (!showInline) {
      return `<div style="margin:16px 20px;padding:16px;background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:8px;text-align:center;">
        <h3 style="color:${theme.headerColor};margin-bottom:8px;font-family:'Manrope', sans-serif;">Your QR Tickets</h3>
        <p style="color:${theme.textColor};font-size:14px;margin:0;">QR codes will be attached as separate files to this email.</p>
      </div>`;
    }

    const ticketStyle = layout === 'grid'
      ? 'display:inline-block;margin:8px;vertical-align:top;'
      : 'display:block;margin:8px 0;';

    const ticketHtml = tickets.map((ticket, index) => {
      return `<div style="${ticketStyle}border:1px solid ${theme.borderColor};border-radius:8px;padding:16px;background:${theme.backgroundColor};text-align:center;min-width:200px;">
        <div style="font-weight:600;color:${theme.headerColor};margin-bottom:8px;">${this.sanitizeHtml(ticket.type)}</div>
        <div style="color:${theme.textColor};font-size:14px;margin-bottom:8px;">Ticket #${index + 1}</div>
        <div style="width:100px;height:100px;background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:4px;margin:8px auto;display:flex;align-items:center;justify-content:center;color:${theme.textColor};font-size:12px;">
          QR Code<br/>Preview
        </div>
        <div style="color:${theme.textColor};font-size:10px;font-family:monospace;background:${theme.accentColor};padding:4px;border-radius:4px;word-break:break-all;margin-top:8px;margin-bottom:12px;">
          ${this.sanitizeHtml(ticket.code)}
        </div>
        <!-- Add to Apple Wallet button -->
        <a href="#" style="display:inline-block;text-decoration:none;line-height:0;">
          <img src="${appleWalletBadge}" width="110" height="36" alt="Add to Apple Wallet" style="display:inline-block;border:0;outline:none;"/>
        </a>
      </div>`;
    }).join('');

    return `<div style="margin:16px 20px;">
      <h3 style="color:${theme.headerColor};margin-bottom:16px;font-family:'Manrope', sans-serif;">Your QR Tickets</h3>
      <div style="text-align:center;">
        ${ticketHtml}
      </div>
    </div>`;
  }

  private renderOrderManagement(block: any, theme: ThemeStyles, orderData: OrderData): string {
    const showViewOrder = block.showViewOrder !== false;
    const showModifyOrder = block.showModifyOrder === true;
    const showCancelOrder = block.showCancelOrder === true;
    const customText = block.customText || 'Need help with your order?';

    // Generate ticket URL (preview uses sample data)
    const ticketsUrl = `https://www.ticketflo.org/tickets?orderId=sample&email=${encodeURIComponent(orderData.customer_email)}`;

    const buttons = [];

    if (showViewOrder) {
      buttons.push(`<a href="${ticketsUrl}" style="display:inline-block;margin:4px;background:${theme.buttonColor};color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;font-size:14px;">View Order</a>`);
    }

    if (showModifyOrder) {
      buttons.push(`<a href="${ticketsUrl}" style="display:inline-block;margin:4px;background:${theme.accentColor};color:${theme.textColor};border:1px solid ${theme.borderColor};padding:8px 16px;text-decoration:none;border-radius:4px;font-size:14px;">Modify Order</a>`);
    }

    if (showCancelOrder) {
      buttons.push(`<a href="${ticketsUrl}" style="display:inline-block;margin:4px;background:#ef4444;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;font-size:14px;">Cancel Order</a>`);
    }

    if (buttons.length === 0) return '';

    return `<div style="margin:16px 20px;padding:16px;background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:8px;text-align:center;">
      <p style="color:${theme.textColor};margin-bottom:12px;font-weight:500;">${this.sanitizeHtml(customText)}</p>
      <div>
        ${buttons.join('')}
      </div>
    </div>`;
  }

  private renderSocialLinks(block: any, theme: ThemeStyles): string {
    const platforms = block.platforms || {};
    const alignment = block.align || 'center';
    const style = block.style || 'icons';
    
    const socialLinks = [];
    
    if (platforms.facebook) {
      const content = style === 'icons' ? '📘' : 'Facebook';
      socialLinks.push(`<a href="${this.sanitizeUrl(platforms.facebook)}" style="display:inline-block;margin:0 8px;color:${theme.textColor};text-decoration:none;">${content}</a>`);
    }
    
    if (platforms.twitter) {
      const content = style === 'icons' ? '🐦' : 'Twitter';
      socialLinks.push(`<a href="${this.sanitizeUrl(platforms.twitter)}" style="display:inline-block;margin:0 8px;color:${theme.textColor};text-decoration:none;">${content}</a>`);
    }
    
    if (platforms.instagram) {
      const content = style === 'icons' ? '📷' : 'Instagram';
      socialLinks.push(`<a href="${this.sanitizeUrl(platforms.instagram)}" style="display:inline-block;margin:0 8px;color:${theme.textColor};text-decoration:none;">${content}</a>`);
    }
    
    if (platforms.linkedin) {
      const content = style === 'icons' ? '💼' : 'LinkedIn';
      socialLinks.push(`<a href="${this.sanitizeUrl(platforms.linkedin)}" style="display:inline-block;margin:0 8px;color:${theme.textColor};text-decoration:none;">${content}</a>`);
    }
    
    if (platforms.website) {
      const content = style === 'icons' ? '🌐' : 'Website';
      socialLinks.push(`<a href="${this.sanitizeUrl(platforms.website)}" style="display:inline-block;margin:0 8px;color:${theme.textColor};text-decoration:none;">${content}</a>`);
    }
    
    if (socialLinks.length === 0) return '';
    
    return `<div style="padding:16px 20px;text-align:${alignment};">
      <div style="color:${theme.textColor};font-size:14px;">
        ${socialLinks.join('')}
      </div>
    </div>`;
  }

  private renderCustomMessage(block: any, theme: ThemeStyles, orderData?: OrderData, tickets?: TicketData[]): string {
    const message = block.message || block.markdown || '';
    if (!message) return '';

    const content = orderData && tickets
      ? this.replacePersonalizationVariables(this.sanitizeHtml(message), orderData, tickets)
      : this.sanitizeHtml(message);

    return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:8px;">
            <tr>
              <td style="padding:16px;color:${theme.textColor};line-height:1.6;">
                ${content}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  private renderNextSteps(block: any, theme: ThemeStyles): string {
    const steps = block.steps || [];
    const title = block.title || 'What\'s Next?';
    const showIcons = block.showIcons !== false;
    
    if (steps.length === 0) return '';
    
    const stepsHtml = steps.map((step: string, index: number) => {
      const icon = showIcons ? `${index + 1}️⃣ ` : `${index + 1}. `;
      return `<li style="margin:8px 0;color:${theme.textColor};line-height:1.5;">
        ${icon}${this.sanitizeHtml(step)}
      </li>`;
    }).join('');
    
    return `<div style="margin:16px 20px;padding:16px;background:${theme.accentColor};border:1px solid ${theme.borderColor};border-radius:8px;">
      <h3 style="color:${theme.headerColor};margin-bottom:12px;font-family:'Manrope', sans-serif;">${this.sanitizeHtml(title)}</h3>
      <ul style="margin:0;padding-left:0;list-style:none;">
        ${stepsHtml}
      </ul>
    </div>`;
  }

  private renderRegistrationDetails(orderData: OrderData, theme: ThemeStyles): string {
    const itemsHtml = orderData.order_items.map(item => {
      const name = item.item_type === 'ticket' 
        ? item.ticket_types?.name || 'General Admission'
        : item.merchandise?.name || 'Merchandise';
      
      return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${theme.borderColor};">
        <div>
          <div style="font-weight:600;color:${theme.textColor};">${this.sanitizeHtml(name)}</div>
          <div style="color:${theme.textColor};font-size:14px;">Quantity: ${item.quantity}</div>
        </div>
        <div style="color:${theme.textColor};font-weight:600;">$${(item.unit_price * item.quantity).toFixed(2)}</div>
      </div>`;
    }).join('');

    return `<div style="margin:16px 20px;">
      <h3 style="color:${theme.headerColor};margin-bottom:16px;font-family:'Manrope', sans-serif;">Registration Details</h3>
      <div style="border:1px solid ${theme.borderColor};border-radius:8px;padding:16px;background:${theme.backgroundColor};">
        ${itemsHtml}
        <div style="display:flex;justify-content:space-between;padding:16px 0 8px 0;font-weight:600;color:${theme.headerColor};border-top:2px solid ${theme.borderColor};margin-top:16px;">
          <div>Total</div>
          <div>$${orderData.total_amount.toFixed(2)}</div>
        </div>
      </div>
    </div>`;
  }

  public renderEmailHtml(
    template: EmailTemplate,
    orderData: OrderData,
    tickets: TicketData[],
    deliveryMethod: string,
    branding: BrandingConfig = {},
    paymentData?: PaymentData
  ): string {
    const theme = this.getThemeStyles(template.theme.headerColor ? 'custom' : 'professional', template.theme);
    const logoUrl = this.getLogoUrl(orderData, branding);
    const logoSize = LOGO_SIZES[branding.logoSize as keyof typeof LOGO_SIZES] || LOGO_SIZES.medium;

    const parts: string[] = [];
    
    // Add comprehensive responsive meta and styles
    parts.push(`<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
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
            padding: 10px !important;
          }
          .mobile-text-center {
            text-align: center !important;
          }
          .mobile-full-width {
            width: 100% !important;
            display: block !important;
          }
          .mobile-hide {
            display: none !important;
          }
          .mobile-font-size {
            font-size: 14px !important;
            line-height: 1.5 !important;
          }
          .mobile-button {
            width: 90% !important;
            padding: 15px 20px !important;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .dark-mode-bg { background-color: #1a1a1a !important; }
          .dark-mode-text { color: #ffffff !important; }
          .dark-mode-border { border-color: #333333 !important; }
        }
        
        /* Outlook specific fixes */
        <!--[if gte mso 9]>
        <style>
          .outlook-fix { width: 600px; }
          .outlook-table { border-collapse: collapse; }
        </style>
        <![endif]-->
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:${theme.accentColor || '#f9fafb'};">
      <!-- Preheader text (hidden but appears in email preview) -->
      <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        Your ticket confirmation and event details
      </div>`);
    
    // Container with full mobile responsiveness
    parts.push(`<div class="email-container" style="font-family:'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;max-width:600px;margin:0 auto;background:${theme.backgroundColor};border:1px solid ${theme.borderColor};box-shadow:0 2px 8px rgba(0,0,0,0.08);border-radius:8px;">
      <!--[if mso | IE]>
      <table class="outlook-fix outlook-table" align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;">
        <tr>
          <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
      <![endif]-->`);
      
    // Header logo
    if (branding.showLogo && branding.logoPosition === 'header' && logoUrl) {
      parts.push(`<div style="text-align:center;margin-bottom:15px;padding:20px 20px 0 20px;">
        <img src="${logoUrl}" alt="Logo" style="max-width:${logoSize};height:auto;display:block;margin:0 auto;"/>
      </div>`);
    }
    
    // Render blocks
    for (const block of template.blocks) {
      if ((block as any).hidden) continue;
      parts.push(this.renderBlock(block, orderData, tickets, deliveryMethod, theme, paymentData));
    }
    
    // Footer logo
    if (branding.showLogo && branding.logoPosition === 'footer' && logoUrl) {
      parts.push(`<div style="text-align:center;margin-top:15px;padding:0 20px 20px 20px;" class="mobile-padding">
        <img src="${logoUrl}" alt="Logo" style="max-width:${logoSize};height:auto;display:block;margin:0 auto;" class="mobile-full-width"/>
      </div>`);
    }
    
    // Close HTML structure
    parts.push(`
      <!--[if mso | IE]>
          </td>
        </tr>
      </table>
      <![endif]-->
    </div>
    </body>
    </html>`);
    
    return parts.join('');
  }

  // Reminder email specific render methods
  private renderEventCountdown(block: any, orderData: OrderData, theme: ThemeStyles): string {
    const eventDate = new Date(orderData.events.event_date);
    const now = new Date();
    const diffTime = eventDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.ceil(diffTime / (1000 * 60 * 60));

    const align = block.align || 'center';
    const customText = this.sanitizeHtml(block.customText || 'Don\'t miss out!');
    const urgencyThreshold = block.urgencyThreshold || 3;
    const isUrgent = daysUntil <= urgencyThreshold;

    const bgColor = isUrgent ? '#fef2f2' : theme.accentColor;
    const borderColor = isUrgent ? '#fca5a5' : theme.borderColor;
    const textColor = isUrgent ? '#dc2626' : theme.textColor;

    return `<div style="background:${bgColor};border:2px solid ${borderColor};margin:16px 20px;padding:24px;border-radius:12px;text-align:${align};">
      <h3 style="color:${textColor};font-size:20px;margin:0 0 16px 0;font-weight:700;">${customText}</h3>
      <div style="display:flex;justify-content:center;gap:20px;margin:16px 0;">
        ${block.showDays && daysUntil > 0 ? `<div style="text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:${textColor};">${daysUntil}</div>
          <div style="color:${theme.textColor};font-size:12px;">DAYS</div>
        </div>` : ''}
        ${block.showHours && hoursUntil > 0 ? `<div style="text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:${textColor};">${hoursUntil % 24}</div>
          <div style="color:${theme.textColor};font-size:12px;">HOURS</div>
        </div>` : ''}
      </div>
    </div>`;
  }

  private renderAttendanceInfo(block: any, orderData: OrderData, theme: ThemeStyles): string {
    const customMessage = this.sanitizeHtml(block.customMessage || 'Here\'s a reminder of your attendance details:');

    return `<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
      <h3 style="color:${theme.textColor};margin:0 0 12px 0;">${customMessage}</h3>
      ${block.showTicketCount ? `<div style="color:${theme.textColor};margin:8px 0;">
        <strong>Tickets:</strong> ${orderData.order_items.reduce((sum, item) => sum + item.quantity, 0)} tickets
      </div>` : ''}
      ${block.showTicketTypes ? `<div style="color:${theme.textColor};margin:8px 0;">
        <strong>Types:</strong> ${orderData.order_items.map(item => item.ticket_types?.name || 'General').join(', ')}
      </div>` : ''}
    </div>`;
  }

  private renderImportantUpdates(block: any, theme: ThemeStyles): string {
    const title = this.sanitizeHtml(block.title || 'Important Updates');
    const updates = block.updates || [];

    if (updates.length === 0) {
      return `<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
        <h3 style="color:${theme.textColor};margin:0;">${title}</h3>
        <p style="color:${theme.textColor};margin:8px 0 0 0;">No updates at this time.</p>
      </div>`;
    }

    const updatesHtml = updates.map((update: string) =>
      `<li style="color:${theme.textColor};margin:4px 0;">${this.sanitizeHtml(update)}</li>`
    ).join('');

    return `<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
      <h3 style="color:${theme.textColor};margin:0 0 12px 0;">${title}</h3>
      <ul style="margin:0;padding-left:20px;">${updatesHtml}</ul>
    </div>`;
  }

  private renderVenueDirections(block: any, orderData: OrderData, theme: ThemeStyles): string {
    const venue = orderData.events.venue;
    if (!venue && !block.customDirections) return '';

    return `<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
      <h3 style="color:${theme.textColor};margin:0 0 12px 0;">📍 Venue & Directions</h3>
      ${block.showAddress && venue ? `<div style="color:${theme.textColor};margin:8px 0;">
        <strong>Address:</strong> ${this.sanitizeHtml(venue)}
      </div>` : ''}
      ${block.showMapLink ? `<div style="margin:12px 0;">
        <a href="#" style="background:${theme.buttonColor};color:white;padding:8px 16px;text-decoration:none;border-radius:6px;display:inline-block;">
          Get Directions
        </a>
      </div>` : ''}
      ${block.showParkingInfo ? `<div style="color:${theme.textColor};margin:8px 0;">
        <strong>Parking:</strong> Street parking and nearby parking garages available
      </div>` : ''}
      ${block.customDirections ? `<div style="color:${theme.textColor};margin:8px 0;">
        ${this.sanitizeHtml(block.customDirections)}
      </div>` : ''}
    </div>`;
  }

  private renderCheckInInfo(block: any, theme: ThemeStyles): string {
    const customInstructions = this.sanitizeHtml(block.customInstructions || '');
    const checkInProcess = block.showCheckInProcess || [];

    return `<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
      <h3 style="color:${theme.textColor};margin:0 0 12px 0;">✅ Check-in Information</h3>
      ${customInstructions ? `<p style="color:${theme.textColor};margin:0 0 12px 0;">${customInstructions}</p>` : ''}
      ${block.showArrivalTime ? `<div style="color:${theme.textColor};margin:8px 0;">
        <strong>Recommended Arrival:</strong> 15 minutes before event start
      </div>` : ''}
      ${checkInProcess.length > 0 ? `
        <h4 style="color:${theme.textColor};margin:12px 0 8px 0;">Check-in Process:</h4>
        <ol style="margin:0;padding-left:20px;">
          ${checkInProcess.map((step: string) => `<li style="color:${theme.textColor};margin:4px 0;">${this.sanitizeHtml(step)}</li>`).join('')}
        </ol>
      ` : ''}
    </div>`;
  }

  private renderWeatherInfo(block: any, theme: ThemeStyles): string {
    const customMessage = this.sanitizeHtml(block.customMessage || 'Check the weather and dress accordingly!');

    return `<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
      <h3 style="color:${theme.textColor};margin:0 0 12px 0;">🌤️ Weather Information</h3>
      <p style="color:${theme.textColor};margin:0;">${customMessage}</p>
      ${block.showForecast ? `<div style="color:${theme.textColor};margin:12px 0;">
        <strong>Forecast:</strong> Partly cloudy, 22°C (Weather data would be fetched from API)
      </div>` : ''}
      ${block.showRecommendations ? `<div style="color:${theme.textColor};margin:8px 0;">
        <strong>Recommendation:</strong> Light jacket recommended for evening events
      </div>` : ''}
    </div>`;
  }

  private renderRecommendedItems(block: any, theme: ThemeStyles): string {
    const title = this.sanitizeHtml(block.title || 'What to bring:');
    const categories = block.categories || {};

    let itemsHtml = '';

    if (categories.bring && categories.bring.length > 0) {
      itemsHtml += `<div style="margin:8px 0;">
        <strong style="color:${theme.headerColor};">✅ Bring:</strong>
        <ul style="margin:4px 0;padding-left:20px;">
          ${categories.bring.map((item: string) => `<li style="color:${theme.textColor};">${this.sanitizeHtml(item)}</li>`).join('')}
        </ul>
      </div>`;
    }

    if (categories.wear && categories.wear.length > 0) {
      itemsHtml += `<div style="margin:8px 0;">
        <strong style="color:${theme.headerColor};">👕 Wear:</strong>
        <ul style="margin:4px 0;padding-left:20px;">
          ${categories.wear.map((item: string) => `<li style="color:${theme.textColor};">${this.sanitizeHtml(item)}</li>`).join('')}
        </ul>
      </div>`;
    }

    if (categories.avoid && categories.avoid.length > 0) {
      itemsHtml += `<div style="margin:8px 0;">
        <strong style="color:${theme.headerColor};">❌ Avoid:</strong>
        <ul style="margin:4px 0;padding-left:20px;">
          ${categories.avoid.map((item: string) => `<li style="color:${theme.textColor};">${this.sanitizeHtml(item)}</li>`).join('')}
        </ul>
      </div>`;
    }

    if (!itemsHtml && block.items && block.items.length > 0) {
      itemsHtml = `<ul style="margin:8px 0;padding-left:20px;">
        ${block.items.map((item: string) => `<li style="color:${theme.textColor};">${this.sanitizeHtml(item)}</li>`).join('')}
      </ul>`;
    }

    return `<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
      <h3 style="color:${theme.textColor};margin:0 0 12px 0;">${title}</h3>
      ${itemsHtml || '<p style="color:' + theme.textColor + ';margin:0;">No specific recommendations at this time.</p>'}
    </div>`;
  }
}

// Default renderer instance
export const emailRenderer = new EmailRenderer();