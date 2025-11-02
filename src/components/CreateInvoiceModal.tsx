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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, AlertCircle, Calendar, Plus, Minus, DollarSign, Send, CreditCard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
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
  status: string;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity_available: number;
}

interface CreateInvoiceModalProps {
  contact: Contact | null;
  organizationId: string;
  organizationName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Helper function to generate invoice email with payment link
const generateInvoiceEmail = (
  customerName: string,
  invoiceNumber: string,
  event: Event,
  total: number,
  ticketTypes: TicketType[],
  selectedTickets: { [key: string]: number },
  checkoutUrl: string,
  organizationName: string,
  contact: Contact
): string => {
  const ticketLineItems = Object.entries(selectedTickets)
    .filter(([_, qty]) => qty > 0)
    .map(([ticketTypeId, qty]) => {
      const tt = ticketTypes.find(t => t.id === ticketTypeId);
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tt?.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${qty}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${tt?.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${((tt?.price || 0) * qty).toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background-color: #000; color: #fff; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">INVOICE</h1>
      </div>

      <div style="padding: 30px; background-color: #fff;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <strong>Bill To:</strong><br/>
            ${customerName}<br/>
            ${contact.email}<br/>
            ${contact.phone || ''}
          </div>
          <div style="text-align: right;">
            <strong>Invoice #:</strong> ${invoiceNumber}<br/>
            <strong>Date:</strong> ${new Date().toLocaleDateString()}<br/>
            <strong>Due Date:</strong> ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="margin: 0 0 10px 0; color: #000;">Event Details</h3>
          <strong>${event.name}</strong><br/>
          ${new Date(event.event_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #000;">Item</th>
              <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #000;">Qty</th>
              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #000;">Price</th>
              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #000;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${ticketLineItems}
          </tbody>
        </table>

        <div style="text-align: right; margin: 20px 0;">
          <div style="font-size: 18px; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
            <strong>Total Due:</strong> <span style="font-size: 24px; color: #000;">$${total.toFixed(2)}</span>
          </div>
        </div>

        <div style="margin: 40px 0; text-align: center;">
          <a href="${checkoutUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Pay Invoice Now
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p><strong>Payment Link:</strong><br/>
          <a href="${checkoutUrl}" style="color: #3b82f6; word-break: break-all;">${checkoutUrl}</a></p>

          <p style="margin-top: 20px;"><strong>Terms:</strong> Payment is due within 7 days. If you have any questions about this invoice, please reply to this email.</p>

          <p style="text-align: center; margin-top: 30px;">Thank you for your business!<br/>
          <strong>${organizationName}</strong></p>
        </div>
      </div>
    </div>
  `;
};

// Helper function to generate receipt email for completed payment
const generateReceiptEmail = (
  customerName: string,
  receiptNumber: string,
  event: Event,
  total: number,
  ticketTypes: TicketType[],
  selectedTickets: { [key: string]: number },
  organizationName: string,
  contact: Contact
): string => {
  const ticketLineItems = Object.entries(selectedTickets)
    .filter(([_, qty]) => qty > 0)
    .map(([ticketTypeId, qty]) => {
      const tt = ticketTypes.find(t => t.id === ticketTypeId);
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tt?.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${qty}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${tt?.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${((tt?.price || 0) * qty).toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background-color: #16a34a; color: #fff; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">RECEIPT</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Payment Successful ✓</p>
      </div>

      <div style="padding: 30px; background-color: #fff;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <strong>Bill To:</strong><br/>
            ${customerName}<br/>
            ${contact.email}<br/>
            ${contact.phone || ''}
          </div>
          <div style="text-align: right;">
            <strong>Receipt #:</strong> ${receiptNumber}<br/>
            <strong>Date:</strong> ${new Date().toLocaleDateString()}<br/>
            <strong>Status:</strong> <span style="color: #16a34a; font-weight: 600;">PAID</span>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="margin: 0 0 10px 0; color: #000;">Event Details</h3>
          <strong>${event.name}</strong><br/>
          ${new Date(event.event_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #16a34a;">Item</th>
              <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #16a34a;">Qty</th>
              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #16a34a;">Price</th>
              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #16a34a;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${ticketLineItems}
          </tbody>
        </table>

        <div style="text-align: right; margin: 20px 0;">
          <div style="font-size: 18px; padding: 15px; background-color: #dcfce7; border: 2px solid #16a34a; border-radius: 8px;">
            <strong>Amount Paid:</strong> <span style="font-size: 24px; color: #16a34a; font-weight: 700;">$${total.toFixed(2)}</span>
          </div>
        </div>

        <div style="margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 16px; color: #166534;">
            <strong>Your tickets have been confirmed!</strong><br/>
            <span style="font-size: 14px;">You will receive your tickets via email shortly.</span>
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p style="margin-top: 20px;">If you have any questions about this purchase, please reply to this email.</p>

          <p style="text-align: center; margin-top: 30px;">Thank you for your business!<br/>
          <strong>${organizationName}</strong></p>
        </div>
      </div>
    </div>
  `;
};

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  contact,
  organizationId,
  organizationName = "Your Organization",
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast} = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>({});
  const [paymentMethod, setPaymentMethod] = useState<"link" | "charge">("link");

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
        .select("id, name, event_date, status")
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

  const handleCreateInvoice = async () => {
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

      const customerName = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Valued Customer';
      const total = calculateTotal();
      const invoiceNumber = `INV-${Date.now()}`;

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

        // Send receipt email instead of invoice
        const receiptEmailBody = generateReceiptEmail(
          customerName,
          invoiceNumber,
          selectedEvent,
          total,
          ticketTypes,
          selectedTickets,
          organizationName,
          contact
        );

        const { error: emailError } = await supabase.functions.invoke('send-crm-email', {
          body: {
            contactId: contact.id,
            organizationId: organizationId,
            subject: `Receipt ${invoiceNumber} - ${selectedEvent.name}`,
            bodyHtml: receiptEmailBody,
          },
        });

        if (emailError) console.error("Error sending receipt:", emailError);

        toast({
          title: "Payment Successful",
          description: `Card charged $${total.toFixed(2)}. Receipt sent to ${contact.email}`,
        });
      } else {
        // Create checkout link (existing flow)
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

        // Send invoice-style email with payment link
        const invoiceEmailBody = generateInvoiceEmail(
          customerName,
          invoiceNumber,
          selectedEvent,
          total,
          ticketTypes,
          selectedTickets,
          checkoutData.checkout_url,
          organizationName,
          contact
        );

        const { error: emailError } = await supabase.functions.invoke('send-crm-email', {
          body: {
            contactId: contact.id,
            organizationId: organizationId,
            subject: `Invoice ${invoiceNumber} - ${selectedEvent.name}`,
            bodyHtml: invoiceEmailBody,
          },
        });

        if (emailError) throw emailError;

        toast({
          title: "Invoice Created & Sent",
          description: `Invoice sent to ${contact.email}`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error creating invoice:", err);
      setError(err.message || "Failed to create invoice");
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
            Create & Send Invoice
          </DialogTitle>
          <DialogDescription>
            Create a professional invoice for {contact.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm">
                <strong>Bill To:</strong> {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
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
                {new Date(selectedEvent.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </AlertDescription>
            </Alert>
          )}

          {selectedEventId && contact.payment_methods?.stripe?.payment_method_id && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
              <Label className="text-base font-semibold">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(value: "link" | "charge") => setPaymentMethod(value)}>
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="link" id="payment-link" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="payment-link" className="font-medium cursor-pointer">
                      Send Payment Link
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Email invoice with payment link - customer pays online
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="charge" id="charge-card" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="charge-card" className="font-medium cursor-pointer flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Charge Card on File
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Charge {contact.payment_methods.stripe.brand} •••• {contact.payment_methods.stripe.last4} immediately & send receipt
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {selectedEventId && ticketTypes.length > 0 && (
            <div className="space-y-3">
              <Label>Invoice Line Items</Label>
              <div className="border rounded-lg divide-y">
                {ticketTypes.map((ticketType) => (
                  <div key={ticketType.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{ticketType.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ${ticketType.price.toFixed(2)} each
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
            <Alert className="bg-black text-white">
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span><strong>Total Due:</strong> {totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'}</span>
                  <span className="text-xl font-bold">${total.toFixed(2)}</span>
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
            onClick={handleCreateInvoice}
            disabled={loading || !selectedEventId || totalTickets === 0}
            className="bg-black text-white hover:bg-black/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create & Send Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
