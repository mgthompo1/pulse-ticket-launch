// Database operations for the email service
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logStep, EmailServiceError, withRetry } from './utils.ts';
import { Order, OrderItem, Ticket } from './types.ts';
export class DatabaseService {
  client;
  constructor(){
    this.client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        persistSession: false
      }
    });
  }
  // Consolidated order query with all related data
  async getOrderWithDetails(orderId: string): Promise<Order> {
    logStep("Fetching order details", {
      orderId
    });
    const { data: order, error } = await withRetry(async ()=>{
      return await this.client.from("orders").select(`
          *,
          events!inner(
            id,
            name,
            event_date,
            venue,
            description,
            logo_url,
            ticket_delivery_method,
            email_customization,
            organizations!inner(
              id,
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
        `).eq("id", orderId).single();
    });
    if (error || !order) {
      throw new EmailServiceError(`Order not found: ${orderId}`, 'ORDER_NOT_FOUND');
    }
    logStep("Order details retrieved", {
      customerEmail: order.customer_email,
      eventName: order.events.name,
      itemCount: order.order_items.length
    });
    return order;
  }
  // Get payment credentials for organization
  async getPaymentCredentials(organizationId: string): Promise<any> {
    const { data: credentialsArray } = await this.client.rpc('get_payment_credentials_for_processing', {
      p_organization_id: organizationId
    });
    const credentials = credentialsArray?.[0];
    logStep("Payment credentials retrieved", {
      hasCredentials: !!credentials,
      hasStripeKey: !!credentials?.stripe_secret_key,
      orgId: organizationId
    });
    return credentials;
  }
  // Get existing tickets for order items
  async getExistingTickets(orderItemIds: string[]): Promise<any[]> {
    if (orderItemIds.length === 0) return [];
    const { data: existingTickets } = await this.client.from("tickets").select(`
        id,
        ticket_code,
        status,
        order_item_id
      `).in('order_item_id', orderItemIds);
    return existingTickets || [];
  }
  // Generate and insert new tickets
  async generateTickets(orderItems: OrderItem[]): Promise<Ticket[]> {
    const allTickets = [];
    for (const item of orderItems){
      const tickets = [];
      for(let i = 0; i < item.quantity; i++){
        // Generate ticket code
        const { data: ticketCode, error: ticketError } = await this.client.rpc("generate_ticket_code").single();
        if (ticketError) {
          throw new EmailServiceError(`Failed to generate ticket code: ${ticketError.message}`, 'TICKET_GENERATION_FAILED');
        }
        // Insert ticket
        const { error: insertError } = await this.client.from("tickets").insert({
          order_item_id: item.id,
          ticket_code: ticketCode,
          status: "valid"
        });
        if (insertError) {
          throw new EmailServiceError(`Failed to insert ticket: ${insertError.message}`, 'TICKET_INSERT_FAILED');
        }
        tickets.push({
          code: ticketCode,
          type: item.ticket_types?.name || 'General Admission',
          price: item.unit_price
        });
      }
      allTickets.push(...tickets);
    }
    logStep("Tickets generated", {
      count: allTickets.length
    });
    return allTickets;
  }
  // Get QR code URLs for tickets
  async getTicketQrUrls(orderItemIds: string[]): Promise<{[key: string]: string}> {
    if (orderItemIds.length === 0) return {};
    try {
      const { data: dbTickets } = await this.client.from('tickets').select('id, ticket_code, order_item_id').in('order_item_id', orderItemIds);
      if (!dbTickets || dbTickets.length === 0) return {};
      const { data: qrResp } = await this.client.functions.invoke('generate-ticket-qr', {
        body: {
          tickets: dbTickets.map((t)=>({
              id: t.id,
              code: t.ticket_code
            }))
        }
      });
      const urls = qrResp?.urls || {};
      const codeToQrUrl = {};
      for (const ticket of dbTickets){
        if (urls[ticket.id]) {
          (codeToQrUrl as any)[ticket.ticket_code] = urls[ticket.id];
        }
      }
      return codeToQrUrl;
    } catch (error) {
      logStep("Failed to generate QR codes", {
        error
      });
      return {};
    }
  }
  // Update order status
  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const { error } = await this.client.from("orders").update({
      status
    }).eq("id", orderId);
    if (error) {
      throw new EmailServiceError(`Failed to update order status: ${error.message}`, 'ORDER_UPDATE_FAILED');
    }
    logStep("Order status updated", {
      orderId,
      status
    });
  }
  // Send organizer notification
  async sendOrganizerNotification(orderId: string): Promise<void> {
    try {
      await this.client.functions.invoke('send-organiser-notification', {
        body: {
          orderId
        }
      });
      logStep("Organizer notification sent", {
        orderId
      });
    } catch (error) {
      logStep("Failed to send organizer notification", {
        orderId,
        error: error instanceof Error ? error.message : String(error)
      });
    // Don't throw - this is not critical
    }
  }
}
