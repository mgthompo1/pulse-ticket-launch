import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Calendar,
  MapPin,
  Ticket,
  Minus,
  Plus,
  CreditCard,
  HelpCircle,
  Heart,
  ShoppingCart,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCheckoutEngine } from "@/hooks/useCheckoutEngine";
import { PromoCodeInput } from "@/components/checkout/PromoCodeInput";
import { MerchandiseCartItem, TicketType, CustomerInfo, EventData, CustomQuestion, WindcaveLink } from "@/types/widget";
import { StripeCardForm } from "@/components/payment/StripeCardForm";
import { GuestSeatSelector } from "@/components/GuestSeatSelector";
import MerchandiseSelector from "@/components/MerchandiseSelector";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import { Theme } from "@/types/theme";

// Windcave types
interface WindcaveDropInConfig {
  container: string;
  links: WindcaveLink[];
  totalValue: string;
  card: {
    hideCardholderName: boolean;
    supportedCards: string[];
    disableCardAutoComplete: boolean;
    cardImagePlacement: string;
    sideIcons: string[];
    enableCardValidation: boolean;
    enableCardFormatting: boolean;
  };
  security: {
    enableAutoComplete: boolean;
    enableSecureForm: boolean;
    enableFormValidation: boolean;
  };
  mobilePayments?: {
    buttonType: string;
    buttonStyle: string;
    buttonLocale: string;
    merchantName: string;
    countryCode: string;
    currencyCode: string;
    supportedNetworks: string[];
    isTest: boolean;
    applePay: {
      merchantId: string;
      onSuccess: (status: string) => Promise<boolean> | void;
      onError?: (stage: string, error: string) => void;
    };
    googlePay?: {
      onSuccess: (status: string) => Promise<boolean> | void;
      onError?: (stage: string, error: string) => void;
    };
  };
  onSuccess?: (status: string, data?: any) => Promise<void> | void;
  onError?: (error: string) => void;
  options: {
    enableAutoComplete: boolean;
    enableSecureForm: boolean;
    enableFormValidation: boolean;
    enableCardValidation: boolean;
    enableCardFormatting: boolean;
  };
}

interface WindcaveDropInInstance {
  close: () => void;
}

interface PromoCodeHooks {
  promoCode: string;
  setPromoCode: (code: string) => void;
  promoCodeId: string | null;
  promoDiscount: number;
  promoError: string | null;
  isValidating: boolean;
  groupDiscount: number;
  groupDiscountTier: number | null;
  applyPromoCode: () => void;
  clearPromoCode: () => void;
  getTotalDiscount: () => number;
  calculateFinalTotal: (subtotal: number) => number;
}

interface ReservationHooks {
  reservations: any[];
  timeRemaining: number;
  reserveTickets: (ticketTypeId: string, quantity: number) => Promise<void>;
  reserveMultipleTickets: (tickets: Array<{ ticketTypeId: string; quantity: number }>) => Promise<void>;
  completeAllReservations: (orderId: string) => Promise<void>;
  cancelAllReservations: () => Promise<void>;
  extendReservation: () => boolean;
  formatTimeRemaining: () => string;
  hasActiveReservations: () => boolean;
}

interface SinglePageCheckoutProps {
  eventData: EventData;
  ticketTypes: TicketType[];
  customQuestions: CustomQuestion[];
  // Payment configuration
  paymentProvider: string;
  stripePublishableKey?: string;
  // Windcave specifics
  onCreateWindcaveSession?: () => Promise<void>;
  windcaveReady?: boolean;
  showWindcavePaymentForm?: boolean;
  onBackToTickets?: () => void;
  dropInRef?: React.RefObject<HTMLDivElement>;
  // Hooks from parent
  promoCodeHooks?: PromoCodeHooks;
  reservationHooks?: ReservationHooks;
  // Group purchase context
  groupId?: string | null;
  allocationId?: string | null;
  // Callbacks
  onPaymentSuccess?: (orderId: string) => Promise<void>;
  // Utility functions from parent
  getAvailableQuantity?: (ticketType: TicketType) => number;
}

export const SinglePageCheckout: React.FC<SinglePageCheckoutProps> = ({
  eventData,
  ticketTypes,
  customQuestions,
  paymentProvider,
  stripePublishableKey,
  onCreateWindcaveSession,
  windcaveReady,
  showWindcavePaymentForm,
  onBackToTickets,
  dropInRef,
  promoCodeHooks,
  reservationHooks,
  groupId,
  allocationId,
  onPaymentSuccess,
  getAvailableQuantity: externalGetAvailableQuantity,
}) => {
  const {
    cartItems,
    addToCart,
    updateQuantity,
    customerInfo,
    setCustomerInfo,
    selectedDonationAmount,
    setSelectedDonationAmount,
    customDonationAmount,
    setCustomDonationAmount,
    theme,
    cartTotals,
    promoHooks: internalPromoHooks,
    merchandiseCart,
    setMerchandiseCart,
  } = useCheckoutEngine({
    eventData,
    ticketTypes,
    customQuestions,
    promoCodeHooks,
    groupId,
    allocationId,
  });

  // Use external promo hooks if provided, otherwise internal
  const promoHooks = promoCodeHooks || internalPromoHooks;

  // Local state
  const [showPayment, setShowPayment] = useState(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  // Computed values
  const isStripePayment = paymentProvider === "stripe";
  const eventTheme: Theme = useMemo(() => theme, [theme]);

  // Use platform Stripe key for Stripe Connect (same as StripePaymentModal)
  const platformStripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

  // Donation configuration
  const crmEnabled = eventData?.organizations?.crm_enabled ?? (eventData as any)?.crm_enabled;
  const isDonationsEnabled = eventData?.donations_enabled && crmEnabled;
  const donationSuggestedAmounts = (eventData?.donation_suggested_amounts || [5, 10, 25, 50, 100]).map(amount =>
    typeof amount === 'string' ? parseFloat(amount) : amount
  );
  const donationTitle = eventData?.donation_title || 'Support Our Cause';
  const donationDescription = eventData?.donation_description;

  // Extract theme colors for easier access
  const primaryColor = eventTheme.primaryColor;
  const buttonTextColor = eventTheme.buttonTextColor;
  const headerTextColor = eventTheme.headerTextColor;
  const bodyTextColor = eventTheme.bodyTextColor;

  // Get available quantity for a ticket type
  const getAvailableQuantity = useCallback((ticketType: TicketType) => {
    if (externalGetAvailableQuantity) {
      return externalGetAvailableQuantity(ticketType);
    }
    return ticketType.quantity_available - ticketType.quantity_sold;
  }, [externalGetAvailableQuantity]);

  // Calculate totals
  const ticketCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const ticketSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const merchandiseTotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
  const subtotal = ticketSubtotal + merchandiseTotal;

  const creditCardProcessingFee = eventData?.organizations?.credit_card_processing_fee_percentage || 0;
  const bookingFeeEnabled = eventData?.organizations?.stripe_booking_fee_enabled && paymentProvider === 'stripe';

  const getTotalDiscount = () => promoHooks?.getTotalDiscount() || 0;

  const getTotalAmount = () => {
    let total = subtotal - getTotalDiscount();
    if (creditCardProcessingFee > 0) {
      total += total * (creditCardProcessingFee / 100);
    }
    if (bookingFeeEnabled) {
      total += (subtotal * 0.01) + 0.50;
    }
    if (selectedDonationAmount && selectedDonationAmount > 0) {
      total += selectedDonationAmount;
    }
    return Math.max(0, total);
  };

  // Handlers
  const handleAddToCart = (ticketType: TicketType) => {
    addToCart(ticketType);
  };

  const handleDonationAmountSelect = (amount: number) => {
    setSelectedDonationAmount(amount);
    setCustomDonationAmount('');
  };

  const handleCustomDonationChange = (value: string) => {
    setCustomDonationAmount(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      setSelectedDonationAmount(amount);
    } else {
      setSelectedDonationAmount(null);
    }
  };

  const updateCartQuantity = (ticketTypeId: string, newQuantity: number) => {
    updateQuantity(ticketTypeId, newQuantity);
  };

  const updateMerchandiseQuantity = (index: number, quantity: number) => {
    setMerchandiseCart(prev => {
      if (quantity === 0) {
        return prev.filter((_, i) => i !== index);
      }
      return prev.map((item, i) => i === index ? { ...item, quantity } : item);
    });
  };

  const handleCheckout = () => {
    // Track checkout start
    if (eventData) {
      trackBeginCheckout(eventData.id, eventData.name, getTotalAmount(), eventData.organizations?.currency || 'USD');
    }

    if (paymentProvider === "windcave" && onCreateWindcaveSession) {
      onCreateWindcaveSession();
    } else {
      setShowPayment(true);
    }
  };

  // Validate custom questions
  const validateCustomQuestions = (): boolean => {
    const errors: Record<string, string> = {};
    customQuestions.forEach((q) => {
      if (q.required && !customAnswers[q.id]) {
        errors[q.id] = `${q.label} is required`;
      }
    });
    setCustomErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canProceedToPayment = customerInfo.name && customerInfo.email && (cartItems.length > 0 || merchandiseCart.length > 0);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: eventTheme.backgroundColor,
        fontFamily: eventTheme.fontFamily,
        color: headerTextColor,
      }}
    >
      <div className="max-w-7xl mx-auto bg-white">
        {/* Event Header / Hero Section */}
        <div className="bg-white py-8 px-4">
          {/* Logo Container - Centered */}
          <div className="max-w-4xl mx-auto">
            {eventData.widget_customization?.layout?.showEventImage !== false && (
              <div className="text-center mb-8">
                {(eventData as any).logo_url ? (
                  <img
                    src={(eventData as any).logo_url}
                    alt={`${eventData.name} Logo`}
                    className="mx-auto max-h-64 w-auto object-contain rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                    <Ticket className="h-16 w-16" style={{ color: primaryColor }} />
                  </div>
                )}

                {/* Organization Logo */}
                {eventData.widget_customization?.branding?.showOrgLogo &&
                  (eventData.organizations as any)?.logo_url &&
                  (eventData.organizations as any).logo_url !== (eventData as any).logo_url && (
                    <div className="mt-6">
                      <img
                        src={(eventData.organizations as any).logo_url}
                        alt={`${eventData.organizations?.name || 'Organization'} Logo`}
                        className="h-12 mx-auto object-contain"
                      />
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Event Info - Left Aligned */}
          <div className="max-w-4xl">
            <div className="space-y-6 text-left max-w-2xl">
              {/* Event Name */}
              <h1 className="text-3xl md:text-4xl font-bold leading-tight" style={{ color: headerTextColor }}>
                {eventData.name}
              </h1>

              {/* Event Details */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-base" style={{ color: bodyTextColor }}>
                  {/* Date */}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" style={{ color: primaryColor }} />
                    <span className="font-medium">
                      {new Date(eventData.event_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {(eventData as any).event_time && `, ${(eventData as any).event_time}`}
                    </span>
                  </div>

                  {/* Venue */}
                  {eventData.widget_customization?.layout?.showVenue !== false && eventData.venue && (
                    <>
                      <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" style={{ color: primaryColor }} />
                        <span className="font-medium">{eventData.venue}</span>
                      </div>
                    </>
                  )}

                  {/* Host/Organization */}
                  {eventData.organizations?.name && (
                    <>
                      <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                          <span className="text-xs text-white font-bold">H</span>
                        </div>
                        <span><span className="font-medium">{eventData.organizations.name}</span></span>
                      </div>
                    </>
                  )}
                </div>

                {/* Add to Calendar Button */}
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sm"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                    onClick={() => {
                      const startDate = new Date(eventData.event_date);
                      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
                      const title = encodeURIComponent(eventData.name);
                      const details = encodeURIComponent(eventData.description?.replace(/<[^>]*>/g, '') || '');
                      const location = encodeURIComponent(eventData.venue || '');
                      const startTime = startDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
                      const endTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
                      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
                      window.open(googleUrl, '_blank');
                    }}
                  >
                    Add to calendar
                  </Button>
                </div>

                {/* Event Description */}
                {eventData.widget_customization?.layout?.showDescription !== false && eventData.description && (
                  <div className="mt-6">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: headerTextColor }}>
                      {eventData?.widget_customization?.textCustomization?.eventDescriptionTitle ?? "Event description"}
                    </h2>
                    <div
                      className="text-base leading-relaxed prose max-w-none [&>p]:mb-3 [&>p]:leading-relaxed"
                      style={{ color: bodyTextColor }}
                      dangerouslySetInnerHTML={{ __html: eventData.description }}
                    />
                  </div>
                )}
              </div>

              {/* Custom Header Text */}
              {eventData.widget_customization?.branding?.customHeaderText && (
                <div
                  className="text-lg leading-relaxed"
                  style={{ color: bodyTextColor }}
                  dangerouslySetInnerHTML={{ __html: eventData.widget_customization.branding.customHeaderText }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div id="tickets-section" className="grid grid-cols-1 xl:grid-cols-3 gap-8 px-4 pb-8">
          {/* Left Column - Forms */}
          <div className="xl:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card className="animate-in fade-in-0" style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold" style={{ color: headerTextColor }}>
                  <Ticket className="h-6 w-6" />
                  Your Information
                </CardTitle>
                <p className="text-gray-600 mt-2">We'll use this to send you your tickets</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" style={{ color: bodyTextColor }}>Full Name *</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                      className="mt-1"
                      style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" style={{ color: bodyTextColor }}>Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                      className="mt-1"
                      style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="phone" style={{ color: bodyTextColor }}>Phone Number</Label>
                    <Input
                      id="phone"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className="mt-1"
                      style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Questions */}
            {customQuestions.length > 0 && (
              <Card className="animate-in fade-in-0" style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold" style={{ color: headerTextColor }}>
                    <HelpCircle className="h-6 w-6" />
                    Additional Information
                  </CardTitle>
                  <p className="text-gray-600 mt-2">
                    Please provide the following information before selecting your tickets.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customQuestions.map((q: CustomQuestion) => (
                      <div key={q.id} className="space-y-2">
                        <Label className="font-medium">
                          {q.label} {q.required && <span className="text-destructive">*</span>}
                        </Label>
                        {q.type === 'text' && (
                          <Input
                            value={customAnswers[q.id] || ''}
                            onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                            placeholder={q.label}
                            style={{ backgroundColor: eventTheme.inputBackgroundColor }}
                          />
                        )}
                        {q.type === 'textarea' && (
                          <textarea
                            className="w-full border rounded p-2"
                            value={customAnswers[q.id] || ''}
                            onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                            placeholder={q.label}
                            rows={3}
                            style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}
                          />
                        )}
                        {(q.type === 'select' || q.type === 'radio') && (
                          <Select
                            value={customAnswers[q.id] || ''}
                            onValueChange={(value) => setCustomAnswers(a => ({ ...a, [q.id]: value }))}
                          >
                            <SelectTrigger style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `2px solid ${eventTheme.borderColor}` : undefined }}>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {((q as any).options || '').split('\n').map((opt: string, idx: number) => (
                                <SelectItem key={idx} value={opt.trim()}>
                                  {opt.trim()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {q.type === 'checkbox' && (
                          <div className="flex flex-col gap-1">
                            {((q as any).options || '').split('\n').map((opt: string, idx: number) => (
                              <label key={idx} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={Array.isArray(customAnswers[q.id]) ? customAnswers[q.id].includes(opt.trim()) : false}
                                  onChange={e => {
                                    setCustomAnswers((a: any) => {
                                      const arr = Array.isArray(a[q.id]) ? a[q.id] : [];
                                      if (e.target.checked) {
                                        return { ...a, [q.id]: [...arr, opt.trim()] };
                                      } else {
                                        return { ...a, [q.id]: (arr as string[]).filter((v: string) => v !== opt.trim()) };
                                      }
                                    });
                                  }}
                                />
                                {opt.trim()}
                              </label>
                            ))}
                          </div>
                        )}
                        {q.type === 'email' && (
                          <Input
                            type="email"
                            value={customAnswers[q.id] || ''}
                            onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                            placeholder={q.label}
                            style={{ backgroundColor: eventTheme.inputBackgroundColor }}
                          />
                        )}
                        {q.type === 'phone' && (
                          <Input
                            type="tel"
                            value={customAnswers[q.id] || ''}
                            onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                            placeholder={q.label}
                            style={{ backgroundColor: eventTheme.inputBackgroundColor }}
                          />
                        )}
                        {customErrors[q.id] && (
                          <p className="text-xs text-destructive">{customErrors[q.id]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Donation Card */}
            {isDonationsEnabled && (
              <Card className="animate-in fade-in-0" style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold" style={{ color: headerTextColor }}>
                    <Heart className="h-6 w-6" style={{ color: primaryColor }} />
                    {donationTitle}
                  </CardTitle>
                  {donationDescription && (
                    <p className="text-gray-600 mt-2" style={{ color: bodyTextColor }}>
                      {donationDescription}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Suggested Amounts */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {donationSuggestedAmounts.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        onClick={() => handleDonationAmountSelect(amount)}
                        className={`font-semibold ${selectedDonationAmount === amount && !customDonationAmount ? 'ring-2' : ''}`}
                        style={{
                          borderColor: selectedDonationAmount === amount && !customDonationAmount ? primaryColor : eventTheme.borderColor,
                          color: selectedDonationAmount === amount && !customDonationAmount ? primaryColor : bodyTextColor,
                          backgroundColor: selectedDonationAmount === amount && !customDonationAmount ? `${primaryColor}10` : eventTheme.cardBackgroundColor
                        }}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>

                  {/* Custom Amount */}
                  <div className="space-y-2">
                    <Label style={{ color: bodyTextColor }}>Or enter a custom amount</Label>
                    <div className="flex items-center gap-2">
                      <span style={{ color: bodyTextColor }}>$</span>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={customDonationAmount}
                        onChange={(e) => handleCustomDonationChange(e.target.value)}
                        style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}
                      />
                    </div>
                  </div>

                  {/* No donation option */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDonationAmount(null);
                      setCustomDonationAmount('');
                    }}
                    className="text-sm"
                    style={{ color: bodyTextColor }}
                  >
                    Continue without donating
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Ticket Selection */}
            <Card className="animate-in fade-in-0" style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold" style={{ color: headerTextColor }}>
                  <Ticket className="h-6 w-6" />
                  {eventData?.widget_customization?.textCustomization?.ticketSelectionTitle ?? "Select Your Tickets"}
                </CardTitle>
                <p className="text-gray-600 mt-2">{eventData?.widget_customization?.textCustomization?.ticketSelectionSubtitle ?? "Choose the tickets you'd like to purchase"}</p>
              </CardHeader>
              <CardContent>
                {ticketTypes.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="h-12 w-12 mx-auto mb-4" style={{ color: headerTextColor }} />
                    <p style={{ color: headerTextColor }}>No ticket types available for this event.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticketTypes.map((ticketType) => {
                      const availableQty = getAvailableQuantity(ticketType);
                      const cartItem = cartItems.find(item => item.id === ticketType.id);

                      return (
                        <div key={ticketType.id} className="group border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="font-bold text-lg text-gray-900 leading-tight">{ticketType.name}</h3>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-gray-900">${ticketType.price}</div>
                                  {eventData.widget_customization?.layout?.showCapacity !== false && (
                                    <div className="text-sm text-gray-500 font-medium">
                                      {availableQty} available
                                    </div>
                                  )}
                                </div>
                              </div>
                              {ticketType.description && (
                                <p className="text-gray-600 text-sm leading-relaxed">{ticketType.description}</p>
                              )}
                            </div>

                            {/* Add to Cart / Quantity Controls */}
                            <div className="lg:ml-8">
                              {cartItem ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateCartQuantity(ticketType.id, cartItem.quantity - 1)}
                                    className="h-10 w-10 p-0"
                                    style={{ borderColor: primaryColor, color: primaryColor }}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-10 text-center font-bold text-lg">{cartItem.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateCartQuantity(ticketType.id, cartItem.quantity + 1)}
                                    className="h-10 w-10 p-0"
                                    style={{ borderColor: primaryColor, color: primaryColor }}
                                    disabled={cartItem.quantity >= availableQty}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => handleAddToCart(ticketType)}
                                  className="w-full lg:w-auto font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                                  style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                                  disabled={availableQty <= 0}
                                  size="default"
                                >
                                  {availableQty <= 0 ? (
                                    "Sold Out"
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-2" />
                                      {eventData.widget_customization?.branding?.buttonText || "Add to Cart"}
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Merchandise Selection */}
            <MerchandiseSelector
              eventId={eventData.id}
              onCartUpdate={setMerchandiseCart}
              theme={eventTheme}
            />

            {/* Seat Selection - Show if enabled and has seated tickets in cart */}
            {eventData?.widget_customization?.seatMaps?.enabled && cartItems.some(item => item.selectedSeats) && (
              <Card className="animate-in fade-in-0" style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Selected Seats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cartItems.filter(item => item.selectedSeats).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.selectedSeats?.length} seat(s) selected
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Order Summary Sidebar */}
          <div className="space-y-6">
            <Card className="animate-in fade-in-0 sticky top-6" style={{ backgroundColor: eventTheme.cardBackgroundColor }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold" style={{ color: headerTextColor }}>
                  <ShoppingCart className="h-6 w-6" />
                  Order Summary
                  {(cartItems.length > 0 || merchandiseCart.length > 0) && (
                    <Badge variant="secondary" className="ml-auto text-sm">
                      {ticketCount + merchandiseCart.reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cartItems.length === 0 && merchandiseCart.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3" style={{ color: headerTextColor }} />
                    <p style={{ color: headerTextColor }}>Your cart is empty</p>
                    <p className="text-sm mt-1" style={{ color: bodyTextColor }}>Add tickets or merchandise to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Ticket Cart Items */}
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: headerTextColor }}>{item.name}</p>
                          <p className="text-sm" style={{ color: bodyTextColor }}>${item.price} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 p-0"
                            style={{ borderColor: primaryColor, color: primaryColor }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium" style={{ color: headerTextColor }}>{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                            style={{ borderColor: primaryColor, color: primaryColor }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Merchandise Cart Items */}
                    {merchandiseCart.map((item, index) => (
                      <div key={`merch-${index}`} className="flex justify-between items-start gap-3 p-3 bg-primary/5 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: headerTextColor }}>{item.merchandise.name}</p>
                          <p className="text-sm" style={{ color: bodyTextColor }}>
                            ${item.merchandise.price} each
                            {(item as any).selectedSize && ` • Size: ${(item as any).selectedSize}`}
                            {(item as any).selectedColor && ` • Color: ${(item as any).selectedColor}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateMerchandiseQuantity(index, item.quantity - 1)}
                            className="h-8 w-8 p-0"
                            style={{ borderColor: primaryColor, color: primaryColor }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium" style={{ color: headerTextColor }}>{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateMerchandiseQuantity(index, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                            style={{ borderColor: primaryColor, color: primaryColor }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Promo Code Input */}
                    {(cartItems.length > 0 || merchandiseCart.length > 0) && promoHooks && (
                      <div className="border-t pt-3 pb-3">
                        <h3 className="font-semibold text-sm mb-3" style={{ color: headerTextColor }}>Promo Code</h3>
                        <PromoCodeInput
                          promoCode={promoHooks.promoCode}
                          setPromoCode={promoHooks.setPromoCode}
                          promoDiscount={promoHooks.promoDiscount}
                          promoError={promoHooks.promoError}
                          isValidating={promoHooks.isValidating}
                          onApply={promoHooks.applyPromoCode}
                          onClear={promoHooks.clearPromoCode}
                        />
                        {promoHooks.groupDiscountTier && ticketCount >= promoHooks.groupDiscountTier && (
                          <p className="text-xs text-green-600 font-medium mt-2">
                            ✨ Group discount active! Saving with {ticketCount}+ tickets
                          </p>
                        )}
                        {reservationHooks?.hasActiveReservations() && (
                          <div className="mt-3 p-2 bg-orange-50 border border-orange-300 rounded text-xs text-orange-800">
                            ⏱️ <strong>Tickets reserved!</strong> Complete within <strong>{reservationHooks.formatTimeRemaining()}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Totals */}
                    <div className="border-t pt-3">
                      {/* Subtotal breakdown */}
                      {cartItems.length > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Tickets:</span>
                          <span className="text-sm">${ticketSubtotal.toFixed(2)}</span>
                        </div>
                      )}
                      {merchandiseCart.length > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Merchandise:</span>
                          <span className="text-sm">${merchandiseTotal.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Show subtotal if there are fees or discounts */}
                      {(creditCardProcessingFee > 0 || getTotalDiscount() > 0 || bookingFeeEnabled) && (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">Subtotal:</span>
                            <span className="text-sm">${subtotal.toFixed(2)}</span>
                          </div>

                          {/* Show discounts */}
                          {getTotalDiscount() > 0 && (
                            <div className="bg-green-50 -mx-2 px-2 py-2 rounded mb-2">
                              {promoHooks && promoHooks.promoDiscount > 0 && promoHooks.promoDiscount >= promoHooks.groupDiscount && (
                                <div className="flex justify-between items-center text-green-700">
                                  <span className="text-sm font-semibold">🎟️ Promo: {promoHooks.promoCode}</span>
                                  <span className="text-sm font-semibold">-${promoHooks.promoDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              {promoHooks && promoHooks.groupDiscount > 0 && promoHooks.groupDiscount > promoHooks.promoDiscount && (
                                <div className="flex justify-between items-center text-green-700">
                                  <span className="text-sm font-semibold">👥 Group Discount ({promoHooks.groupDiscountTier}+)</span>
                                  <span className="text-sm font-semibold">-${promoHooks.groupDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-green-800 border-t border-green-200 mt-1 pt-1">
                                <span className="text-xs font-bold">Total Savings:</span>
                                <span className="text-sm font-bold">-${getTotalDiscount().toFixed(2)}</span>
                              </div>
                            </div>
                          )}

                          {creditCardProcessingFee > 0 && (
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">Processing Fee ({creditCardProcessingFee}%):</span>
                              <span className="text-sm">${((subtotal - getTotalDiscount()) * creditCardProcessingFee / 100).toFixed(2)}</span>
                            </div>
                          )}
                          {bookingFeeEnabled && (
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">Booking Fee:</span>
                              <span className="text-sm">${((subtotal * 0.01) + 0.50).toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Donation */}
                      {selectedDonationAmount && selectedDonationAmount > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Donation:</span>
                          <span className="text-sm">${selectedDonationAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span style={{ color: headerTextColor }}>${getTotalAmount().toFixed(2)}</span>
                      </div>

                      {/* Show savings highlight */}
                      {getTotalDiscount() > 0 && (
                        <div className="mt-2 text-center p-2 bg-green-100 border border-green-300 rounded">
                          <p className="text-xs text-green-800 font-semibold">
                            🎉 You're saving ${getTotalDiscount().toFixed(2)}!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Checkout Button */}
                    <Button
                      onClick={handleCheckout}
                      variant="secondary"
                      className="w-full mt-4 border-0"
                      size="lg"
                      disabled={!canProceedToPayment}
                      style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Proceed to Payment
                    </Button>

                    {(!customerInfo.name || !customerInfo.email) && (
                      <p className="text-xs text-muted-foreground text-center">
                        Please fill in your information to continue
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Windcave Payment Form */}
            {showWindcavePaymentForm && paymentProvider === "windcave" && (
              <Card className="animate-in fade-in-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment
                    </CardTitle>
                    {onBackToTickets && (
                      <Button variant="ghost" size="sm" onClick={onBackToTickets} className="p-2">
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Complete your payment securely</p>
                </CardHeader>
                <CardContent>
                  <div
                    ref={dropInRef}
                    id="windcave-drop-in"
                    className="w-full max-w-none"
                  >
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-sm text-muted-foreground">Loading secure payment form...</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Secure payment powered by Windcave</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Stripe Payment Modal */}
        {showPayment && paymentProvider === "stripe" && platformStripeKey && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md">
              <Card style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Complete Payment
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowPayment(false)} className="p-2">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Order Summary */}
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Order Summary</h3>
                    <div className="space-y-1 text-sm">
                      {cartItems.map(item => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.name} x{item.quantity}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      {merchandiseCart.map((item, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.merchandise.name} x{item.quantity}</span>
                          <span>${(item.merchandise.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>${getTotalAmount().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <StripeCardForm
                    eventId={eventData.id}
                    cart={cartItems}
                    merchandiseCart={merchandiseCart}
                    customerInfo={customerInfo}
                    total={getTotalAmount()}
                    theme={eventTheme}
                    bookingFeesEnabled={bookingFeeEnabled || false}
                    subtotal={subtotal}
                    bookingFee={bookingFeeEnabled ? ((subtotal * 0.01) + 0.50) : 0}
                    currency={eventData?.organizations?.currency || 'USD'}
                    promoCodeId={promoHooks?.promoCodeId || null}
                    promoDiscount={promoHooks?.getTotalDiscount() || 0}
                    groupId={groupId}
                    allocationId={allocationId}
                    onCancel={() => setShowPayment(false)}
                    onSuccess={async (orderId: string) => {
                      // Track purchase
                      if (eventData) {
                        trackPurchase(
                          orderId,
                          eventData.id,
                          eventData.name,
                          getTotalAmount(),
                          eventData.organizations?.currency || 'USD',
                          ticketCount
                        );
                      }
                      if (onPaymentSuccess) {
                        await onPaymentSuccess(orderId);
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
