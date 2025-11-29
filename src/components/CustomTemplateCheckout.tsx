/**
 * CustomTemplateCheckout - A completely separate checkout component
 *
 * This renders a checkout flow based on the custom template configuration
 * stored in widget_customization.customTemplate
 *
 * IMPORTANT: This is intentionally separate from existing checkout templates
 * (TicketWidget, TicketFloLIVE, etc.) to avoid breaking existing functionality
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { StripePaymentForm } from "@/components/payment/StripePaymentForm";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Loader2,
  CheckCircle,
  Calendar,
  MapPin,
  Clock,
  Tag,
  ShoppingCart,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";

// Types matching the template builder
interface CheckoutElement {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

interface CheckoutPage {
  id: string;
  title: string;
  elements: CheckoutElement[];
}

interface CheckoutTemplate {
  id: string;
  name: string;
  pages: CheckoutPage[];
  settings: {
    showProgressBar: boolean;
    allowBackNavigation: boolean;
    mobileLayout: string;
    showOrderSummaryOnAllPages: boolean;
    themeMode?: "light" | "dark" | "system";
    layout?: "single" | "sidebar";
    sidebarPosition?: "left" | "right";
  };
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  description?: string;
  quantity_available: number;
  max_per_order?: number;
}

interface EventData {
  id: string;
  name: string;
  description?: string;
  event_date: string;
  event_end_date?: string;
  venue?: string;
  logo_url?: string;
  organization_id: string;
  abandoned_cart_enabled?: boolean;
  widget_customization?: {
    customTemplate?: CheckoutTemplate;
    useCustomTemplate?: boolean;
    theme?: Record<string, unknown>;
  };
  organizations?: {
    payment_provider?: string;
    stripe_booking_fee_enabled?: boolean;
    currency?: string;
  };
}

interface CustomTemplateCheckoutProps {
  eventId: string;
}

// Main Component
export function CustomTemplateCheckout({ eventId }: CustomTemplateCheckoutProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [template, setTemplate] = useState<CheckoutTemplate | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Form state
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  // Payment state
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Abandoned cart tracking
  const sessionId = useRef<string>("");
  const abandonedCartSaved = useRef(false);

  // Initialize session ID
  useEffect(() => {
    sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Save abandoned cart when user has email and cart items
  const saveAbandonedCart = useCallback(async () => {
    if (!eventId || !eventData?.organization_id) return;
    if (!customerInfo.email || Object.values(selectedTickets).every(qty => qty === 0)) return;
    if (abandonedCartSaved.current) return;
    if (!eventData?.abandoned_cart_enabled) return;

    try {
      const cartItems = Object.entries(selectedTickets)
        .filter(([, qty]) => qty > 0)
        .map(([ticketId, quantity]) => {
          const ticket = ticketTypes.find(t => t.id === ticketId);
          return {
            ticket_type_id: ticketId,
            name: ticket?.name || "",
            quantity,
            price: ticket?.price || 0,
          };
        });

      const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const userAgent = navigator.userAgent.toLowerCase();
      const deviceType = /mobile|android|iphone|ipad/.test(userAgent)
        ? (/ipad|tablet/.test(userAgent) ? "tablet" : "mobile")
        : "desktop";

      const { error } = await supabase
        .from("abandoned_carts")
        .upsert({
          event_id: eventId,
          organization_id: eventData.organization_id,
          customer_email: customerInfo.email,
          customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`.trim() || null,
          customer_phone: customerInfo.phone || null,
          cart_items: cartItems,
          cart_total: cartTotal,
          session_id: sessionId.current,
          source_url: window.location.href,
          device_type: deviceType,
          status: "pending",
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "event_id,customer_email,session_id"
        });

      if (error) {
        console.error("Error saving abandoned cart:", error);
      } else {
        abandonedCartSaved.current = true;
        console.log("Abandoned cart saved for recovery");
      }
    } catch (err) {
      console.error("Error in saveAbandonedCart:", err);
    }
  }, [eventId, eventData?.organization_id, eventData?.abandoned_cart_enabled, customerInfo, selectedTickets, ticketTypes]);

  // Save abandoned cart when user enters email with items in cart
  useEffect(() => {
    const hasItems = Object.values(selectedTickets).some(qty => qty > 0);
    if (customerInfo.email && hasItems && !abandonedCartSaved.current) {
      const timer = setTimeout(() => {
        saveAbandonedCart();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [customerInfo.email, selectedTickets, saveAbandonedCart]);

  // Track page unload to update abandoned cart
  useEffect(() => {
    const handleBeforeUnload = () => {
      const hasItems = Object.values(selectedTickets).some(qty => qty > 0);
      if (customerInfo.email && hasItems && !abandonedCartSaved.current) {
        navigator.sendBeacon?.("/api/abandoned-cart-beacon", JSON.stringify({
          event_id: eventId,
          customer_email: customerInfo.email,
          session_id: sessionId.current,
        }));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [eventId, customerInfo.email, selectedTickets]);

  // Load event data and template
  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      // Load event with organization data
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*, organizations(payment_provider, stripe_booking_fee_enabled, currency)")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEventData(event);

      // Extract template from widget_customization
      const customization = event.widget_customization as EventData["widget_customization"];
      if (customization?.useCustomTemplate && customization?.customTemplate) {
        setTemplate(customization.customTemplate);
      }

      // Load ticket types (match existing TicketWidget query pattern)
      const { data: tickets, error: ticketsError } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .order("price", { ascending: true });

      if (ticketsError) throw ticketsError;
      setTicketTypes(tickets || []);
    } catch (error) {
      console.error("Error loading event:", error);
      toast({
        title: "Error",
        description: "Failed to load event data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let ticketCount = 0;

    Object.entries(selectedTickets).forEach(([ticketId, qty]) => {
      const ticket = ticketTypes.find((t) => t.id === ticketId);
      if (ticket && qty > 0) {
        subtotal += ticket.price * qty;
        ticketCount += qty;
      }
    });

    const discount = appliedPromo ? (subtotal * appliedPromo.discount) / 100 : 0;
    const total = subtotal - discount;

    return { subtotal, discount, total, ticketCount };
  }, [selectedTickets, ticketTypes, appliedPromo]);

  // Apply promo code
  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;

    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("event_id", eventId)
        .eq("code", promoCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast({
          title: "Invalid Code",
          description: "This promo code is not valid",
          variant: "destructive",
        });
        return;
      }

      // Check if code has uses remaining
      if (data.max_uses && data.used_count >= data.max_uses) {
        toast({
          title: "Code Expired",
          description: "This promo code has reached its usage limit",
          variant: "destructive",
        });
        return;
      }

      setAppliedPromo({
        code: data.code,
        discount: data.discount_percent || 0,
      });

      toast({
        title: "Code Applied",
        description: `${data.discount_percent}% discount applied`,
      });
    } catch (error) {
      console.error("Error applying promo:", error);
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = (orderId: string) => {
    setOrderId(orderId);
    setOrderComplete(true);
    toast({
      title: "Payment Successful!",
      description: "Your tickets have been confirmed. Check your email for details.",
    });
    // Redirect to success page
    setTimeout(() => {
      window.location.href = `/payment-success?orderId=${orderId}`;
    }, 1500);
  };

  // Build cart items for StripePaymentForm
  const cartItems = useMemo(() => {
    return Object.entries(selectedTickets)
      .filter(([, qty]) => qty > 0)
      .map(([ticketId, qty]) => {
        const ticket = ticketTypes.find((t) => t.id === ticketId);
        return {
          id: ticketId,
          name: ticket?.name || "Ticket",
          price: ticket?.price || 0,
          quantity: qty,
          type: "ticket" as const,
        };
      });
  }, [selectedTickets, ticketTypes]);

  // Default theme for payment form
  const paymentTheme = {
    enabled: true,
    primaryColor: "#000000",
    buttonTextColor: "#ffffff",
    secondaryColor: "#ffffff",
    backgroundColor: "#ffffff",
    cardBackgroundColor: "#ffffff",
    inputBackgroundColor: "#ffffff",
    borderEnabled: true,
    borderColor: "#e5e7eb",
    headerTextColor: "#111827",
    bodyTextColor: "#6b7280",
    fontFamily: "system-ui",
  };

  // Validate current page before proceeding
  const validateCurrentPage = (): boolean => {
    if (!template) return true;

    const currentElements = template.pages[currentPage]?.elements || [];

    for (const element of currentElements) {
      switch (element.type) {
        case "ticket_selector":
          if (totals.ticketCount === 0) {
            toast({
              title: "Select Tickets",
              description: "Please select at least one ticket",
              variant: "destructive",
            });
            return false;
          }
          break;
        case "customer_info":
          if (!customerInfo.email || !customerInfo.firstName) {
            toast({
              title: "Required Fields",
              description: "Please fill in your name and email",
              variant: "destructive",
            });
            return false;
          }
          if (element.config.requirePhone && !customerInfo.phone) {
            toast({
              title: "Phone Required",
              description: "Please enter your phone number",
              variant: "destructive",
            });
            return false;
          }
          break;
        case "terms_checkbox":
          if (!termsAccepted) {
            toast({
              title: "Terms Required",
              description: "Please accept the terms and conditions",
              variant: "destructive",
            });
            return false;
          }
          break;
      }
    }

    return true;
  };

  // Navigation
  const goToNextPage = () => {
    if (!validateCurrentPage()) return;

    if (template && currentPage < template.pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (template?.settings.allowBackNavigation && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Render individual elements
  const renderElement = (element: CheckoutElement) => {
    switch (element.type) {
      case "logo":
        return (
          <div
            key={element.id}
            className={`flex ${
              element.config.alignment === "left"
                ? "justify-start"
                : element.config.alignment === "right"
                ? "justify-end"
                : "justify-center"
            }`}
          >
            {eventData?.logo_url && (
              <img
                src={eventData.logo_url}
                alt={eventData.name}
                className={`object-contain ${
                  element.config.size === "small"
                    ? "h-12"
                    : element.config.size === "large"
                    ? "h-24"
                    : "h-16"
                }`}
              />
            )}
          </div>
        );

      case "event_header":
        return (
          <div key={element.id} className="space-y-3">
            {element.config.showImage && eventData?.logo_url && (
              <img
                src={eventData.logo_url}
                alt={eventData.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            <h1 className="text-2xl font-bold">{eventData?.name}</h1>
            {element.config.showDate && eventData?.event_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(eventData.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}</span>
              </div>
            )}
            {element.config.showVenue && eventData?.venue && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{eventData.venue}</span>
              </div>
            )}
          </div>
        );

      case "ticket_selector":
        return (
          <div key={element.id} className="space-y-4">
            <h3 className="font-semibold">{element.config.label || element.label}</h3>
            {ticketTypes.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex-1">
                  <div className="font-medium">{ticket.name}</div>
                  {element.config.showDescription && ticket.description && (
                    <p className="text-sm text-muted-foreground">{ticket.description}</p>
                  )}
                  <div className="text-lg font-bold mt-1">
                    ${ticket.price.toFixed(2)}
                  </div>
                  {element.config.showAvailability && (
                    <p className="text-xs text-muted-foreground">
                      {ticket.quantity_available} available
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={(selectedTickets[ticket.id] || 0) === 0}
                    onClick={() =>
                      setSelectedTickets((prev) => ({
                        ...prev,
                        [ticket.id]: Math.max(0, (prev[ticket.id] || 0) - 1),
                      }))
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">
                    {selectedTickets[ticket.id] || 0}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={
                      (selectedTickets[ticket.id] || 0) >= ticket.quantity_available ||
                      (ticket.max_per_order && (selectedTickets[ticket.id] || 0) >= ticket.max_per_order)
                    }
                    onClick={() =>
                      setSelectedTickets((prev) => ({
                        ...prev,
                        [ticket.id]: (prev[ticket.id] || 0) + 1,
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );

      case "customer_info":
        return (
          <div key={element.id} className="space-y-4">
            <h3 className="font-semibold">{element.config.label || element.label}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={customerInfo.firstName}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={customerInfo.lastName}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="john@example.com"
              />
            </div>
            {(element.config.requirePhone || element.config.showPhone !== false) && (
              <div className="space-y-2">
                <Label>Phone {element.config.requirePhone ? "*" : "(optional)"}</Label>
                <Input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            )}
          </div>
        );

      case "payment_form": {
        const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

        if (!stripePublishableKey) {
          return (
            <div key={element.id} className="p-4 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <p className="text-sm font-medium">Payment not configured</p>
              <p className="text-xs mt-1">Stripe publishable key is missing from environment</p>
            </div>
          );
        }

        // Check if required info is filled
        if (!customerInfo.email || !customerInfo.firstName) {
          return (
            <div key={element.id} className="space-y-4">
              <h3 className="font-semibold">{element.config.label || element.label}</h3>
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2 text-amber-800">
                    <CreditCard className="h-8 w-8 mx-auto opacity-50" />
                    <p className="font-medium">Complete your details first</p>
                    <p className="text-sm">Please fill in your name and email to proceed with payment</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }

        if (totals.ticketCount === 0) {
          return (
            <div key={element.id} className="space-y-4">
              <h3 className="font-semibold">{element.config.label || element.label}</h3>
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2 text-amber-800">
                    <CreditCard className="h-8 w-8 mx-auto opacity-50" />
                    <p className="font-medium">Select tickets first</p>
                    <p className="text-sm">Please select at least one ticket to proceed</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }

        // Show the Stripe payment form directly (inline mode - default)
        return (
          <div key={element.id} className="space-y-4">
            <h3 className="font-semibold">{element.config.label || element.label}</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between text-sm mb-4 px-1">
                  <span className="text-muted-foreground">Total to pay</span>
                  <span className="font-bold text-lg">${totals.total.toFixed(2)}</span>
                </div>
                <StripePaymentForm
                  publishableKey={stripePublishableKey}
                  eventId={eventId}
                  cart={cartItems}
                  merchandiseCart={[]}
                  customerInfo={{
                    name: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
                    email: customerInfo.email,
                    phone: customerInfo.phone,
                  }}
                  total={totals.total}
                  theme={paymentTheme}
                  bookingFeesEnabled={eventData?.organizations?.stripe_booking_fee_enabled || false}
                  subtotal={totals.subtotal}
                  bookingFee={0}
                  currency={eventData?.organizations?.currency || "USD"}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => {}}
                />
              </CardContent>
            </Card>
          </div>
        );
      }

      case "order_summary":
        return (
          <div key={element.id} className="space-y-4">
            <h3 className="font-semibold">{element.config.label || element.label}</h3>
            <Card>
              <CardContent className="pt-4 space-y-3">
                {element.config.showItemized &&
                  Object.entries(selectedTickets)
                    .filter(([, qty]) => qty > 0)
                    .map(([ticketId, qty]) => {
                      const ticket = ticketTypes.find((t) => t.id === ticketId);
                      if (!ticket) return null;
                      return (
                        <div key={ticketId} className="flex justify-between text-sm">
                          <span>
                            {ticket.name} x {qty}
                          </span>
                          <span>${(ticket.price * qty).toFixed(2)}</span>
                        </div>
                      );
                    })}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({appliedPromo.discount}%)</span>
                    <span>-${totals.discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "promo_code":
        return (
          <div key={element.id} className="space-y-3">
            <h3 className="font-semibold">{element.config.label || element.label}</h3>
            <div className="flex gap-2">
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                disabled={!!appliedPromo}
              />
              <Button
                variant="outline"
                onClick={applyPromoCode}
                disabled={!!appliedPromo || !promoCode.trim()}
              >
                {appliedPromo ? <CheckCircle className="h-4 w-4" /> : "Apply"}
              </Button>
            </div>
            {appliedPromo && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Tag className="h-3 w-3 mr-1" />
                {appliedPromo.code} - {appliedPromo.discount}% off
              </Badge>
            )}
          </div>
        );

      case "terms_checkbox":
        return (
          <div key={element.id} className="flex items-start gap-3 p-4 rounded-lg border">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
              I agree to the{" "}
              {element.config.termsUrl ? (
                <a
                  href={element.config.termsUrl as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Terms and Conditions
                </a>
              ) : (
                "Terms and Conditions"
              )}
              {element.config.privacyUrl && (
                <>
                  {" "}
                  and{" "}
                  <a
                    href={element.config.privacyUrl as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Privacy Policy
                  </a>
                </>
              )}
            </Label>
          </div>
        );

      case "timer":
        return (
          <div key={element.id} className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {element.config.showAvailability
                ? `${ticketTypes.reduce((sum, t) => sum + t.quantity_available, 0)} tickets remaining`
                : "Limited availability"}
            </span>
          </div>
        );

      case "text_block":
        return (
          <div
            key={element.id}
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: (element.config.content as string) || "" }}
          />
        );

      case "divider":
        return <Separator key={element.id} className="my-4" />;

      case "custom_questions":
        // This would integrate with the existing custom questions system
        return (
          <div key={element.id} className="space-y-4">
            <h3 className="font-semibold">{element.config.label || element.label}</h3>
            <p className="text-sm text-muted-foreground">
              Custom questions from your event configuration will appear here
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No template configured
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Custom Template</h2>
        <p className="text-muted-foreground">
          This event doesn&apos;t have a custom checkout template configured.
        </p>
      </div>
    );
  }

  // Order complete
  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Order Complete!</h2>
        <p className="text-muted-foreground mb-4">
          Thank you for your purchase. Your tickets have been sent to {customerInfo.email}
        </p>
        {orderId && (
          <p className="text-sm text-muted-foreground">Order ID: {orderId}</p>
        )}
      </div>
    );
  }

  const currentPageData = template.pages[currentPage];
  const isLastPage = currentPage === template.pages.length - 1;
  const hasPaymentOnCurrentPage = currentPageData?.elements.some(
    (e) => e.type === "payment_form"
  );

  // Determine theme class based on template settings
  const getThemeClass = () => {
    const themeMode = template.settings.themeMode || "system";
    if (themeMode === "dark") return "dark";
    if (themeMode === "light") return "";
    // System mode - check user preference
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "";
  };

  const themeClass = getThemeClass();
  const isSidebarLayout = template.settings.layout === "sidebar";
  const sidebarOnLeft = template.settings.sidebarPosition === "left";

  // Check if user has added sidebar elements anywhere in the template
  const allElements = template.pages.flatMap(p => p.elements);
  const hasOrderSummary = allElements.some(e => e.type === "order_summary");
  const orderSummaryElement = allElements.find(e => e.type === "order_summary");
  const promoCodeElement = allElements.find(e => e.type === "promo_code");

  // Only show sidebar if layout is sidebar AND user has added order_summary
  const showSidebar = isSidebarLayout && hasOrderSummary;

  // Render sidebar content (promo code + order summary)
  const renderSidebarContent = () => {
    if (!orderSummaryElement) return null;

    return (
      <div className="w-80 flex-shrink-0 space-y-4">
        {/* Promo Code in Sidebar */}
        {promoCodeElement && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter promo code"
                    className="pl-9"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={!!appliedPromo}
                  />
                </div>
                {appliedPromo ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAppliedPromo(null);
                      setPromoCode("");
                    }}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyPromoCode}
                    disabled={applyingPromo || !promoCode}
                  >
                    {applyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                )}
              </div>
              {appliedPromo && (
                <p className="text-xs text-green-600 mt-2">
                  {appliedPromo.discount}% discount applied!
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {orderSummaryElement.config.label || orderSummaryElement.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            {totals.ticketCount > 0 ? (
              <div className="space-y-3">
                {orderSummaryElement.config.showItemized !== false && Object.entries(selectedTickets)
                  .filter(([, qty]) => qty > 0)
                  .map(([ticketId, qty]) => {
                    const ticket = ticketTypes.find((t) => t.id === ticketId);
                    if (!ticket) return null;
                    return (
                      <div key={ticketId} className="flex justify-between text-sm">
                        <span>{ticket.name} x{qty}</span>
                        <span className="font-medium">${(ticket.price * qty).toFixed(2)}</span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No tickets selected
              </div>
            )}

            {totals.ticketCount > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({appliedPromo.discount}%)</span>
                      <span>-${totals.discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Filter out sidebar elements from inline elements when showing in sidebar
  const getPageElementsToRender = (elements: CheckoutElement[]) => {
    if (showSidebar) {
      // Don't render order_summary and promo_code inline when they're in sidebar
      return elements.filter(e => e.type !== "order_summary" && e.type !== "promo_code");
    }
    return elements;
  };

  return (
    <div className={`min-h-screen ${themeClass} ${themeClass === "dark" ? "bg-background text-foreground" : ""}`}>
    <div className={`mx-auto p-4 ${showSidebar ? "max-w-5xl" : "max-w-2xl"}`}>
      {/* Progress Bar */}
      {template.settings.showProgressBar && template.pages.length > 1 && (
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            {template.pages.map((page, i) => (
              <span
                key={page.id}
                className={`flex-1 text-center ${
                  i === currentPage
                    ? "text-primary font-medium"
                    : i < currentPage
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
                }`}
              >
                {page.title || `Step ${i + 1}`}
              </span>
            ))}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${((currentPage + 1) / template.pages.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Main Layout with optional sidebar */}
      <div className={`${showSidebar ? "flex gap-6" : ""} ${showSidebar && sidebarOnLeft ? "flex-row-reverse" : ""}`}>
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Page Content */}
          <Card>
            <CardHeader>
              <CardTitle>{currentPageData?.title || `Step ${currentPage + 1}`}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {getPageElementsToRender(currentPageData?.elements || []).map((element) => renderElement(element))}
            </CardContent>
          </Card>

          {/* Persistent Order Summary (if enabled and NOT using sidebar) */}
          {!showSidebar &&
            template.settings.showOrderSummaryOnAllPages &&
            !currentPageData?.elements.some((e) => e.type === "order_summary") &&
            totals.ticketCount > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {totals.ticketCount} ticket{totals.ticketCount !== 1 ? "s" : ""}
                    </span>
                    <span className="font-bold">${totals.total.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Navigation */}
          {!hasPaymentOnCurrentPage && (
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={goToPrevPage}
                disabled={currentPage === 0 || !template.settings.allowBackNavigation}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={goToNextPage} disabled={paymentProcessing}>
                {isLastPage ? "Complete" : "Continue"}
                {!isLastPage && <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar Order Summary - only shows if user added order_summary AND layout is sidebar */}
        {showSidebar && renderSidebarContent()}
      </div>
    </div>
    </div>
  );
}

export default CustomTemplateCheckout;
