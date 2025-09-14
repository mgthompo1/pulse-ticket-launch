import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { OrderData, OrderItem, ProcessedTicket } from './types.ts';
import { ValidationUtils, ErrorUtils } from './utils.ts';
import { PDF_CONFIG } from './config.ts';

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
  }

  async getOrderWithTickets(orderId: string): Promise<{ order: OrderData; tickets: ProcessedTicket[] }> {
    // Validate order ID
    const validation = ValidationUtils.validateOrderId(orderId);
    if (!validation.isValid) {
      throw ErrorUtils.createError(validation.error!, 'VALIDATION_ERROR');
    }

    try {
      // Fetch order data with related information
      const { data: order, error: orderError } = await this.supabase
        .from("orders")
        .select(`
          id,
          customer_name,
          customer_email,
          events!inner(
            name,
            event_date,
            venue,
            logo_url,
            ticket_customization,
            organizations!inner(
              name,
              logo_url
            )
          )
        `)
        .eq("id", validation.sanitizedValue)
        .single();

      if (orderError) {
        ErrorUtils.logError('Order fetch failed', orderError, { orderId });
        throw ErrorUtils.createError(
          PDF_CONFIG.ERROR_MESSAGES.ORDER_NOT_FOUND,
          'ORDER_NOT_FOUND',
          { orderId, dbError: orderError.message }
        );
      }

      if (!order) {
        throw ErrorUtils.createError(
          PDF_CONFIG.ERROR_MESSAGES.ORDER_NOT_FOUND,
          'ORDER_NOT_FOUND',
          { orderId }
        );
      }

      console.log('Order retrieved:', {
        orderId: order.id,
        customerName: order.customer_name,
        eventName: (order.events as any).name,
        organizationName: ((order.events as any).organizations as any).name
      });

      // Fetch order items with tickets
      const { data: orderItems, error: itemsError } = await this.supabase
        .from("order_items")
        .select(`
          id,
          quantity,
          unit_price,
          item_type,
          ticket_types!inner(name),
          tickets!inner(
            id,
            ticket_code,
            status
          )
        `)
        .eq("order_id", validation.sanitizedValue)
        .eq("item_type", "ticket"); // Only fetch ticket items, not merchandise

      if (itemsError) {
        ErrorUtils.logError('Order items fetch failed', itemsError, { orderId });
        throw ErrorUtils.createError(
          'Failed to fetch order items',
          'ITEMS_FETCH_ERROR',
          { orderId, dbError: itemsError.message }
        );
      }

      if (!orderItems?.length) {
        throw ErrorUtils.createError(
          PDF_CONFIG.ERROR_MESSAGES.NO_TICKETS_FOUND,
          'NO_TICKETS_FOUND',
          { orderId }
        );
      }

      // Process and flatten tickets
      const tickets: ProcessedTicket[] = [];
      for (const item of orderItems) {
        // Handle potentially array-returned relations
        const ticketTypeName = Array.isArray(item.ticket_types)
          ? item.ticket_types[0]?.name
          : (item.ticket_types as any)?.name;

        const ticketsArray = Array.isArray(item.tickets) ? item.tickets : [item.tickets];

        for (const ticket of ticketsArray) {
          if (ticket) {
            tickets.push({
              id: ticket.id,
              ticket_code: ValidationUtils.sanitizeText(ticket.ticket_code, 'INVALID'),
              status: ValidationUtils.sanitizeText(ticket.status, 'valid'),
              order_item: item as any,
              ticket_type_name: ValidationUtils.sanitizeText(ticketTypeName, 'General Admission'),
              unit_price: Number(item.unit_price) || 0,
            });
          }
        }
      }

      // Validate ticket count limits
      if (tickets.length > PDF_CONFIG.LIMITS.MAX_TICKETS_PER_PDF) {
        throw ErrorUtils.createError(
          `Too many tickets: ${tickets.length}. Maximum allowed: ${PDF_CONFIG.LIMITS.MAX_TICKETS_PER_PDF}`,
          'TICKET_LIMIT_EXCEEDED',
          { ticketCount: tickets.length, limit: PDF_CONFIG.LIMITS.MAX_TICKETS_PER_PDF }
        );
      }

      console.log(`Found ${tickets.length} tickets to process`);

      // Handle potentially array-returned relations by accessing first element or direct object
      const eventsData = Array.isArray(order.events) ? order.events[0] : order.events;
      const orgsData = Array.isArray(eventsData?.organizations) ? eventsData.organizations[0] : eventsData?.organizations;

      return {
        order: {
          id: order.id,
          customer_name: ValidationUtils.sanitizeText(order.customer_name, 'Guest'),
          customer_email: ValidationUtils.sanitizeText(order.customer_email, ''),
          events: {
            name: ValidationUtils.sanitizeText(eventsData?.name, 'Event'),
            event_date: eventsData?.event_date || new Date().toISOString(),
            venue: ValidationUtils.sanitizeText(eventsData?.venue),
            logo_url: eventsData?.logo_url,
            ticket_customization: eventsData?.ticket_customization,
            organizations: {
              name: ValidationUtils.sanitizeText(orgsData?.name, 'Organization'),
              logo_url: orgsData?.logo_url,
            },
          },
        },
        tickets,
      };
    } catch (error) {
      // Re-throw our custom errors, wrap unknown errors
      if (error instanceof Error && (error as any).code) {
        throw error;
      }
      
      ErrorUtils.logError('Database operation failed', error, { orderId });
      throw ErrorUtils.createError(
        'Database operation failed',
        'DATABASE_ERROR',
        { orderId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  async logPdfGeneration(orderId: string, success: boolean, metadata?: any): Promise<void> {
    try {
      // Log PDF generation attempt for analytics/debugging
      await this.supabase
        .from("pdf_generation_logs")
        .insert({
          order_id: orderId,
          success,
          generated_at: new Date().toISOString(),
          metadata: metadata || {},
        });
    } catch (error) {
      // Don't fail PDF generation if logging fails
      console.warn('Failed to log PDF generation:', error);
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("orders")
        .select("id")
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }
}
