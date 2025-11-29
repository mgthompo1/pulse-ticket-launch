import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, AlertCircle, Calendar, Plus, Minus, DollarSign, Send, CreditCard, Gift } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatEventDateRange } from "@/lib/dateUtils";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  payment_methods?: {
    stripe?: {
      customer_id: string;
      payment_method_id: string;
      last4: string;
      brand: string;
    };
  };
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  event_end_date?: string | null;
  status: string;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity_available: number;
}

interface CreateCustomOrderModalProps {
  contact: Contact | null;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Helper function to generate order email with payment link
const generateOrderEmail = (
  customerName: string,
  event: Event,
  total: number,
  ticketTypes: TicketType[],
  selectedTickets: { [key: string]: number },
  checkoutUrl: string
): string => {
  const ticketsSummary = Object.entries(selectedTickets)
    .filter(([_, qty]) => qty > 0)
    .map(([ticketTypeId, qty]) => {
      const tt = ticketTypes.find(t => t.id === ticketTypeId);
      return `${qty}x ${tt?.name} @ $${tt?.price.toFixed(2)} = $${((tt?.price || 0) * qty).toFixed(2)}`;
    })
    .join('<br/>');

  return `
    <p>Hi ${customerName},</p>

    <p>We've prepared a custom order for you for <strong>${event.name}</strong>!</p>

    <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 6px;">
      <strong>Order Summary:</strong><br/>
      ${ticketsSummary}<br/>
      <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;"/>
      <strong>Total: $${total.toFixed(2)}</strong>
    </div>

    <p>Click the button below to complete your purchase:</p>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${checkoutUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Complete Purchase
      </a>
    </div>

    <p>Or copy this link: <a href="${checkoutUrl}">${checkoutUrl}</a></p>

    <p>Event Date: ${formatEventDateRange(
      event.event_date,
      event.event_end_date,
      { dateStyle: 'full' },
      'en-US'
    )}</p>

    <p>If you have any questions, just reply to this email!</p>
  `;
};

// Helper function to generate receipt email for completed payment
const generateReceiptEmailForOrder = (
  customerName: string,
  event: Event,
  total: number,
  ticketTypes: TicketType[],
  selectedTickets: { [key: string]: number }
): string => {
  const ticketsSummary = Object.entries(selectedTickets)
    .filter(([_, qty]) => qty > 0)
    .map(([ticketTypeId, qty]) => {
      const tt = ticketTypes.find(t => t.id === ticketTypeId);
      return `${qty}x ${tt?.name} @ $${tt?.price.toFixed(2)} = $${((tt?.price || 0) * qty).toFixed(2)}`;
    })
    .join('<br/>');

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background-color: #16a34a; color: #fff; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">ORDER CONFIRMED</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Payment Successful ✓</p>
      </div>

      <div style="padding: 30px; background-color: #fff;">
        <p>Hi ${customerName},</p>

        <p>Your order for <strong>${event.name}</strong> has been confirmed!</p>

        <div style="margin: 20px 0; padding: 15px; background-color: #dcfce7; border: 2px solid #16a34a; border-radius: 6px;">
          <strong>Order Summary:</strong><br/>
          ${ticketsSummary}<br/>
          <hr style="margin: 10px 0; border: none; border-top: 1px solid #16a34a;"/>
          <strong style="color: #16a34a; font-size: 18px;">Amount Paid: $${total.toFixed(2)}</strong>
        </div>

        <div style="margin: 20px 0; padding: 15px; background-color: #f0fdf4; border-radius: 6px;">
          <strong>Event Date:</strong><br/>
          ${formatEventDateRange(
            event.event_date,
            event.event_end_date,
            { dateStyle: 'full' },
            'en-US'
          )}
        </div>

        <div style="margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 16px; color: #166534;">
            <strong>Your tickets have been confirmed!</strong><br/>
            <span style="font-size: 14px;">You will receive your tickets via email shortly.</span>
          </p>
        </div>

        <p>If you have any questions, just reply to this email!</p>
      </div>
    </div>
  `;
};

// Helper function to generate comp ticket email
const generateCompTicketEmail = (
  customerName: string,
  event: Event,
  ticketTypes: TicketType[],
  selectedTickets: { [key: string]: number }
): string => {
  const ticketsSummary = Object.entries(selectedTickets)
    .filter(([_, qty]) => qty > 0)
    .map(([ticketTypeId, qty]) => {
      const tt = ticketTypes.find(t => t.id === ticketTypeId);
      return `${qty}x ${tt?.name}`;
    })
    .join('<br/>');

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background-color: #7c3aed; color: #fff; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">COMPLIMENTARY TICKETS</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px;">You're on the list!</p>
      </div>

      <div style="padding: 30px; background-color: #fff;">
        <p>Hi ${customerName},</p>

        <p>Great news! You've been issued complimentary tickets for <strong>${event.name}</strong>!</p>

        <div style="margin: 20px 0; padding: 15px; background-color: #f3e8ff; border: 2px solid #7c3aed; border-radius: 6px;">
          <strong>Your Tickets:</strong><br/>
          ${ticketsSummary}
        </div>

        <div style="margin: 20px 0; padding: 15px; background-color: #faf5ff; border-radius: 6px;">
          <strong>Event Date:</strong><br/>
          ${formatEventDateRange(
            event.event_date,
            event.event_end_date,
            { dateStyle: 'full' },
            'en-US'
          )}
        </div>

        <div style="margin: 30px 0; padding: 20px; background-color: #f3e8ff; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 16px; color: #6d28d9;">
            <strong>Your tickets have been confirmed!</strong><br/>
            <span style="font-size: 14px;">You will receive your tickets via email shortly.</span>
          </p>
        </div>

        <p>If you have any questions, just reply to this email!</p>
      </div>
    </div>
  `;
};

export const CreateCustomOrderModal: React.FC<CreateCustomOrderModalProps> = ({
  contact,
  organizationId,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>({});
  const [paymentMethod, setPaymentMethod] = useState<"link" | "charge" | "comp">("link");

  useEffect(() => {
    if (open && organizationId) {
      loadEvents();
    }
  }, [open, organizationId]);

  useEffect(() => {
    if (selectedEventId) {
      loadTicketTypes(selectedEventId);
      setSelectedTickets({});
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, event_end_date, status")
        .eq("organization_id", organizationId)
        .in("status", ["published", "draft"])
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error("Error loading events:", err);
    }
  };

  const loadTicketTypes = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("id, name, price, quantity_available")
        .eq("event_id", eventId)
        .order("price", { ascending: true });

      if (error) throw error;
      setTicketTypes(data || []);
    } catch (err) {
      console.error("Error loading ticket types:", err);
    }
  };

  const updateQuantity = (ticketTypeId: string, change: number) => {
    setSelectedTickets(prev => {
      const current = prev[ticketTypeId] || 0;
      const newValue = Math.max(0, current + change);

      if (newValue === 0) {
        const { [ticketTypeId]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [ticketTypeId]: newValue };
    });
  };

  const calculateTotal = () => {
    return ticketTypes.reduce((total, tt) => {
      const qty = selectedTickets[tt.id] || 0;
      return total + (tt.price * qty);
    }, 0);
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const handleCreateOrder = async () => {
    if (!contact || !selectedEventId) return;

    const totalTickets = getTotalTickets();
    if (totalTickets === 0) {
      setError("Please select at least one ticket");
      return;
    }

    if (paymentMethod === "charge" && !contact.payment_methods?.stripe?.payment_method_id) {
      setError("No payment method on file for this customer");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const selectedEvent = events.find(e => e.id === selectedEventId);
      if (!selectedEvent) throw new Error("Event not found");

      // Build items array
      const items = Object.entries(selectedTickets)
        .filter(([_, qty]) => qty > 0)
        .map(([ticketTypeId, quantity]) => ({
          ticket_type_id: ticketTypeId,
          quantity,
        }));

      const customerName = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'there';
      const total = calculateTotal();

      if (paymentMethod === "charge") {
        // Charge card directly
        const { data: chargeData, error: chargeError } = await supabase.functions.invoke('charge-stored-card', {
          body: {
            event_id: selectedEventId,
            contact_id: contact.id,
            items,
            customer_email: contact.email,
            customer_name: customerName,
          },
        });

        if (chargeError) throw chargeError;
        if (!chargeData?.success) throw new Error("Payment failed");

        // Send receipt email
        const receiptEmailBody = generateReceiptEmailForOrder(
          customerName,
          selectedEvent,
          total,
          ticketTypes,
          selectedTickets
        );

        const { error: emailError } = await supabase.functions.invoke('send-crm-email', {
          body: {
            contactId: contact.id,
            organizationId: organizationId,
            subject: `Order Confirmed - ${selectedEvent.name}`,
            bodyHtml: receiptEmailBody,
          },
        });

        if (emailError) console.error("Error sending receipt:", emailError);

        toast({
          title: "Payment Successful",
          description: `Card charged $${total.toFixed(2)}. Receipt sent to ${contact.email}`,
        });
      } else if (paymentMethod === "comp") {
        // Create complimentary order directly without payment
        // 1. Create order with status 'completed' and total of $0
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            event_id: selectedEventId,
            customer_email: contact.email,
            customer_name: customerName,
            customer_phone: contact.payment_methods?.stripe ? undefined : undefined,
            status: 'completed',
            total_amount: 0,
            subtotal: 0,
            platform_fee: 0,
            payment_method_type: 'comp',
            notes: 'Complimentary tickets issued via CRM',
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // 2. Create order items
        const orderItems = items.map(item => ({
          order_id: order.id,
          ticket_type_id: item.ticket_type_id,
          quantity: item.quantity,
          unit_price: 0,
          total_price: 0,
          item_type: 'ticket',
        }));

        const { data: createdOrderItems, error: orderItemsError } = await supabase
          .from('order_items')
          .insert(orderItems)
          .select();

        if (orderItemsError) throw orderItemsError;

        // 3. Create tickets for each order item
        const ticketsToCreate: { order_item_id: string; ticket_code: string; status: string; checked_in: boolean }[] = [];
        for (const orderItem of createdOrderItems) {
          for (let i = 0; i < orderItem.quantity; i++) {
            const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            ticketsToCreate.push({
              order_item_id: orderItem.id,
              ticket_code: ticketCode,
              status: 'valid',
              checked_in: false,
            });
          }
        }

        const { error: ticketsError } = await supabase
          .from('tickets')
          .insert(ticketsToCreate);

        if (ticketsError) throw ticketsError;

        // 4. Send comp ticket confirmation email
        const compEmailBody = generateCompTicketEmail(
          customerName,
          selectedEvent,
          ticketTypes,
          selectedTickets
        );

        const { error: emailError } = await supabase.functions.invoke('send-crm-email', {
          body: {
            contactId: contact.id,
            organizationId: organizationId,
            subject: `Your Complimentary Tickets - ${selectedEvent.name}`,
            bodyHtml: compEmailBody,
          },
        });

        if (emailError) console.error("Error sending comp ticket email:", emailError);

        // 5. Send actual tickets via the ticket email function
        try {
          await supabase.functions.invoke('send-ticket-email-v2', {
            body: { orderId: order.id }
          });
        } catch (ticketEmailError) {
          console.error("Error sending ticket email:", ticketEmailError);
        }

        toast({
          title: "Comp Tickets Issued",
          description: `${totalTickets} complimentary ${totalTickets === 1 ? 'ticket' : 'tickets'} sent to ${contact.email}`,
        });
      } else {
        // Create checkout link via edge function
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-link', {
          body: {
            event_id: selectedEventId,
            contact_id: contact.id,
            items,
            customer_email: contact.email,
            customer_name: customerName,
          },
        });

        if (checkoutError) throw checkoutError;
        if (!checkoutData?.checkout_url) throw new Error("Failed to create checkout link");

        // Send email with checkout link
        const emailBody = generateOrderEmail(
          customerName,
          selectedEvent,
          total,
          ticketTypes,
          selectedTickets,
          checkoutData.checkout_url
        );

        const { error: emailError } = await supabase.functions.invoke('send-crm-email', {
          body: {
            contactId: contact.id,
            organizationId: organizationId,
            subject: `Your Custom Order for ${selectedEvent.name}`,
            bodyHtml: emailBody,
          },
        });

        if (emailError) throw emailError;

        toast({
          title: "Custom Order Created",
          description: `Payment link sent to ${contact.email}`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error creating custom order:", err);
      setError(err.message || "Failed to create custom order");
    } finally {
      setLoading(false);
    }
  };

  if (!contact) return null;

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const total = calculateTotal();
  const totalTickets = getTotalTickets();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Custom Order
          </DialogTitle>
          <DialogDescription>
            Build a custom ticket order for {contact.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm">
                <strong>Customer:</strong> {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
                <br />
                <strong>Email:</strong> {contact.email}
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="event">Select Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{event.name}</span>
                      <Badge variant={event.status === 'published' ? 'default' : 'secondary'} className="ml-2">
                        {event.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEvent && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <strong>Event Date:</strong>{' '}
                {formatEventDateRange(
                  selectedEvent.event_date,
                  selectedEvent.event_end_date,
                  { dateStyle: 'full' },
                  'en-US'
                )}
              </AlertDescription>
            </Alert>
          )}

          {selectedEventId && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
              <Label className="text-base font-semibold">Order Type</Label>
              <RadioGroup value={paymentMethod} onValueChange={(value: "link" | "charge" | "comp") => setPaymentMethod(value)}>
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="link" id="payment-link-order" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="payment-link-order" className="font-medium cursor-pointer">
                      Send Payment Link
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Email order with payment link - customer pays online
                    </p>
                  </div>
                </div>
                {contact.payment_methods?.stripe?.payment_method_id && (
                  <div className="flex items-start space-x-3 space-y-0">
                    <RadioGroupItem value="charge" id="charge-card-order" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="charge-card-order" className="font-medium cursor-pointer flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Charge Card on File
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Charge {contact.payment_methods.stripe.brand} •••• {contact.payment_methods.stripe.last4} immediately & send receipt
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="comp" id="comp-ticket-order" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="comp-ticket-order" className="font-medium cursor-pointer flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Complimentary Tickets
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Issue free tickets immediately - no payment required
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {selectedEventId && ticketTypes.length > 0 && (
            <div className="space-y-3">
              <Label>Select Tickets</Label>
              <div className="border rounded-lg divide-y">
                {ticketTypes.map((ticketType) => (
                  <div key={ticketType.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{ticketType.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ${ticketType.price.toFixed(2)} each
                        {ticketType.quantity_available !== null && (
                          <span className="ml-2">• {ticketType.quantity_available} available</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(ticketType.id, -1)}
                        disabled={!selectedTickets[ticketType.id]}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {selectedTickets[ticketType.id] || 0}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(ticketType.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalTickets > 0 && (
            <Alert className={paymentMethod === "comp" ? "border-purple-500 bg-purple-50" : ""}>
              {paymentMethod === "comp" ? <Gift className="h-4 w-4 text-purple-600" /> : <DollarSign className="h-4 w-4" />}
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span><strong>Total:</strong> {totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'}</span>
                  {paymentMethod === "comp" ? (
                    <span className="text-lg font-bold text-purple-600">FREE</span>
                  ) : (
                    <span className="text-lg font-bold">${total.toFixed(2)}</span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateOrder}
            disabled={loading || !selectedEventId || totalTickets === 0}
            className={paymentMethod === "comp" ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {paymentMethod === "comp" ? "Issuing..." : "Creating..."}
              </>
            ) : paymentMethod === "comp" ? (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Issue Comp Tickets ({totalTickets})
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create & Send ({totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
