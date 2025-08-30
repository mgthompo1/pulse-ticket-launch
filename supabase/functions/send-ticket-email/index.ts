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
    const blocks: any[] = Array.isArray(emailCustomization?.blocks) ? emailCustomization.blocks : [];
    const orgLogo = order.events.organizations.logo_url;
    
    // Helper function to get theme-based styles with color presets
    const getThemeStyles = (theme: string) => {
      const template = emailCustomization?.template || {};
      
      // Theme color presets matching the frontend
      const themePresets = {
        professional: {
          headerColor: "#1f2937",
          backgroundColor: "#ffffff", 
          textColor: "#374151",
          buttonColor: "#1f2937",
          accentColor: "#f9fafb",
          borderColor: "#d1d5db"
        },
        modern: {
          headerColor: "#3b82f6",
          backgroundColor: "#ffffff",
          textColor: "#1f2937", 
          buttonColor: "#3b82f6",
          accentColor: "#eff6ff",
          borderColor: "#dbeafe"
        },
        elegant: {
          headerColor: "#7c3aed",
          backgroundColor: "#ffffff",
          textColor: "#374151",
          buttonColor: "#7c3aed", 
          accentColor: "#f5f3ff",
          borderColor: "#e0e7ff"
        },
        minimal: {
          headerColor: "#000000",
          backgroundColor: "#ffffff",
          textColor: "#000000",
          buttonColor: "#000000",
          accentColor: "#f8f9fa",
          borderColor: "#e9ecef"
        },
        creative: {
          headerColor: "#ec4899",
          backgroundColor: "#ffffff",
          textColor: "#1f2937",
          buttonColor: "#ec4899",
          accentColor: "#fdf2f8", 
          borderColor: "#f9a8d4"
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
        fontFamily: template.fontFamily || 'Arial, sans-serif',
        ...themeColors
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

      const parts: string[] = [];
      parts.push(`<div style="font-family:${theme.fontFamily};max-width:600px;margin:0 auto;background:${theme.backgroundColor};border:1px solid ${theme.borderColor};">`);
      for (const b of blocks) {
        if (b.hidden) continue;
        switch (b.type) {
          case 'header':
            parts.push(`<div style="background:${theme.headerColor};color:#fff;padding:20px;"><h1 style="margin:0;text-align:center;">${(b.title || 'Thank you')}</h1></div>`);
            break;
          case 'text':
            parts.push(`<div style="padding:16px 20px;color:${theme.textColor};">${b.html || ''}</div>`);
            break;
          case 'event_details':
            parts.push(`<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px;">
              <strong style="color:${theme.textColor}">${order.events.name}</strong>
              <div style="color:${theme.textColor};font-size:14px;">📅 ${new Date(order.events.event_date).toLocaleDateString()}<br/>📍 ${order.events.venue || 'TBA'}<br/>👤 ${order.customer_name}</div>
            </div>`);
            break;
          case 'ticket_list':
            parts.push(`<div style="padding:0 20px;color:${theme.textColor}"><h3>Your Tickets</h3>${allTickets.map((t:any)=>`
              <div style="border:1px solid ${theme.borderColor};padding:16px;border-radius:8px;background:#fff;margin:12px 0;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span>${t.type}</span>
                  <code style="background:${theme.accentColor};padding:4px 8px;">${t.code}</code>
                </div>
              </div>`).join('')}</div>`);
            break;
          case 'button':
            parts.push(`<div style="text-align:${b.align || 'center'};padding:20px;"><a href="${b.url || '#'}" style="background:${theme.buttonColor};color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">${b.label || 'View Order'}</a></div>`);
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
      parts.push(`</div>`);
      return parts.join('');
    };

    if (blocks.length > 0) {
      // Prefer new block renderer regardless of delivery method
      emailContent = {
        to: order.customer_email,
        subject: emailCustomization?.content?.subject || `Your tickets for ${order.events.name}`,
        html: renderBlocks(),
      };
    } else if (deliveryMethod === 'qr_ticket') {
      // Render tickets in an email layout that mirrors TicketDisplay styles
      const ticketHtml = allTickets.map((t:any) => `
        <div style="border:2px solid #e5e7eb;border-radius:12px;margin:16px 0;padding:16px;background:linear-gradient(135deg,#fff,#f7fafc);">
          <div style="text-align:center;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:12px;">
            ${orgLogo ? `<img src="${orgLogo}" alt="Logo" style="height:48px;max-width:200px;object-fit:contain;margin:0 auto 8px;display:block;"/>` : ''}
            <div style="font-size:18px;font-weight:700;color:#111827;">${order.events.name}</div>
            ${order.events.venue ? `<div style=\"font-size:12px;color:#6b7280;display:flex;justify-content:center;gap:4px;\">📍 <span>${order.events.venue}</span></div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;color:#111827;">
            <div style="display:flex;align-items:center;gap:8px;"><span>📅</span><div><div style="font-weight:600;">${new Date(order.events.event_date).toLocaleDateString(undefined,{ weekday:'long', month:'long', day:'numeric', year:'numeric'})}</div><div style="font-size:12px;color:#6b7280;">${new Date(order.events.event_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit'})}</div></div></div>
            <div style="display:flex;align-items:center;gap:8px;"><span>🎟️</span><div><div style="font-weight:600;">${t.type}</div><div style="font-size:12px;color:#6b7280;">Ticket Type</div></div></div>
            <div style="display:flex;align-items:center;gap:8px;"><span>👤</span><div><div style="font-weight:600;">${order.customer_name}</div><div style="font-size:12px;color:#6b7280;">Attendee</div></div></div>
          </div>
          <div style="border-top:1px solid #e5e7eb;margin-top:12px;padding-top:12px;text-align:center;">
            <div style="font-size:13px;color:#6b7280;margin-bottom:8px;">Scan QR Code at Event</div>
            <div style="display:inline-block;border:1px solid #e5e7eb;border-radius:6px;padding:6px;background:#fff;">
              <img src="${codeToQrUrl[t.code] || `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(t.code)}`}" alt="QR"/>
            </div>
            <div style="font-size:12px;color:#6b7280;margin-top:8px;">
              <div>Ticket Code: <span style="font-family:monospace;font-weight:600;">${t.code}</span></div>
              <div>Status: <span style="text-transform:capitalize;color:#16a34a;font-weight:600;">valid</span></div>
            </div>
          </div>
        </div>
      `).join('');

      emailContent = {
        to: order.customer_email,
        subject: emailCustomization?.content?.subject || `Your tickets for ${order.events.name}`,
        html: `
          <div style="font-family:${themeStyles.fontFamily};max-width:600px;margin:0 auto;background:${themeStyles.backgroundColor};">
            <div style="background:${themeStyles.headerColor};color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;font-size:22px;">${emailCustomization?.content?.headerText || 'Thank you for your purchase!'}</h1>
            </div>
            <div style="padding:20px;">
              ${ticketHtml}
              <div style="background:${themeStyles.accentColor};border-top:1px solid ${themeStyles.borderColor};padding:16px;margin-top:20px;text-align:center;border-radius:0 0 8px 8px;">
                <p style="color:#999;font-size:12px;margin:0;">${emailCustomization?.content?.footerText || 'Questions? Contact us anytime.'}</p>
              </div>
            </div>
          </div>
        `
      };
    } else {
      // Confirmation email with detailed event information
      emailContent = {
        to: order.customer_email,
        subject: emailCustomization?.content?.subject || `Event Confirmation: ${order.events.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: ${emailCustomization?.template?.backgroundColor || '#ffffff'};">
            ${orgLogo ? `<div style="text-align: center; padding: 20px 0;"><img src="${orgLogo}" alt="Organization Logo" style="max-width: 200px; height: auto;"></div>` : ''}
            
            <div style="padding: 20px;">
              <h1 style="color: ${emailCustomization?.template?.headerColor || '#333'};">✅ ${emailCustomization?.content?.headerText || 'Registration Confirmed!'}</h1>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #333;">${order.events.name}</h2>
                <p><strong>📅 Date & Time:</strong> ${new Date(order.events.event_date).toLocaleDateString()} at ${new Date(order.events.event_date).toLocaleTimeString()}</p>
                <p><strong>📍 Venue:</strong> ${order.events.venue || 'TBA'}</p>
                <p><strong>👤 Attendee:</strong> ${order.customer_name}</p>
                <p><strong>📧 Email:</strong> ${order.customer_email}</p>
                ${order.customer_phone ? `<p><strong>📞 Phone:</strong> ${order.customer_phone}</p>` : ''}
              </div>

              ${order.events.description ? `
              <div style="background: #fff9e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
                <h3 style="color: #333; margin-top: 0;">Event Details:</h3>
                <p style="color: #333; line-height: 1.6;">${order.events.description}</p>
              </div>
              ` : ''}

              <h3 style="color: ${emailCustomization?.template?.textColor || '#000000'};">Your Registration:</h3>
              ${ticketItems.map(item => `
                <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                  <strong>${item.ticket_types?.name || 'General Admission'}</strong> - ${item.quantity} ${item.quantity === 1 ? 'person' : 'people'}<br>
                  <small>Total: $${(item.unit_price * item.quantity).toFixed(2)}</small>
                </div>
              `).join('')}

              <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #2e7d32;">What to Expect:</h4>
                <ul style="color: #2e7d32;">
                  <li>Arrive 15-30 minutes before the event starts</li>
                  <li>Bring a valid ID for check-in</li>
                  <li>Check your email for any last-minute updates</li>
                  <li>Contact us if you have any questions</li>
                </ul>
              </div>

              <div style="color: ${emailCustomization?.template?.textColor || '#000000'}; padding: 15px; margin: 20px 0;">
                ${emailCustomization?.content?.bodyText || 'We look forward to seeing you at the event!'}
              </div>

              <p style="color: #666; font-size: 14px;">
                Questions? Contact the event organizer: ${order.events.organizations.email}
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                ${emailCustomization?.content?.footerText || 'Powered by TicketFlo Platform'}
              </p>
            </div>
          </div>
        `
      };
    }

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
        } else if (pdfResponse.data?.pdf) {
          pdfAttachment = {
            filename: pdfResponse.data.filename || 'tickets.pdf',
            content: pdfResponse.data.pdf,
            content_type: 'application/pdf'
          };
          logStep("PDF generated successfully", { filename: pdfAttachment.filename });
        }
      } catch (pdfError) {
        logStep("PDF generation error", { error: pdfError });
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