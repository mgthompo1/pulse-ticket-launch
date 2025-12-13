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
  Users,
  HelpCircle,
  X,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Simple HTML sanitizer - strips all tags except basic formatting
const sanitizeHtml = (html: string): string => {
  // Create a temporary element to parse HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;
  // Only allow text content - strips all HTML
  // For basic formatting, we convert common tags to plain text equivalents
  return temp.textContent || temp.innerText || "";
};

// Types matching the template builder
interface CheckoutElement {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
  column?: "left" | "right"; // For two-column layout
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
    layout?: "single" | "sidebar" | "two_column";
    sidebarPosition?: "left" | "right";
    twoColumnLeftWidth?: "1/3" | "1/2" | "2/3";
    twoColumnGap?: "sm" | "md" | "lg";
    twoColumnStackOnMobile?: boolean;
    // Two-column styling
    twoColumnLeftBgColor?: string;
    twoColumnRightBgColor?: string;
    twoColumnLeftTextColor?: string;
    twoColumnRightTextColor?: string;
    twoColumnLeftContent?: string;
    twoColumnRightContent?: string;
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
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; discountType: "percent" | "fixed" } | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [attendeeDetails, setAttendeeDetails] = useState<Array<{ name: string; email: string; phone: string }>>([]);
  const [customQuestions, setCustomQuestions] = useState<Array<{ id: string; question: string; type: string; required: boolean; options?: string[] }>>([]);

  // Payment state
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Abandoned cart tracking
  const sessionId = useRef<string>("");
  const abandonedCartSaved = useRef(false);

  // Initialize session ID
  useEffect(() => {
    sessionId.current = crypto.randomUUID();
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

      // Load custom questions for the event
      const { data: questions } = await supabase
        .from("custom_questions")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (questions) {
        setCustomQuestions(questions.map(q => ({
          id: q.id,
          question: q.question,
          type: q.question_type || "text",
          required: q.is_required || false,
          options: q.options || [],
        })));
      }
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

  // Update attendee details when ticket count changes
  useEffect(() => {
    const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
    setAttendeeDetails(prev => {
      if (totalTickets === prev.length) return prev;
      if (totalTickets > prev.length) {
        // Add new attendee slots
        const newAttendees = [...prev];
        for (let i = prev.length; i < totalTickets; i++) {
          // Pre-fill first attendee with customer info
          if (i === 0 && customerInfo.firstName) {
            newAttendees.push({
              name: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
              email: customerInfo.email,
              phone: customerInfo.phone,
            });
          } else {
            newAttendees.push({ name: "", email: "", phone: "" });
          }
        }
        return newAttendees;
      }
      // Remove extra attendee slots
      return prev.slice(0, totalTickets);
    });
  }, [selectedTickets, customerInfo.firstName, customerInfo.lastName, customerInfo.email, customerInfo.phone]);

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

    // Handle both percentage and fixed discounts
    let discount = 0;
    if (appliedPromo) {
      if (appliedPromo.discountType === "percent") {
        discount = (subtotal * appliedPromo.discount) / 100;
      } else {
        discount = Math.min(appliedPromo.discount, subtotal); // Don't discount more than subtotal
      }
    }
    const total = Math.max(0, subtotal - discount);

    return { subtotal, discount, total, ticketCount };
  }, [selectedTickets, ticketTypes, appliedPromo]);

  // Apply promo code
  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;

    setApplyingPromo(true);
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

      // Check expiration dates
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        toast({
          title: "Code Not Active",
          description: "This promo code is not yet active",
          variant: "destructive",
        });
        return;
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        toast({
          title: "Code Expired",
          description: "This promo code has expired",
          variant: "destructive",
        });
        return;
      }

      // Handle both percentage and fixed discounts
      const isPercentage = data.discount_percent && data.discount_percent > 0;
      const discountValue = isPercentage ? data.discount_percent : (data.discount_amount || 0);

      setAppliedPromo({
        code: data.code,
        discount: discountValue,
        discountType: isPercentage ? "percent" : "fixed",
      });

      toast({
        title: "Code Applied",
        description: isPercentage
          ? `${discountValue}% discount applied`
          : `$${discountValue.toFixed(2)} discount applied`,
      });
    } catch (error) {
      console.error("Error applying promo:", error);
      toast({
        title: "Error",
        description: "Failed to apply promo code",
        variant: "destructive",
      });
    } finally {
      setApplyingPromo(false);
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
        case "customer_info": {
          if (!customerInfo.email || !customerInfo.firstName) {
            toast({
              title: "Required Fields",
              description: "Please fill in your name and email",
              variant: "destructive",
            });
            return false;
          }
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(customerInfo.email)) {
            toast({
              title: "Invalid Email",
              description: "Please enter a valid email address",
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
        }
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
        case "attendee_details":
          // Validate attendee details if element is present
          for (let i = 0; i < attendeeDetails.length; i++) {
            const attendee = attendeeDetails[i];
            if (!attendee.name.trim()) {
              toast({
                title: "Attendee Details Required",
                description: `Please enter a name for ticket ${i + 1}`,
                variant: "destructive",
              });
              return false;
            }
            if (element.config.requireEmail && !attendee.email.trim()) {
              toast({
                title: "Attendee Email Required",
                description: `Please enter an email for ticket ${i + 1}`,
                variant: "destructive",
              });
              return false;
            }
            if (element.config.requirePhone && !attendee.phone.trim()) {
              toast({
                title: "Attendee Phone Required",
                description: `Please enter a phone number for ticket ${i + 1}`,
                variant: "destructive",
              });
              return false;
            }
          }
          break;
        case "custom_questions":
          // Validate required custom questions
          for (const q of customQuestions) {
            if (q.required && !customAnswers[q.id]?.trim()) {
              toast({
                title: "Required Question",
                description: `Please answer: ${q.question}`,
                variant: "destructive",
              });
              return false;
            }
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

  // Helper to find element by ID across all pages
  const findElementById = (id: string): CheckoutElement | null => {
    if (!template) return null;
    for (const page of template.pages) {
      const element = page.elements.find(e => e.id === id);
      if (element) return element;
    }
    return null;
  };

  // Render individual elements
  // Note: isDark is determined after template is loaded, but we can compute it here
  const computeIsDark = () => {
    const themeMode = template?.settings.themeMode || "system";
    if (themeMode === "dark") return true;
    if (themeMode === "light") return false;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return true;
    }
    return false;
  };

  const renderElement = (element: CheckoutElement) => {
    const isDarkMode = computeIsDark();

    // Theme-aware class helpers
    const cardBg = isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200";
    const inputBg = isDarkMode ? "bg-zinc-700 border-zinc-600 text-white" : "bg-white border-gray-300";
    const mutedText = isDarkMode ? "text-zinc-400" : "text-gray-500";
    const headingText = isDarkMode ? "text-white" : "text-gray-900";
    const bodyText = isDarkMode ? "text-zinc-200" : "text-gray-700";

    switch (element.type) {
      case "logo": {
        const alignmentClasses: Record<string, string> = {
          left: "justify-start",
          center: "justify-center",
          right: "justify-end"
        };
        const paddingClasses: Record<string, string> = {
          none: "",
          sm: "py-2",
          md: "py-4",
          lg: "py-6"
        };
        const sizeClasses: Record<string, string> = {
          small: "h-12",
          medium: "h-16",
          large: "h-24",
          custom: ""
        };
        const alignment = (element.config.alignment as string) || "center";
        const verticalPadding = (element.config.verticalPadding as string) || "none";
        const size = (element.config.size as string) || "medium";
        const customHeight = element.config.customHeight as number;
        const maxWidth = element.config.maxWidth as number;

        return (
          <div
            key={element.id}
            className={`flex ${alignmentClasses[alignment]} ${paddingClasses[verticalPadding]}`}
          >
            {eventData?.logo_url && (
              <img
                src={eventData.logo_url}
                alt={eventData.name}
                className={`object-contain ${sizeClasses[size]}`}
                style={{
                  height: size === "custom" && customHeight ? `${customHeight}px` : undefined,
                  maxWidth: maxWidth ? `${maxWidth}px` : undefined
                }}
              />
            )}
          </div>
        );
      }

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
            <h1 className={`text-2xl font-bold ${headingText}`}>{eventData?.name}</h1>
            {element.config.showDate && eventData?.event_date && (
              <div className={`flex items-center gap-2 ${mutedText}`}>
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(eventData.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}</span>
              </div>
            )}
            {element.config.showVenue && eventData?.venue && (
              <div className={`flex items-center gap-2 ${mutedText}`}>
                <MapPin className="h-4 w-4" />
                <span>{eventData.venue}</span>
              </div>
            )}
          </div>
        );

      case "ticket_selector":
        return (
          <div key={element.id} className="space-y-4">
            <h3 className={`font-semibold ${headingText}`}>{element.config.label || element.label}</h3>
            {ticketTypes.map((ticket) => (
              <div
                key={ticket.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${cardBg}`}
              >
                <div className="flex-1">
                  <div className={`font-medium ${bodyText}`}>{ticket.name}</div>
                  {element.config.showDescription && ticket.description && (
                    <p className={`text-sm ${mutedText}`}>{ticket.description}</p>
                  )}
                  <div className={`text-lg font-bold mt-1 ${headingText}`}>
                    ${ticket.price.toFixed(2)}
                  </div>
                  {element.config.showAvailability && (
                    <p className={`text-xs ${mutedText}`}>
                      {ticket.quantity_available} available
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 ${isDarkMode ? "border-zinc-600 hover:bg-zinc-700" : ""}`}
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
                  <span className={`w-8 text-center font-medium ${bodyText}`}>
                    {selectedTickets[ticket.id] || 0}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 ${isDarkMode ? "border-zinc-600 hover:bg-zinc-700" : ""}`}
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
            <h3 className={`font-semibold ${headingText}`}>{element.config.label || element.label}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={bodyText}>First Name *</Label>
                <Input
                  value={customerInfo.firstName}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  placeholder="John"
                  className={inputBg}
                />
              </div>
              <div className="space-y-2">
                <Label className={bodyText}>Last Name *</Label>
                <Input
                  value={customerInfo.lastName}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  placeholder="Doe"
                  className={inputBg}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={bodyText}>Email *</Label>
              <Input
                type="email"
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="john@example.com"
                className={inputBg}
              />
            </div>
            {(element.config.requirePhone || element.config.showPhone !== false) && (
              <div className="space-y-2">
                <Label className={bodyText}>Phone {element.config.requirePhone ? "*" : "(optional)"}</Label>
                <Input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+1 (555) 000-0000"
                  className={inputBg}
                />
              </div>
            )}
          </div>
        );

      case "payment_form": {
        const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

        if (!stripePublishableKey) {
          return (
            <div key={element.id} className={`p-4 rounded-lg ${isDarkMode ? "bg-amber-900/20 text-amber-200" : "bg-amber-50 text-amber-800"}`}>
              <p className="text-sm font-medium">Payment not configured</p>
              <p className="text-xs mt-1">Stripe publishable key is missing from environment</p>
            </div>
          );
        }

        // Check if required info is filled
        if (!customerInfo.email || !customerInfo.firstName) {
          return (
            <div key={element.id} className="space-y-4">
              <h3 className={`font-semibold ${headingText}`}>{element.config.label || element.label}</h3>
              <Card className={isDarkMode ? "bg-amber-900/20 border-amber-800" : "border-amber-200 bg-amber-50/50"}>
                <CardContent className="pt-6">
                  <div className={`text-center space-y-2 ${isDarkMode ? "text-amber-200" : "text-amber-800"}`}>
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
              <h3 className={`font-semibold ${headingText}`}>{element.config.label || element.label}</h3>
              <Card className={isDarkMode ? "bg-amber-900/20 border-amber-800" : "border-amber-200 bg-amber-50/50"}>
                <CardContent className="pt-6">
                  <div className={`text-center space-y-2 ${isDarkMode ? "text-amber-200" : "text-amber-800"}`}>
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
            <h3 className={`font-semibold ${headingText}`}>{element.config.label || element.label}</h3>
            <Card className={cardBg}>
              <CardContent className="pt-6">
                <div className="flex justify-between text-sm mb-4 px-1">
                  <span className={mutedText}>Total to pay</span>
                  <span className={`font-bold text-lg ${headingText}`}>${totals.total.toFixed(2)}</span>
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
            <h3 className={`font-semibold ${headingText}`}>{element.config.label || element.label}</h3>
            <Card className={cardBg}>
              <CardContent className="pt-4 space-y-3">
                {element.config.showItemized &&
                  Object.entries(selectedTickets)
                    .filter(([, qty]) => qty > 0)
                    .map(([ticketId, qty]) => {
                      const ticket = ticketTypes.find((t) => t.id === ticketId);
                      if (!ticket) return null;
                      return (
                        <div key={ticketId} className={`flex justify-between text-sm ${bodyText}`}>
                          <span>
                            {ticket.name} x {qty}
                          </span>
                          <span>${(ticket.price * qty).toFixed(2)}</span>
                        </div>
                      );
                    })}
                <Separator className={isDarkMode ? "bg-zinc-700" : ""} />
                <div className={`flex justify-between text-sm ${bodyText}`}>
                  <span>Subtotal</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-sm text-green-500">
                    <span>Discount ({appliedPromo.discountType === "percent" ? `${appliedPromo.discount}%` : `$${appliedPromo.discount.toFixed(2)}`})</span>
                    <span>-${totals.discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator className={isDarkMode ? "bg-zinc-700" : ""} />
                <div className={`flex justify-between font-bold ${headingText}`}>
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
            <h3 className={`font-semibold ${headingText}`}>{element.config.label || element.label}</h3>
            <div className="flex gap-2">
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                disabled={!!appliedPromo}
                className={inputBg}
              />
              <Button
                variant="outline"
                onClick={applyPromoCode}
                disabled={!!appliedPromo || !promoCode.trim()}
                className={isDarkMode ? "border-zinc-600 hover:bg-zinc-700" : ""}
              >
                {appliedPromo ? <CheckCircle className="h-4 w-4" /> : "Apply"}
              </Button>
            </div>
            {appliedPromo && (
              <Badge variant="secondary" className={isDarkMode ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-800"}>
                <Tag className="h-3 w-3 mr-1" />
                {appliedPromo.code} - {appliedPromo.discountType === "percent" ? `${appliedPromo.discount}% off` : `$${appliedPromo.discount.toFixed(2)} off`}
              </Badge>
            )}
          </div>
        );

      case "terms_checkbox":
        return (
          <div key={element.id} className={`flex items-start gap-3 p-4 rounded-lg border ${cardBg}`}>
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              className={isDarkMode ? "border-zinc-600 data-[state=checked]:bg-zinc-600" : ""}
            />
            <Label htmlFor="terms" className={`text-sm leading-relaxed cursor-pointer ${bodyText}`}>
              I agree to the{" "}
              {element.config.termsUrl ? (
                <a
                  href={element.config.termsUrl as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={isDarkMode ? "text-blue-400 underline" : "text-primary underline"}
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
                    className={isDarkMode ? "text-blue-400 underline" : "text-primary underline"}
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
          <div key={element.id} className={`flex items-center gap-2 p-3 rounded-lg ${isDarkMode ? "bg-amber-900/20 text-amber-200" : "bg-amber-50 text-amber-800"}`}>
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
            className={`prose prose-sm max-w-none p-3 rounded-lg ${isDarkMode ? "prose-invert bg-zinc-800/50" : "bg-gray-100/50"}`}
          >
            <p className={`whitespace-pre-wrap ${bodyText}`}>{sanitizeHtml((element.config.content as string) || "")}</p>
          </div>
        );

      case "divider": {
        const styleClasses: Record<string, string> = {
          line: "border-solid",
          dashed: "border-dashed",
          dotted: "border-dotted"
        };
        const thicknessClasses: Record<string, string> = {
          thin: "border-t",
          medium: "border-t-2",
          thick: "border-t-4"
        };
        const widthClasses: Record<string, string> = {
          full: "w-full",
          half: "w-1/2 mx-auto",
          third: "w-1/3 mx-auto"
        };
        const spacingClasses: Record<string, string> = {
          sm: "my-2",
          md: "my-4",
          lg: "my-8"
        };
        const style = (element.config.style as string) || "line";
        const thickness = (element.config.thickness as string) || "thin";
        const width = (element.config.width as string) || "full";
        const spacing = (element.config.spacing as string) || "md";
        const defaultColor = isDarkMode ? "#52525b" : "#e5e7eb";
        return (
          <div
            key={element.id}
            className={`${widthClasses[width]} ${thicknessClasses[thickness]} ${styleClasses[style]} ${spacingClasses[spacing]}`}
            style={{ borderColor: (element.config.color as string) || defaultColor }}
          />
        );
      }

      case "section_header": {
        const sizeClasses: Record<string, string> = {
          sm: "text-lg",
          md: "text-xl",
          lg: "text-2xl",
          xl: "text-3xl"
        };
        const alignClasses: Record<string, string> = {
          left: "text-left",
          center: "text-center",
          right: "text-right"
        };
        const size = (element.config.size as string) || "lg";
        const alignment = (element.config.alignment as string) || "left";
        const defaultTextColor = isDarkMode ? "#ffffff" : "#111827";
        return (
          <div
            key={element.id}
            className={`${alignClasses[alignment]} ${element.config.showDivider ? `border-b pb-2 mb-4 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}` : 'mb-4'}`}
          >
            <h2
              className={`font-semibold ${sizeClasses[size]}`}
              style={{ color: (element.config.textColor as string) || defaultTextColor }}
            >
              {(element.config.text as string) || element.label}
            </h2>
          </div>
        );
      }

      case "container": {
        // Container styles elements - this is handled at the page level
        // This case returns null as containers are processed during page rendering
        return null;
      }

      case "two_column": {
        const widthConfig = (element.config.leftWidth as string) || "1/2";
        const gapClasses: Record<string, string> = { sm: "gap-2", md: "gap-4", lg: "gap-6" };
        const gap = (element.config.gap as string) || "md";
        const stackOnMobile = element.config.stackOnMobile !== false;

        // Grid column classes based on left width
        const gridClasses: Record<string, string> = {
          "1/3": "md:grid-cols-[1fr_2fr]",
          "1/2": "md:grid-cols-2",
          "2/3": "md:grid-cols-[2fr_1fr]",
        };

        const leftElements = (element.config.leftElements as string[]) || [];
        const rightElements = (element.config.rightElements as string[]) || [];

        // Default background colors based on theme
        const defaultLeftBg = isDarkMode ? "#27272a" : undefined;
        const defaultRightBg = isDarkMode ? "#18181b" : undefined;

        return (
          <div
            key={element.id}
            className={`grid ${stackOnMobile ? 'grid-cols-1' : ''} ${gridClasses[widthConfig]} ${gapClasses[gap]}`}
          >
            <div
              className="space-y-4 p-4 rounded-lg"
              style={{ backgroundColor: (element.config.leftBackgroundColor as string) || defaultLeftBg }}
            >
              {leftElements.length > 0 ? (
                leftElements.map(id => {
                  // Find element by ID and render it
                  const el = findElementById(id);
                  return el ? renderElement(el) : null;
                })
              ) : (
                <div className={`text-center py-8 ${mutedText}`}>
                  <p className="text-sm">Left column</p>
                </div>
              )}
            </div>
            <div
              className="space-y-4 p-4 rounded-lg"
              style={{ backgroundColor: (element.config.rightBackgroundColor as string) || defaultRightBg }}
            >
              {rightElements.length > 0 ? (
                rightElements.map(id => {
                  const el = findElementById(id);
                  return el ? renderElement(el) : null;
                })
              ) : (
                <div className={`text-center py-8 ${mutedText}`}>
                  <p className="text-sm">Right column</p>
                </div>
              )}
            </div>
          </div>
        );
      }

      case "attendee_details":
        return (
          <div key={element.id} className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-primary"}`} />
              <h3 className={`font-semibold ${headingText}`}>{element.config.label || element.label}</h3>
            </div>
            {totals.ticketCount === 0 ? (
              <p className={`text-sm ${mutedText}`}>
                Select tickets above to add attendee details
              </p>
            ) : (
              <div className="space-y-4">
                {attendeeDetails.map((attendee, index) => (
                  <Card key={index} className={`${cardBg} ${index === 0 ? (isDarkMode ? "border-blue-500/30" : "border-primary/30") : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 0 ? "secondary" : "outline"} className={`text-xs ${isDarkMode ? (index === 0 ? "bg-zinc-700 text-zinc-200" : "border-zinc-600 text-zinc-300") : ""}`}>
                          Ticket {index + 1}
                        </Badge>
                        {index === 0 && (
                          <span className={`text-xs ${mutedText}`}>(Primary Ticket Holder)</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className={`text-xs ${bodyText}`}>Name *</Label>
                          <Input
                            value={attendee.name}
                            onChange={(e) => {
                              const newDetails = [...attendeeDetails];
                              newDetails[index] = { ...newDetails[index], name: e.target.value };
                              setAttendeeDetails(newDetails);
                            }}
                            placeholder="Full name"
                            className={`h-9 ${inputBg}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className={`text-xs ${bodyText}`}>
                            Email {element.config.requireEmail ? "*" : ""}
                          </Label>
                          <Input
                            type="email"
                            value={attendee.email}
                            onChange={(e) => {
                              const newDetails = [...attendeeDetails];
                              newDetails[index] = { ...newDetails[index], email: e.target.value };
                              setAttendeeDetails(newDetails);
                            }}
                            placeholder="email@example.com"
                            className={`h-9 ${inputBg}`}
                          />
                        </div>
                      </div>
                      {element.config.requirePhone && (
                        <div className="space-y-1">
                          <Label className={`text-xs ${bodyText}`}>Phone *</Label>
                          <Input
                            type="tel"
                            value={attendee.phone}
                            onChange={(e) => {
                              const newDetails = [...attendeeDetails];
                              newDetails[index] = { ...newDetails[index], phone: e.target.value };
                              setAttendeeDetails(newDetails);
                            }}
                            placeholder="+1 (555) 000-0000"
                            className={`h-9 ${inputBg}`}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case "info_modal":
        return (
          <div key={element.id}>
            <Dialog>
              <DialogTrigger asChild>
                {(element.config.triggerStyle as string) === "button" ? (
                  <Button variant="outline" size="sm" className={isDarkMode ? "border-zinc-600 text-zinc-200 hover:bg-zinc-700" : ""}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    {(element.config.triggerText as string) || "Learn More"}
                  </Button>
                ) : (element.config.triggerStyle as string) === "icon" ? (
                  <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full ${isDarkMode ? "hover:bg-zinc-700" : ""}`}>
                    <HelpCircle className={`h-4 w-4 ${mutedText}`} />
                  </Button>
                ) : (
                  <button className={`underline text-sm ${isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-primary hover:text-primary/80"}`}>
                    {(element.config.triggerText as string) || "Learn More"}
                  </button>
                )}
              </DialogTrigger>
              <DialogContent className={isDarkMode ? "bg-zinc-900 border-zinc-700 text-white" : ""}>
                <DialogHeader>
                  <DialogTitle className={headingText}>
                    {(element.config.modalTitle as string) || "Information"}
                  </DialogTitle>
                </DialogHeader>
                <div className={`prose prose-sm max-w-none ${isDarkMode ? "prose-invert" : ""}`}>
                  <p className={`whitespace-pre-wrap ${bodyText}`}>
                    {sanitizeHtml((element.config.modalContent as string) || "")}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );

      case "custom_questions":
        if (customQuestions.length === 0) {
          return null; // Don't render if no custom questions configured
        }
        return (
          <div key={element.id} className="space-y-4">
            <h3 className={`font-semibold ${headingText}`}>{element.config.label || element.label}</h3>
            {customQuestions.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label className={`text-sm ${bodyText}`}>
                  {q.question} {q.required && "*"}
                </Label>
                {q.type === "select" && q.options ? (
                  <Select
                    value={customAnswers[q.id] || ""}
                    onValueChange={(value) =>
                      setCustomAnswers((prev) => ({ ...prev, [q.id]: value }))
                    }
                  >
                    <SelectTrigger className={inputBg}>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent className={isDarkMode ? "bg-zinc-800 border-zinc-700" : ""}>
                      {q.options.map((opt) => (
                        <SelectItem key={opt} value={opt} className={isDarkMode ? "focus:bg-zinc-700" : ""}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : q.type === "textarea" ? (
                  <textarea
                    value={customAnswers[q.id] || ""}
                    onChange={(e) =>
                      setCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    className={`w-full h-24 p-2 text-sm rounded-md border resize-none ${isDarkMode ? "bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400" : "bg-white border-gray-300"}`}
                    placeholder="Enter your answer..."
                  />
                ) : (
                  <Input
                    value={customAnswers[q.id] || ""}
                    onChange={(e) =>
                      setCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder="Enter your answer"
                    className={inputBg}
                  />
                )}
              </div>
            ))}
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
  const isDark = themeClass === "dark";
  const isSidebarLayout = template.settings.layout === "sidebar";
  const isTwoColumn = template.settings.layout === "two_column";
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

    // Theme-aware classes for sidebar
    const sidebarCardBg = isDark ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200";
    const sidebarInputBg = isDark ? "bg-zinc-700 border-zinc-600 text-white" : "bg-white border-gray-300";
    const sidebarMutedText = isDark ? "text-zinc-400" : "text-gray-500";
    const sidebarHeadingText = isDark ? "text-white" : "text-gray-900";

    return (
      <div className="w-80 flex-shrink-0 space-y-4">
        {/* Promo Code in Sidebar */}
        {promoCodeElement && (
          <Card className={sidebarCardBg}>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${sidebarMutedText}`} />
                  <Input
                    placeholder="Enter promo code"
                    className={`pl-9 ${sidebarInputBg}`}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={!!appliedPromo}
                  />
                </div>
                {appliedPromo ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className={isDark ? "border-zinc-600 hover:bg-zinc-700" : ""}
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
                    className={isDark ? "border-zinc-600 hover:bg-zinc-700" : ""}
                    onClick={applyPromoCode}
                    disabled={applyingPromo || !promoCode}
                  >
                    {applyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                )}
              </div>
              {appliedPromo && (
                <p className="text-xs text-green-500 mt-2">
                  {appliedPromo.discountType === "percent" ? `${appliedPromo.discount}%` : `$${appliedPromo.discount.toFixed(2)}`} discount applied!
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        <Card className={`sticky top-4 ${sidebarCardBg}`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${sidebarHeadingText}`}>
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
                      <div key={ticketId} className={`flex justify-between text-sm ${isDark ? "text-zinc-200" : "text-gray-700"}`}>
                        <span>{ticket.name} x{qty}</span>
                        <span className="font-medium">${(ticket.price * qty).toFixed(2)}</span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className={`text-sm text-center py-4 ${sidebarMutedText}`}>
                No tickets selected
              </div>
            )}

            {totals.ticketCount > 0 && (
              <>
                <Separator className={isDark ? "bg-zinc-700" : ""} />
                <div className="space-y-2">
                  <div className={`flex justify-between text-sm ${sidebarMutedText}`}>
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between text-sm text-green-500">
                      <span>Discount ({appliedPromo.discountType === "percent" ? `${appliedPromo.discount}%` : `$${appliedPromo.discount.toFixed(2)}`})</span>
                      <span>-${totals.discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <Separator className={isDark ? "bg-zinc-700" : ""} />
                <div className={`flex justify-between font-bold text-lg ${sidebarHeadingText}`}>
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

  // For two-column full-page layout
  if (isTwoColumn) {
    const elements = getPageElementsToRender(currentPageData?.elements || []);
    const leftElements = elements.filter(e => e.column === "left" || !e.column);
    const rightElements = elements.filter(e => e.column === "right");

    const widthClasses = {
      "1/3": { left: "w-1/3", right: "w-2/3" },
      "1/2": { left: "w-1/2", right: "w-1/2" },
      "2/3": { left: "w-2/3", right: "w-1/3" },
    };
    const leftWidth = template.settings.twoColumnLeftWidth || "1/2";
    const stackOnMobile = template.settings.twoColumnStackOnMobile !== false;

    // Get column colors with defaults
    const leftBgColor = template.settings.twoColumnLeftBgColor || (isDark ? "#27272a" : "#ffffff");
    const rightBgColor = template.settings.twoColumnRightBgColor || (isDark ? "#18181b" : "#f4f4f5");
    const leftTextColor = template.settings.twoColumnLeftTextColor || (isDark ? "#ffffff" : "#000000");
    const rightTextColor = template.settings.twoColumnRightTextColor || (isDark ? "#ffffff" : "#000000");
    const leftContent = template.settings.twoColumnLeftContent || "";
    const rightContent = template.settings.twoColumnRightContent || "";

    return (
      <div className={`min-h-screen ${themeClass}`}>
        <div className={`flex min-h-screen ${stackOnMobile ? "flex-col md:flex-row" : "flex-row"}`}>
          {/* Left Column - Full height */}
          <div
            className={`${stackOnMobile ? "w-full md:" + widthClasses[leftWidth].left : widthClasses[leftWidth].left} flex flex-col p-6 md:p-8 lg:p-12`}
            style={{ backgroundColor: leftBgColor, color: leftTextColor }}
          >
            {/* Progress Bar in left column for multi-page */}
            {template.settings.showProgressBar && template.pages.length > 1 && (
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  {template.pages.map((page, i) => (
                    <span
                      key={page.id}
                      className={`flex-1 text-center text-sm ${
                        i === currentPage ? "font-medium" : "opacity-60"
                      }`}
                    >
                      {page.title || `Step ${i + 1}`}
                    </span>
                  ))}
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${((currentPage + 1) / template.pages.length) * 100}%`,
                      backgroundColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Left column content text */}
            {leftContent && (
              <div className="whitespace-pre-wrap text-base leading-relaxed mb-6">
                {leftContent}
              </div>
            )}

            {/* Left column elements */}
            <div className="space-y-6 flex-1">
              {leftElements.map((element) => renderElement(element))}
            </div>
          </div>

          {/* Right Column - Full height */}
          <div
            className={`${stackOnMobile ? "w-full md:" + widthClasses[leftWidth].right : widthClasses[leftWidth].right} flex flex-col p-6 md:p-8 lg:p-12`}
            style={{ backgroundColor: rightBgColor, color: rightTextColor }}
          >
            {/* Right column content text */}
            {rightContent && (
              <div className="whitespace-pre-wrap text-base leading-relaxed mb-6">
                {rightContent}
              </div>
            )}

            {/* Right column elements */}
            <div className="space-y-6 flex-1">
              {rightElements.map((element) => renderElement(element))}
            </div>

            {/* Navigation buttons at bottom of right column */}
            {!hasPaymentOnCurrentPage && template.pages.length > 1 && (
              <div className="flex justify-between mt-6 pt-6" style={{ borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", borderTopWidth: "1px" }}>
                <Button
                  variant="outline"
                  onClick={goToPrevPage}
                  disabled={currentPage === 0 || !template.settings.allowBackNavigation}
                  style={{ borderColor: isDark ? "rgba(255,255,255,0.3)" : undefined, color: rightTextColor }}
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
        </div>
      </div>
    );
  }

  // Single column and sidebar layouts
  return (
    <div className={`min-h-screen ${themeClass} ${isDark ? "bg-zinc-900 text-white" : "bg-white"}`}>
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
                    ? isDark ? "text-blue-400 font-medium" : "text-primary font-medium"
                    : i < currentPage
                    ? isDark ? "text-zinc-400" : "text-muted-foreground"
                    : isDark ? "text-zinc-600" : "text-muted-foreground/50"
                }`}
              >
                {page.title || `Step ${i + 1}`}
              </span>
            ))}
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-zinc-700" : "bg-muted"}`}>
            <div
              className={`h-full transition-all duration-300 ${isDark ? "bg-blue-500" : "bg-primary"}`}
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
          <Card className={isDark ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}>
            <CardHeader>
              <CardTitle className={isDark ? "text-white" : "text-gray-900"}>{currentPageData?.title || `Step ${currentPage + 1}`}</CardTitle>
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
              <Card className={isDark ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDark ? "text-zinc-400" : "text-gray-500"}`}>
                      {totals.ticketCount} ticket{totals.ticketCount !== 1 ? "s" : ""}
                    </span>
                    <span className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>${totals.total.toFixed(2)}</span>
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
                className={isDark ? "border-zinc-600 text-zinc-200 hover:bg-zinc-700" : ""}
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
