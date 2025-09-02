// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TICKET-EMAIL] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { orderId } = await req.json();
    logStep("Processing order", { orderId });

    // Get order details with related data
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        events!inner(
          name,
          event_date,
          venue,
          description,
          email_customization,
          organizations!inner(
            name,
            email,
            logo_url
          )
        ),
        order_items!inner(
          id,
          quantity,
          unit_price,
          item_type,
          ticket_types(
            name,
            description
          ),
          merchandise(
            name
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    logStep("Order details retrieved", { 
      customerEmail: order.customer_email,
      eventName: order.events.name 
    });

    // Fetch payment method details from Stripe if available
    let paymentMethodInfo = { brand: 'Card', last4: '', type: 'card' };
    if (order.stripe_session_id) {
      try {
        logStep("Fetching Stripe payment details", { sessionId: order.stripe_session_id });
        
        // Get Stripe credentials for this organization
        const { data: credentials } = await supabaseClient
          .rpc('get_payment_credentials', { org_id: order.events.organizations.id });
          
        if (credentials && credentials.stripe_secret_key) {
          const stripe = await import('https://esm.sh/stripe@14.21.0');
          const stripeClient = new stripe.default(credentials.stripe_secret_key, {
            apiVersion: '2023-10-16',
          });

          const session = await stripeClient.checkout.sessions.retrieve(order.stripe_session_id, {
            expand: ['payment_intent.payment_method']
          });

          if (session.payment_intent && session.payment_intent.payment_method) {
            const pm = session.payment_intent.payment_method;
            if (pm.card) {
              paymentMethodInfo = {
                brand: pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1),
                last4: pm.card.last4,
                type: 'card'
              };
              logStep("Payment method retrieved", paymentMethodInfo);
            }
          }
        }
      } catch (error) {
        logStep("Failed to fetch payment method", { error: error.message });
        // Continue with default payment info if Stripe fetch fails
      }
    }

    // Check delivery method from custom answers
    const customAnswers = order.custom_answers as any;
    const deliveryMethod = customAnswers?.deliveryMethod || 'qr_ticket';
    
    logStep("Processing delivery method", { deliveryMethod });

    // Get existing tickets or generate new ones if none exist
    const ticketItems = order.order_items.filter((item: any) => item.item_type === 'ticket');
    let allTickets: any[] = [];

    if (deliveryMethod === 'qr_ticket') {
      // First, check if tickets already exist for this order
      const { data: existingTickets } = await supabaseClient
        .from("tickets")
        .select(`
          id,
          ticket_code,
          status,
          order_item_id
        `)
        .in('order_item_id', ticketItems.map((item: any) => item.id));

      if (existingTickets && existingTickets.length > 0) {
        // Use existing tickets - match them with their order items
        allTickets = existingTickets.map((ticket: any) => {
          const orderItem = ticketItems.find((item: any) => item.id === ticket.order_item_id);
          return {
            code: ticket.ticket_code,
            type: orderItem?.ticket_types?.name || 'General Admission',
            price: orderItem?.unit_price || 0
          };
        });
        logStep("Using existing tickets", { count: allTickets.length });
      } else {
        // Generate new tickets only if none exist
        const ticketPromises = ticketItems.map(async (item: any) => {
          const tickets = [];
          for (let i = 0; i < item.quantity; i++) {
            const { data: ticket, error: ticketError } = await supabaseClient
              .rpc("generate_ticket_code")
              .single();

            if (ticketError) throw ticketError;

            const { error: insertError } = await supabaseClient
              .from("tickets")
              .insert({
                order_item_id: item.id,
                ticket_code: ticket,
                status: "valid"
              });

            if (insertError) throw insertError;

            tickets.push({
              code: ticket,
              type: item.ticket_types?.name || 'General Admission',
              price: item.unit_price
            });
          }
          return tickets;
        });

        allTickets = (await Promise.all(ticketPromises)).flat();
        logStep("Tickets generated", { count: allTickets.length });
      }
    } else {
      logStep("Skipping ticket generation for confirmation email");
    }

    // Get email customization (supports block-based schema)
    const emailCustomization = order.events.email_customization as any;
    
    // Use saved blocks when present; otherwise fall back to sane defaults
    const blocks: any[] = Array.isArray(emailCustomization?.blocks) && emailCustomization.blocks.length > 0
      ? emailCustomization.blocks
      : [
          { type: 'header', title: emailCustomization?.content?.headerText || 'Thank you for your purchase!' },
          { type: 'event_details' },
          { type: 'ticket_list' },
          { type: 'button', label: 'View Tickets', url: '#', align: 'center' }
        ];
    
    logStep("USING EMAIL BLOCKS", { 
      hasCustomBlocks: Array.isArray(emailCustomization?.blocks) && emailCustomization.blocks.length > 0,
      blocksCount: blocks.length
    });
    const orgLogo = order.events.organizations.logo_url;
    
    // Helper function to get theme-based styles with color presets
    const getThemeStyles = (theme: string) => {
      const template = emailCustomization?.template || {};
      
      // Modern Professional Theme Presets with improved typography and spacing
      const themePresets = {
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
        },
        corporate: {
          headerColor: "#1e3a8a",
          backgroundColor: "#ffffff",
          textColor: "#1e293b",
          buttonColor: "#1d4ed8",
          accentColor: "#f1f5f9",
          borderColor: "#cbd5e1",
          fontFamily: "'system-ui', -apple-system, sans-serif"
        }
      };

      // Get theme preset or use template colors if custom
      const themeColors = themePresets[theme as keyof typeof themePresets] || {
        headerColor: template.headerColor || "#1f2937",
        backgroundColor: template.backgroundColor || "#ffffff",
        textColor: template.textColor || "#374151",
        buttonColor: template.buttonColor || "#1f2937",
        accentColor: template.accentColor || "#f9fafb",
        borderColor: template.borderColor || "#d1d5db"
      };

      const baseStyles = {
        ...themeColors,
        fontFamily: themeColors.fontFamily || template.fontFamily || "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      };

      switch (theme) {
        case 'modern':
          return { ...baseStyles, borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' };
        case 'elegant':
          return { ...baseStyles, borderRadius: '8px', border: `2px solid ${baseStyles.borderColor}` };
        case 'minimal':
          return { ...baseStyles, borderRadius: '4px', border: `1px solid ${baseStyles.borderColor}` };
        case 'creative':
          return { ...baseStyles, borderRadius: '16px', background: `linear-gradient(135deg, ${baseStyles.backgroundColor}, ${baseStyles.accentColor}15)` };
        case 'professional':
        default:
          return { ...baseStyles, borderRadius: '8px', border: `1px solid ${baseStyles.borderColor}` };
      }
    };

    const themeStyles = getThemeStyles(emailCustomization?.template?.theme || 'professional');
    
    // Map ticket_code -> signed QR URL for email rendering (fallback to external if generation fails)
    let codeToQrUrl: Record<string, string> = {};
    try {
      const orderItemIds = ticketItems.map((it: any) => it.id);
      if (orderItemIds.length > 0) {
        const { data: dbTickets } = await supabaseClient
          .from('tickets')
          .select('id, ticket_code, order_item_id')
          .in('order_item_id', orderItemIds);
        if (dbTickets && dbTickets.length > 0) {
          const { data: qrResp } = await supabaseClient.functions.invoke('generate-ticket-qr', {
            body: { tickets: dbTickets.map((t: any) => ({ id: t.id, code: t.ticket_code })) }
          });
          const urls: Record<string, string> = (qrResp as any)?.urls || {};
          for (const t of dbTickets) {
            if (urls[t.id]) codeToQrUrl[t.ticket_code] = urls[t.id];
          }
        }
      }
    } catch (_e) {}

    // Create customized email content based on delivery method
    let emailContent: any;
    
    const renderBlocks = () => {
      // Minimal block renderer for transactional email
      const theme = {
        headerColor: emailCustomization?.template?.headerColor || '#1f2937',
        backgroundColor: emailCustomization?.template?.backgroundColor || '#ffffff',
        textColor: emailCustomization?.template?.textColor || '#374151',
        buttonColor: emailCustomization?.template?.buttonColor || '#1f2937',
        accentColor: emailCustomization?.template?.accentColor || '#f9fafb',
        borderColor: emailCustomization?.template?.borderColor || '#e5e7eb',
        fontFamily: emailCustomization?.template?.fontFamily || 'Arial, sans-serif'
      };

      // Clean monochrome Unicode symbols for professional look (white on dark background)
      const icons = {
        calendar: '●',  // Solid circle for date/time
        mapPin: '●',    // Solid circle for location pin  
        user: '●',      // Solid circle for person
        ticket: '●'     // Solid circle for tickets
      };

      // Get logo configuration from email customization
      const branding = emailCustomization?.branding || {};
      const getLogoUrl = () => {
        if (!branding.showLogo) return null;
        
        const logoSource = branding.logoSource || 'event';
        
        switch (logoSource) {
          case 'organization':
            return order.events.organizations.logo_url;
          case 'custom':
            return branding.customLogoUrl;
          case 'event':
          default:
            return order.events.logo_url;
        }
      };

      const logoUrl = getLogoUrl();
      const logoSize = branding.logoSize === 'small' ? '80px' : branding.logoSize === 'large' ? '150px' : '120px';

      const parts: string[] = [];
      // Add Google Fonts import for Manrope and DM Sans
      parts.push(`<style>
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
      </style>`);
      parts.push(`<div style="font-family:'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;max-width:600px;margin:0 auto;background:${theme.backgroundColor};border:1px solid ${theme.borderColor};">`);
      
      // Add logo in header position (prefer event -> org -> custom per config)
      if (branding.showLogo && branding.logoPosition === 'header') {
        const preferredLogo = logoUrl || order.events.organizations?.logo_url || order.events.logo_url;
        if (preferredLogo) {
          parts.push(`<div style="text-align:center;margin-bottom:15px;padding:20px 20px 0 20px;"><img src="${preferredLogo}" alt="Logo" style="max-width:${logoSize};height:auto;display:block;margin:0 auto;"/></div>`);
        }
      }
      
      for (const b of blocks) {
        if (b.hidden) continue;
        switch (b.type) {
          case 'header':
            parts.push(`<div style="background:${theme.headerColor};color:#fff;padding:20px;"><h1 style="margin:0;text-align:center;font-family:'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;font-weight:600;">${(b.title || 'Thank you')}</h1></div>`);
            break;
          case 'text':
            parts.push(`<div style="padding:16px 20px;color:${theme.textColor};">${b.html || ''}</div>`);
            break;
          case 'event_details':
            parts.push(`<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
              <strong style="color:${theme.textColor}">${order.events.name}</strong>
              <div style="color:${theme.textColor};font-size:14px;line-height:1.6;margin-top:16px;">
                <div style="display:flex;align-items:center;margin:12px 0;padding:12px;background:${theme.accentColor};border-radius:8px;">
                  <div style="background:${theme.headerColor};color:#ffffff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;">${icons.calendar}</div>
                  <div style="flex:1;">
                    <div style="font-weight:600;color:${theme.textColor};margin-bottom:2px;">${new Date(order.events.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div style="color:${theme.textColor};opacity:0.8;font-size:13px;">${new Date(order.events.event_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;margin:12px 0;padding:12px;background:${theme.accentColor};border-radius:8px;">
                  <div style="background:${theme.headerColor};color:#ffffff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;">${icons.mapPin}</div>
                  <div style="flex:1;">
                    <div style="color:${theme.textColor};opacity:0.6;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Venue</div>
                    <div style="font-weight:600;color:${theme.textColor};">${order.events.venue || 'TBA'}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;margin:12px 0;padding:12px;background:${theme.accentColor};border-radius:8px;">
                  <div style="background:${theme.headerColor};color:#ffffff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;">${icons.user}</div>
                  <div style="flex:1;">
                    <div style="color:${theme.textColor};opacity:0.6;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Attendee</div>
                    <div style="font-weight:600;color:${theme.textColor};">${order.customer_name}</div>
                  </div>
                </div>
              </div>
            </div>`);
            break;
          case 'ticket_list':
            // Create clean item list for tickets and merchandise
            const allItems = order.order_items.map((item: any) => {
              const itemName = item.item_type === 'ticket' 
                ? (item.ticket_types?.name || 'General Admission')
                : (item.merchandise?.name || 'Merchandise');
              
              return {
                name: itemName,
                quantity: item.quantity,
                price: item.unit_price,
                total: item.unit_price * item.quantity,
                type: item.item_type
              };
            });
            
            const itemsHtml = allItems.map((item: any) => `
              <div style="padding:20px 24px;border-bottom:1px solid ${theme.borderColor};background:${item.type === 'ticket' ? 'rgba(99, 102, 241, 0.02)' : 'rgba(34, 197, 94, 0.02)'};margin-bottom:2px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                  <div style="flex:1;padding-right:20px;">
                    <div style="display:flex;align-items:center;margin-bottom:8px;">
                      <div style="background:${item.type === 'ticket' ? '#6366f1' : '#22c55e'};color:#ffffff;border-radius:4px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;margin-right:8px;font-size:12px;">${item.type === 'ticket' ? '🎫' : '🛍️'}</div>
                      <div style="font-weight:600;color:${theme.textColor};font-size:18px;font-family:'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;">${item.name}</div>
                    </div>
                    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
                      <div style="background:${theme.accentColor};padding:4px 8px;border-radius:4px;font-size:12px;color:${theme.textColor};opacity:0.8;font-family:'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;">
                        <strong>Price:</strong> $${item.price.toFixed(2)}
                      </div>
                      <div style="background:${theme.accentColor};padding:4px 8px;border-radius:4px;font-size:12px;color:${theme.textColor};opacity:0.8;font-family:'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;">
                        <strong>Qty:</strong> ${item.quantity}
                      </div>
                    </div>
                  </div>
                  <!-- Removed individual item totals to reduce clutter -->
                </div>
              </div>
            `).join('');
            
            // Calculate grand total
            const grandTotal = allItems.reduce((sum: number, item: any) => sum + item.total, 0);
            
            parts.push(`<div style="padding:0 20px;color:${theme.textColor}">
              <h3 style="margin:24px 0 20px 0;color:${theme.textColor};font-family:'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;font-weight:600;font-size:20px;">Your Order Summary</h3>
              <div style="background:#fff;border:2px solid ${theme.borderColor};border-radius:12px;padding:0;margin-bottom:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                ${itemsHtml}
                <div style="background:linear-gradient(135deg, ${theme.headerColor}, ${theme.buttonColor});padding:32px 24px;border-top:1px solid ${theme.borderColor};">
                  <div style="text-align:center;margin-bottom:16px;">
                    <div style="color:#ffffff;font-weight:700;font-size:28px;font-family:'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;margin-bottom:4px;">$${grandTotal.toFixed(2)}</div>
                    <div style="color:#ffffff;opacity:0.8;font-size:14px;font-family:'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;">Total Amount Paid</div>
                  </div>
                  <div style="text-align:center;padding-top:16px;border-top:1px solid rgba(255,255,255,0.2);">
                    <div style="color:#ffffff;opacity:0.8;font-size:12px;font-family:'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;margin-bottom:4px;">Payment Method</div>
                    <div style="color:#ffffff;font-weight:500;font-size:14px;font-family:'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;">💳 ${paymentMethodInfo.brand}${paymentMethodInfo.last4 ? ` •••• ${paymentMethodInfo.last4}` : ' Payment'}</div>
                    <div style="color:#ffffff;opacity:0.7;font-size:12px;font-family:'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;margin-top:2px;">${new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(order.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
              </div>
              <div style="text-align:center;padding:20px;background:${theme.accentColor};border-radius:8px;margin-bottom:16px;">
                <div style="color:${theme.textColor};font-size:14px;font-family:'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;margin-bottom:8px;">
                  <strong>Ready to access your tickets?</strong>
                </div>
                <div style="color:${theme.textColor};opacity:0.8;font-size:13px;font-family:'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;">
                  Click the button below to view and download your tickets
                </div>
              </div>
            </div>`);
            break;
          case 'button':
            // Replace dynamic placeholders in button URLs
            let buttonUrl = b.url || '#';
            if (buttonUrl.includes('{{ORDER_ID}}')) {
              buttonUrl = buttonUrl.replace(/\{\{ORDER_ID\}\}/g, orderId);
            }
            if (buttonUrl.includes('{{EVENT_ID}}')) {
              buttonUrl = buttonUrl.replace(/\{\{EVENT_ID\}\}/g, order.events?.id || '');
            }
            if (buttonUrl.includes('{{CUSTOMER_EMAIL}}')) {
              buttonUrl = buttonUrl.replace(/\{\{CUSTOMER_EMAIL\}\}/g, encodeURIComponent(order.customer_email));
            }
            if (buttonUrl.includes('{{success_url}}')) {
              buttonUrl = buttonUrl.replace(/\{\{success_url\}\}/g, `/tickets?orderId=${orderId}&email=${encodeURIComponent(order.customer_email)}`);
            }
            
            // Default VIEW TICKETS button to a dedicated tickets page if no URL specified
            if (!buttonUrl || buttonUrl === '#') {
              buttonUrl = `/tickets?orderId=${orderId}&email=${encodeURIComponent(order.customer_email)}`;
            }
            
            // Convert relative URLs to absolute URLs for email compatibility
            if (buttonUrl.startsWith('/') && !buttonUrl.startsWith('//')) {
              // Use environment variable if provided; fall back to your production domain
              const configured = Deno.env.get('PUBLIC_APP_BASE_URL') || '';
              const origin = configured || 'https://www.ticketflo.org';
              buttonUrl = origin + buttonUrl;
            }
            
            // Ensure we never use Supabase URLs in the button
            if (buttonUrl.includes('supabase.co') || buttonUrl.includes('yoxsewbpoqxscsutqlcb')) {
              console.error('WARNING: Supabase URL detected in button, replacing with proper URL');
              buttonUrl = `https://www.ticketflo.org/tickets?orderId=${orderId}&email=${encodeURIComponent(order.customer_email)}`;
            }
            
            logStep("Button URL generated", { 
              originalUrl: b.url || '#',
              finalUrl: buttonUrl,
              buttonLabel: b.label || 'View Tickets',
              buttonBlock: b,
              hasSupabaseUrl: buttonUrl.includes('supabase.co'),
              origin: Deno.env.get('PUBLIC_APP_BASE_URL') || 'https://www.ticketflo.org'
            });
            
            parts.push(`<div style="text-align:${b.align || 'center'};padding:20px;"><a href="${buttonUrl}" style="background:${theme.buttonColor};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">${b.label || 'View Tickets'}</a></div>`);
            break;
          case 'divider':
            parts.push(`<hr style="border:0;border-top:1px solid ${theme.borderColor};margin:16px 20px;"/>`);
            break;
          case 'image':
            parts.push(`<div style="text-align:${b.align || 'center'};padding:20px;">${b.src ? `<img src="${b.src}" alt="${b.alt || ''}" style="max-width:100%"/>` : ''}</div>`);
            break;
          case 'footer':
            parts.push(`<div style="background:${theme.accentColor};padding:16px;text-align:center;border-top:1px solid ${theme.borderColor}"><small style="color:#999">${b.text || ''}</small></div>`);
            break;
          default:
            break;
        }
      }
      
      // Add logo in content position
      if (branding.showLogo && branding.logoPosition === 'content') {
        const preferredLogo = logoUrl || order.events.organizations?.logo_url || order.events.logo_url;
        if (preferredLogo) {
          parts.push(`<div style="text-align:center;margin-top:15px;padding:0 20px 20px 20px;"><img src="${preferredLogo}" alt="Logo" style="max-width:${logoSize};height:auto;display:block;margin:0 auto;"/></div>`);
        }
      }
      
      parts.push(`</div>`);
      return parts.join('');
    };

    // ALWAYS use block template - force this path
    const generatedHtml = renderBlocks();
    logStep("=== EMAIL TEMPLATE DEBUG ===", { 
      htmlLength: generatedHtml.length,
      htmlPreview: generatedHtml.substring(0, 800),
      blocksCount: blocks.length,
      hasBlocks: blocks.length > 0,
      containsCircularEmoji: generatedHtml.includes('border-radius:50%'),
      containsBrackets: generatedHtml.includes('{'),
      containsTicketsUrl: generatedHtml.includes('/tickets?orderId='),
      bracketLocations: generatedHtml.split('').map((char, i) => char === '{' ? i : null).filter(i => i !== null).slice(0, 5)
    });

      emailContent = {
        to: order.customer_email,
        subject: emailCustomization?.subject || `Your tickets for ${order.events.name}`,
      html: generatedHtml,
    };



    // Generate PDF tickets if delivery method is QR tickets
    let pdfAttachment = null;
    if (deliveryMethod === 'qr_ticket' && allTickets.length > 0) {
      try {
        logStep("Generating PDF tickets");
        const pdfResponse = await supabaseClient.functions.invoke('generate-ticket-pdf', {
          body: { orderId: orderId }
        });

        if (pdfResponse.error) {
          logStep("PDF generation failed", { error: pdfResponse.error });
          // Continue without PDF attachment
        } else if (pdfResponse.data?.pdf) {
          pdfAttachment = {
            filename: pdfResponse.data.filename || 'tickets.pdf',
            content: pdfResponse.data.pdf,
            content_type: 'application/pdf'
          };
          logStep("PDF generated successfully", { filename: pdfAttachment.filename });
        } else {
          logStep("PDF generation returned no data", { response: pdfResponse });
        }
      } catch (pdfError) {
        logStep("PDF generation exception", { 
          error: pdfError.message || String(pdfError),
          stack: pdfError.stack 
        });
        // Continue with email sending even if PDF fails
      }
    }

    // Send email using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    
    const resend = new Resend(resendApiKey);
    
    logStep("Sending email", { 
      recipient: emailContent.to,
      subject: emailContent.subject,
      ticketCount: allTickets.length,
      hasApiKey: !!resendApiKey,
      hasPdfAttachment: !!pdfAttachment
    });

    const emailOptions: any = {
      from: `${order.events.name} <noreply@ticketflo.org>`,
      to: [emailContent.to],
      subject: emailContent.subject,
      html: emailContent.html,
    };

    // Add PDF attachment if available
    if (pdfAttachment) {
      emailOptions.attachments = [{
        filename: pdfAttachment.filename,
        content: pdfAttachment.content, // base64 string
        contentType: pdfAttachment.content_type || 'application/pdf',
        contentDisposition: 'attachment'
      }];
    }

    const emailResponse = await resend.emails.send(emailOptions);

    logStep("Resend API response", { 
      response: emailResponse,
      hasError: !!emailResponse.error,
      hasData: !!emailResponse.data
    });

    if (emailResponse.error) {
      logStep("Resend error details", { 
        error: emailResponse.error,
        errorMessage: emailResponse.error.message,
        errorName: emailResponse.error.name
      });
      throw new Error(`Email failed: ${JSON.stringify(emailResponse.error)}`);
    }

    if (!emailResponse.data) {
      logStep("No data in email response", { fullResponse: emailResponse });
      throw new Error(`Email failed: No data returned from Resend API`);
    }

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    // Update order status
    await supabaseClient
      .from("orders")
      .update({ status: "completed" })
      .eq("id", orderId);

    // Send organiser notification if enabled
    try {
      logStep("Checking organiser notification settings");
      const emailCustomization = order.events.email_customization as any;
      const notificationsEnabled = emailCustomization?.notifications?.organiserNotifications;
      
      if (notificationsEnabled) {
        logStep("Sending organiser notification");
        await supabaseClient.functions.invoke('send-organiser-notification', {
          body: { orderId: orderId }
        });
      }
    } catch (notificationError) {
      logStep("ERROR sending organiser notification", { message: notificationError });
      // Don't fail the main function if notification fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      ticketsGenerated: allTickets.length,
      emailSent: true 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR", { 
      message: errorMessage, 
      stack: errorStack,
      error: error 
    });
    console.error("Full error details:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});