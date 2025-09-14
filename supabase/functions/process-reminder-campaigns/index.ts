// Comprehensive reminder email campaign processor
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderCampaign {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  status: string;
  template: any;
  subject_line: string;
  send_timing: string;
  send_value?: number;
  send_datetime?: string;
  recipient_type: string;
  total_recipients: number;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  venue?: string;
  description?: string;
  logo_url?: string;
  organizations: {
    name: string;
    email: string;
    logo_url?: string;
  };
}

interface Order {
  id: string;
  customer_email: string;
  customer_name?: string;
  total_amount: number;
  order_items: Array<{
    quantity: number;
    unit_price: number;
    ticket_types?: { name: string };
  }>;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REMINDER-PROCESSOR] ${step}${detailsStr}`);
};

class ReminderEmailService {
  private supabase: any;
  private resend: Resend;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    this.resend = new Resend(resendApiKey);
  }

  // Find campaigns that are ready to send
  async getCampaignsReadyToSend(): Promise<ReminderCampaign[]> {
    const now = new Date();

    const { data: campaigns, error } = await this.supabase
      .from("reminder_email_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("send_datetime", now.toISOString());

    if (error) {
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }

    return campaigns || [];
  }

  // Get event details with organization info
  async getEventWithOrganization(eventId: string): Promise<Event> {
    const { data: event, error } = await this.supabase
      .from("events")
      .select(`
        *,
        organizations!inner(
          name,
          email,
          logo_url
        )
      `)
      .eq("id", eventId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch event: ${error.message}`);
    }

    return event;
  }

  // Get recipients for a campaign based on recipient_type
  async getCampaignRecipients(campaign: ReminderCampaign, event: Event): Promise<Order[]> {
    let query = this.supabase
      .from("orders")
      .select(`
        id,
        customer_email,
        customer_name,
        total_amount,
        order_items!inner(
          quantity,
          unit_price,
          ticket_types(name)
        )
      `)
      .eq("event_id", campaign.event_id)
      .eq("status", "completed");

    // Apply recipient filtering
    switch (campaign.recipient_type) {
      case "ticket_holders_only":
        // Only include orders with actual tickets (not merchandise only)
        query = query.not("order_items.ticket_types", "is", null);
        break;
      case "custom_segment":
        // Apply custom filters if any (for now, default to all)
        break;
      case "all_attendees":
      default:
        // Include all completed orders
        break;
    }

    const { data: orders, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch recipients: ${error.message}`);
    }

    return orders || [];
  }

  // Replace personalization variables in text
  replacePersonalizationVariables(
    text: string,
    event: Event,
    order: Order
  ): string {
    const eventDate = new Date(event.event_date);
    const now = new Date();
    const diffTime = eventDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.ceil(diffTime / (1000 * 60 * 60));

    const variables: Record<string, string> = {
      "@FirstName": order.customer_name?.split(" ")[0] || "Friend",
      "@LastName": order.customer_name?.split(" ").slice(1).join(" ") || "",
      "@FullName": order.customer_name || order.customer_email,
      "@EventName": event.name,
      "@EventDate": eventDate.toLocaleDateString(),
      "@EventTime": eventDate.toLocaleTimeString(),
      "@EventVenue": event.venue || "See ticket for details",
      "@OrderNumber": order.id.substring(0, 8).toUpperCase(),
      "@TotalAmount": `$${order.total_amount.toFixed(2)}`,
      "@TicketCount": order.order_items.reduce((sum, item) => sum + item.quantity, 0).toString(),
      "@OrganizerName": event.organizations.name,
      "@ContactEmail": event.organizations.email,
      "@EventDescription": event.description || "",
      "@SpecialInstructions": "",
      "@DaysUntilEvent": Math.max(0, daysUntil).toString(),
      "@HoursUntilEvent": Math.max(0, hoursUntil).toString(),
      "@EventCountdown": daysUntil > 0 ? `${daysUntil} days` : `${Math.max(0, hoursUntil)} hours`,
      "@VenueAddress": event.venue || "",
      "@VenueParkingInfo": "Check venue website for parking details",
      "@CheckInTime": "1 hour before event start",
      "@DoorOpenTime": "30 minutes before event start",
      "@WeatherForecast": "Check local weather forecast",
      "@ImportantUpdates": "No updates at this time",
      "@DirectionsUrl": "#",
      "@EventWebsite": "#",
      "@AttendeeCount": order.order_items.reduce((sum, item) => sum + item.quantity, 0).toString(),
      "@TicketTypes": order.order_items.map(item => item.ticket_types?.name || "General").join(", "),
    };

    let result = text;
    for (const [variable, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(variable, "g"), value);
    }

    return result;
  }

  // Render email template blocks to HTML
  renderEmailFromTemplate(
    template: any,
    event: Event,
    order: Order
  ): string {
    const theme = template.theme || {};

    let html = `
      <div style="font-family: ${theme.fontFamily || "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif"}; max-width: 600px; margin: 0 auto; background: ${theme.backgroundColor || '#ffffff'}; border: 1px solid ${theme.borderColor || '#e5e7eb'}; border-radius: 8px;">
    `;

    // Process each block in the template
    for (const block of template.blocks || []) {
      if (block.hidden) continue;

      switch (block.type) {
        case "header":
          html += this.renderHeaderBlock(block, theme, event, order);
          break;
        case "text":
          html += this.renderTextBlock(block, theme, event, order);
          break;
        case "event_details":
          html += this.renderEventDetailsBlock(block, theme, event, order);
          break;
        case "event_countdown":
          html += this.renderEventCountdownBlock(block, theme, event, order);
          break;
        case "attendance_info":
          html += this.renderAttendanceInfoBlock(block, theme, event, order);
          break;
        case "venue_directions":
          html += this.renderVenueDirectionsBlock(block, theme, event, order);
          break;
        case "check_in_info":
          html += this.renderCheckInInfoBlock(block, theme, event, order);
          break;
        case "weather_info":
          html += this.renderWeatherInfoBlock(block, theme, event, order);
          break;
        case "recommended_items":
          html += this.renderRecommendedItemsBlock(block, theme, event, order);
          break;
        case "important_updates":
          html += this.renderImportantUpdatesBlock(block, theme, event, order);
          break;
        case "divider":
          html += `<hr style="border: 0; border-top: 1px solid ${theme.borderColor || '#e5e7eb'}; margin: 16px 20px;" />`;
          break;
        case "button":
          html += this.renderButtonBlock(block, theme, event, order);
          break;
        case "custom_message":
          html += this.renderCustomMessageBlock(block, theme, event, order);
          break;
        case "footer":
          html += this.renderFooterBlock(block, theme, event, order);
          break;
      }
    }

    html += `</div>`;
    return html;
  }

  private renderHeaderBlock(block: any, theme: any, event: Event, order: Order): string {
    const title = this.replacePersonalizationVariables(block.title || "Event Reminder", event, order);
    const subtitle = block.subtitle ? this.replacePersonalizationVariables(block.subtitle, event, order) : "";

    return `
      <div style="background: ${theme.headerColor || '#1f2937'}; color: white; padding: 20px; text-align: ${block.align || 'center'};">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">${title}</h1>
        ${subtitle ? `<p style="margin: 8px 0 0 0; opacity: 0.9;">${subtitle}</p>` : ''}
      </div>
    `;
  }

  private renderTextBlock(block: any, theme: any, event: Event, order: Order): string {
    const content = this.replacePersonalizationVariables(block.html || "", event, order);

    return `
      <div style="padding: 16px 20px; color: ${theme.textColor || '#374151'}; line-height: 1.6;">
        ${content}
      </div>
    `;
  }

  private renderEventDetailsBlock(block: any, theme: any, event: Event, order: Order): string {
    const eventDate = new Date(event.event_date);

    return `
      <div style="background: ${theme.accentColor || '#f9fafb'}; border: 1px solid ${theme.borderColor || '#e5e7eb'}; margin: 16px 20px; padding: 16px; border-radius: 8px;">
        <h3 style="color: ${theme.textColor || '#374151'}; margin: 0 0 12px 0; font-size: 18px;">${event.name}</h3>
        <div style="color: ${theme.textColor || '#374151'};">
          <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${eventDate.toLocaleDateString()}</p>
          <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${eventDate.toLocaleTimeString()}</p>
          ${event.venue ? `<p style="margin: 8px 0;"><strong>📍 Venue:</strong> ${event.venue}</p>` : ''}
        </div>
      </div>
    `;
  }

  private renderEventCountdownBlock(block: any, theme: any, event: Event, order: Order): string {
    const eventDate = new Date(event.event_date);
    const now = new Date();
    const diffTime = eventDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.ceil(diffTime / (1000 * 60 * 60));

    const customText = this.replacePersonalizationVariables(block.customText || "Don't miss out!", event, order);
    const isUrgent = daysUntil <= (block.urgencyThreshold || 3);

    const bgColor = isUrgent ? '#fef2f2' : theme.accentColor || '#f9fafb';
    const borderColor = isUrgent ? '#fca5a5' : theme.borderColor || '#e5e7eb';
    const textColor = isUrgent ? '#dc2626' : theme.textColor || '#374151';

    return `
      <div style="background: ${bgColor}; border: 2px solid ${borderColor}; margin: 16px 20px; padding: 24px; border-radius: 12px; text-align: ${block.align || 'center'};">
        <h3 style="color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 700;">${customText}</h3>
        <div style="display: flex; justify-content: center; gap: 20px;">
          ${block.showDays && daysUntil > 0 ? `
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: ${textColor};">${daysUntil}</div>
              <div style="color: ${theme.textColor || '#374151'}; font-size: 12px;">DAYS</div>
            </div>
          ` : ''}
          ${block.showHours && hoursUntil > 0 ? `
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: ${textColor};">${hoursUntil % 24}</div>
              <div style="color: ${theme.textColor || '#374151'}; font-size: 12px;">HOURS</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderAttendanceInfoBlock(block: any, theme: any, event: Event, order: Order): string {
    const customMessage = this.replacePersonalizationVariables(block.customMessage || "Here's a reminder of your attendance details:", event, order);
    const ticketCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
    const ticketTypes = order.order_items.map(item => item.ticket_types?.name || "General").join(", ");

    return `
      <div style="background: ${theme.accentColor || '#f9fafb'}; border: 1px solid ${theme.borderColor || '#e5e7eb'}; margin: 16px 20px; padding: 16px; border-radius: 8px;">
        <h3 style="color: ${theme.textColor || '#374151'}; margin: 0 0 12px 0;">${customMessage}</h3>
        ${block.showTicketCount ? `<p style="color: ${theme.textColor || '#374151'}; margin: 8px 0;"><strong>Tickets:</strong> ${ticketCount} tickets</p>` : ''}
        ${block.showTicketTypes ? `<p style="color: ${theme.textColor || '#374151'}; margin: 8px 0;"><strong>Types:</strong> ${ticketTypes}</p>` : ''}
      </div>
    `;
  }

  private renderVenueDirectionsBlock(block: any, theme: any, event: Event, order: Order): string {
    if (!event.venue && !block.customDirections) return '';

    const customDirections = block.customDirections ? this.replacePersonalizationVariables(block.customDirections, event, order) : '';

    return `
      <div style="background: ${theme.accentColor || '#f9fafb'}; border: 1px solid ${theme.borderColor || '#e5e7eb'}; margin: 16px 20px; padding: 16px; border-radius: 8px;">
        <h3 style="color: ${theme.textColor || '#374151'}; margin: 0 0 12px 0;">📍 Venue & Directions</h3>
        ${block.showAddress && event.venue ? `<p style="color: ${theme.textColor || '#374151'}; margin: 8px 0;"><strong>Address:</strong> ${event.venue}</p>` : ''}
        ${block.showMapLink ? `<div style="margin: 12px 0;"><a href="#" style="background: ${theme.buttonColor || '#1f2937'}; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Directions</a></div>` : ''}
        ${block.showParkingInfo ? `<p style="color: ${theme.textColor || '#374151'}; margin: 8px 0;"><strong>Parking:</strong> Street parking and nearby parking garages available</p>` : ''}
        ${customDirections ? `<p style="color: ${theme.textColor || '#374151'}; margin: 8px 0;">${customDirections}</p>` : ''}
      </div>
    `;
  }

  private renderCheckInInfoBlock(block: any, theme: any, event: Event, order: Order): string {
    const customInstructions = block.customInstructions ? this.replacePersonalizationVariables(block.customInstructions, event, order) : '';
    const checkInProcess = block.showCheckInProcess || [];

    return `
      <div style="background: ${theme.accentColor || '#f9fafb'}; border: 1px solid ${theme.borderColor || '#e5e7eb'}; margin: 16px 20px; padding: 16px; border-radius: 8px;">
        <h3 style="color: ${theme.textColor || '#374151'}; margin: 0 0 12px 0;">✅ Check-in Information</h3>
        ${customInstructions ? `<p style="color: ${theme.textColor || '#374151'}; margin: 0 0 12px 0;">${customInstructions}</p>` : ''}
        ${block.showArrivalTime ? `<p style="color: ${theme.textColor || '#374151'}; margin: 8px 0;"><strong>Recommended Arrival:</strong> 15 minutes before event start</p>` : ''}
        ${checkInProcess.length > 0 ? `
          <h4 style="color: ${theme.textColor || '#374151'}; margin: 12px 0 8px 0;">Check-in Process:</h4>
          <ol style="margin: 0; padding-left: 20px;">
            ${checkInProcess.map((step: string) => `<li style="color: ${theme.textColor || '#374151'}; margin: 4px 0;">${step}</li>`).join('')}
          </ol>
        ` : ''}
      </div>
    `;
  }

  private renderWeatherInfoBlock(block: any, theme: any, event: Event, order: Order): string {
    const customMessage = this.replacePersonalizationVariables(block.customMessage || "Check the weather and dress accordingly!", event, order);

    return `
      <div style="background: ${theme.accentColor || '#f9fafb'}; border: 1px solid ${theme.borderColor || '#e5e7eb'}; margin: 16px 20px; padding: 16px; border-radius: 8px;">
        <h3 style="color: ${theme.textColor || '#374151'}; margin: 0 0 12px 0;">🌤️ Weather Information</h3>
        <p style="color: ${theme.textColor || '#374151'}; margin: 0;">${customMessage}</p>
        ${block.showForecast ? `<p style="color: ${theme.textColor || '#374151'}; margin: 12px 0;"><strong>Forecast:</strong> Check local weather forecast for event day</p>` : ''}
        ${block.showRecommendations ? `<p style="color: ${theme.textColor || '#374151'}; margin: 8px 0;"><strong>Recommendation:</strong> Dress appropriately for weather conditions</p>` : ''}
      </div>
    `;
  }

  private renderRecommendedItemsBlock(block: any, theme: any, event: Event, order: Order): string {
    const title = this.replacePersonalizationVariables(block.title || "What to bring:", event, order);
    const categories = block.categories || {};

    let itemsHtml = '';

    if (categories.bring && categories.bring.length > 0) {
      itemsHtml += `
        <div style="margin: 8px 0;">
          <strong style="color: ${theme.headerColor || '#1f2937'};">✅ Bring:</strong>
          <ul style="margin: 4px 0; padding-left: 20px;">
            ${categories.bring.map((item: string) => `<li style="color: ${theme.textColor || '#374151'};">${item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (categories.wear && categories.wear.length > 0) {
      itemsHtml += `
        <div style="margin: 8px 0;">
          <strong style="color: ${theme.headerColor || '#1f2937'};">👕 Wear:</strong>
          <ul style="margin: 4px 0; padding-left: 20px;">
            ${categories.wear.map((item: string) => `<li style="color: ${theme.textColor || '#374151'};">${item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (categories.avoid && categories.avoid.length > 0) {
      itemsHtml += `
        <div style="margin: 8px 0;">
          <strong style="color: ${theme.headerColor || '#1f2937'};">❌ Avoid:</strong>
          <ul style="margin: 4px 0; padding-left: 20px;">
            ${categories.avoid.map((item: string) => `<li style="color: ${theme.textColor || '#374151'};">${item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    return `
      <div style="background: ${theme.accentColor || '#f9fafb'}; border: 1px solid ${theme.borderColor || '#e5e7eb'}; margin: 16px 20px; padding: 16px; border-radius: 8px;">
        <h3 style="color: ${theme.textColor || '#374151'}; margin: 0 0 12px 0;">${title}</h3>
        ${itemsHtml || `<p style="color: ${theme.textColor || '#374151'}; margin: 0;">No specific recommendations at this time.</p>`}
      </div>
    `;
  }

  private renderImportantUpdatesBlock(block: any, theme: any, event: Event, order: Order): string {
    const title = this.replacePersonalizationVariables(block.title || "Important Updates", event, order);
    const updates = block.updates || [];

    if (updates.length === 0) {
      return `
        <div style="background: ${theme.accentColor || '#f9fafb'}; border: 1px solid ${theme.borderColor || '#e5e7eb'}; margin: 16px 20px; padding: 16px; border-radius: 8px;">
          <h3 style="color: ${theme.textColor || '#374151'}; margin: 0;">${title}</h3>
          <p style="color: ${theme.textColor || '#374151'}; margin: 8px 0 0 0;">No updates at this time.</p>
        </div>
      `;
    }

    const updatesHtml = updates.map((update: string) =>
      `<li style="color: ${theme.textColor || '#374151'}; margin: 4px 0;">${this.replacePersonalizationVariables(update, event, order)}</li>`
    ).join('');

    return `
      <div style="background: ${theme.accentColor || '#f9fafb'}; border: 1px solid ${theme.borderColor || '#e5e7eb'}; margin: 16px 20px; padding: 16px; border-radius: 8px;">
        <h3 style="color: ${theme.textColor || '#374151'}; margin: 0 0 12px 0;">${title}</h3>
        <ul style="margin: 0; padding-left: 20px;">${updatesHtml}</ul>
      </div>
    `;
  }

  private renderButtonBlock(block: any, theme: any, event: Event, order: Order): string {
    const label = this.replacePersonalizationVariables(block.label || "Click Here", event, order);
    const url = this.replacePersonalizationVariables(block.url || "#", event, order);

    return `
      <div style="padding: 16px 20px; text-align: ${block.align || 'center'};">
        <a href="${url}" style="background: ${theme.buttonColor || '#1f2937'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">${label}</a>
      </div>
    `;
  }

  private renderCustomMessageBlock(block: any, theme: any, event: Event, order: Order): string {
    const message = this.replacePersonalizationVariables(block.message || "", event, order);

    return `
      <div style="padding: 16px 20px; color: ${theme.textColor || '#374151'}; line-height: 1.6;">
        ${message}
      </div>
    `;
  }

  private renderFooterBlock(block: any, theme: any, event: Event, order: Order): string {
    const text = this.replacePersonalizationVariables(block.text || "", event, order);

    return `
      <div style="background: ${theme.accentColor || '#f9fafb'}; padding: 16px; text-align: center; border-top: 1px solid ${theme.borderColor || '#e5e7eb'};">
        <small style="color: #999;">${text}</small>
      </div>
    `;
  }

  // Send reminder email to a recipient
  async sendReminderEmail(
    campaign: ReminderCampaign,
    event: Event,
    order: Order
  ): Promise<boolean> {
    try {
      const subject = this.replacePersonalizationVariables(campaign.subject_line, event, order);
      const htmlContent = this.renderEmailFromTemplate(campaign.template, event, order);

      const emailData = {
        from: `${event.organizations.name} <noreply@ticketflo.org>`,
        to: order.customer_email,
        subject: subject,
        html: htmlContent,
      };

      const result = await this.resend.emails.send(emailData);

      if (result.error) {
        logStep("Email send error", { error: result.error, recipient: order.customer_email });
        return false;
      }

      logStep("Email sent successfully", {
        recipient: order.customer_email,
        messageId: result.data?.id,
        campaign: campaign.name
      });

      // Track successful send in recipient table
      await this.trackEmailSent(campaign.id, order.id, order.customer_email, result.data?.id);

      return true;
    } catch (error) {
      logStep("Failed to send email", {
        error: error.message,
        recipient: order.customer_email,
        campaign: campaign.name
      });

      // Track failed send
      await this.trackEmailFailed(campaign.id, order.id, order.customer_email, error.message);
      return false;
    }
  }

  // Track successful email send
  async trackEmailSent(campaignId: string, orderId: string, email: string, messageId?: string) {
    await this.supabase
      .from("reminder_email_recipients")
      .insert({
        campaign_id: campaignId,
        order_id: orderId,
        email: email,
        customer_name: null,
        status: 'sent',
        sent_at: new Date().toISOString(),
        email_service_id: messageId,
      });
  }

  // Track failed email send
  async trackEmailFailed(campaignId: string, orderId: string, email: string, errorMessage: string) {
    await this.supabase
      .from("reminder_email_recipients")
      .insert({
        campaign_id: campaignId,
        order_id: orderId,
        email: email,
        customer_name: null,
        status: 'failed',
        sent_at: new Date().toISOString(),
        error_message: errorMessage,
      });
  }

  // Update campaign status
  async updateCampaignStatus(campaignId: string, status: string, emailsSent: number) {
    await this.supabase
      .from("reminder_email_campaigns")
      .update({
        status: status,
        emails_sent: emailsSent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
  }

  // Process a single campaign
  async processCampaign(campaign: ReminderCampaign): Promise<{ sent: number; failed: number }> {
    logStep("Processing campaign", { campaignId: campaign.id, name: campaign.name });

    // Update status to sending
    await this.updateCampaignStatus(campaign.id, "sending", 0);

    // Get event details
    const event = await this.getEventWithOrganization(campaign.event_id);

    // Get recipients
    const recipients = await this.getCampaignRecipients(campaign, event);

    logStep("Recipients found", { count: recipients.length, campaign: campaign.name });

    let sent = 0;
    let failed = 0;

    // Send to each recipient
    for (const order of recipients) {
      const success = await this.sendReminderEmail(campaign, event, order);
      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update final campaign status
    const finalStatus = sent > 0 ? "sent" : "failed";
    await this.updateCampaignStatus(campaign.id, finalStatus, sent);

    logStep("Campaign processing complete", {
      campaignId: campaign.id,
      sent,
      failed,
      totalRecipients: recipients.length
    });

    return { sent, failed };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Reminder campaign processor started");

    const emailService = new ReminderEmailService();

    // Get campaigns ready to send
    const campaigns = await emailService.getCampaignsReadyToSend();

    logStep("Campaigns found", { count: campaigns.length });

    if (campaigns.length === 0) {
      return new Response(JSON.stringify({
        message: "No campaigns ready to send",
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let totalSent = 0;
    let totalFailed = 0;

    // Process each campaign
    for (const campaign of campaigns) {
      const result = await emailService.processCampaign(campaign);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    logStep("All campaigns processed", {
      campaignsProcessed: campaigns.length,
      totalSent,
      totalFailed
    });

    return new Response(JSON.stringify({
      success: true,
      campaignsProcessed: campaigns.length,
      emailsSent: totalSent,
      emailsFailed: totalFailed,
      message: `Processed ${campaigns.length} campaigns, sent ${totalSent} emails`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});