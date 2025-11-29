import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TicketSelection } from './TicketSelection';
import { AddOnsSelection } from './AddOnsSelection';
import { CustomerDetails } from './CustomerDetails';
import { Payment } from './Payment';
import { OrderSummary } from './OrderSummary';
import { StripePaymentModal } from './StripePaymentModal';
import { AttendeeInfo } from './AttendeeDetailsForm';
import { TicketType, CartItem, MerchandiseCartItem, CustomerInfo, EventData, CustomQuestion } from '@/types/widget';
import { Theme } from '@/types/theme';
import { usePromoCodeAndDiscounts } from '@/hooks/usePromoCodeAndDiscounts';
import { useTicketReservation } from '@/hooks/useTicketReservation';
import { useTaxCalculation, formatTaxForOrder } from '@/hooks/useTaxCalculation';
import { supabase } from '@/integrations/supabase/client';

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

interface MultiStepCheckoutProps {
  eventData: EventData;
  ticketTypes: TicketType[];
  customQuestions: CustomQuestion[];
  onClose?: () => void;
  promoCodeHooks?: PromoCodeHooks;
  reservationHooks?: ReservationHooks;
  groupId?: string | null;
  allocationId?: string | null;
}



type CheckoutStep = 'event' | 'tickets' | 'details' | 'payment';

export const MultiStepCheckout: React.FC<MultiStepCheckoutProps> = ({
  eventData,
  ticketTypes,
  customQuestions,
  promoCodeHooks,
  reservationHooks,
  groupId,
  allocationId,
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('event');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [merchandiseCart, setMerchandiseCart] = useState<MerchandiseCartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [showStripeModal, setShowStripeModal] = useState(false);

  // Abandoned cart tracking refs
  const sessionId = useRef<string>("");
  const abandonedCartSaved = useRef(false);

  // Generate session ID on mount
  useEffect(() => {
    sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Extract theme colors and branding from event data
            const themeData = eventData.widget_customization?.theme;
      const brandingData = eventData.widget_customization?.branding;
      const isEnabled = themeData?.enabled === true;

      const theme: Theme = {
        enabled: isEnabled,
        primaryColor: isEnabled ? (themeData?.primaryColor || '#ff4d00') : '#000000',
        buttonTextColor: isEnabled ? (themeData?.buttonTextColor || '#ffffff') : '#ffffff',
        secondaryColor: isEnabled ? (themeData?.secondaryColor || '#ffffff') : '#ffffff',
        backgroundColor: isEnabled ? (themeData?.backgroundColor || '#ffffff') : '#ffffff',
        cardBackgroundColor: isEnabled ? (themeData?.cardBackgroundColor || themeData?.backgroundColor || '#ffffff') : '#ffffff',
        inputBackgroundColor: isEnabled ? (themeData?.inputBackgroundColor || '#ffffff') : '#ffffff',
        borderEnabled: isEnabled ? (themeData?.borderEnabled ?? false) : false,
        borderColor: isEnabled ? (themeData?.borderColor || '#e5e7eb') : '#e5e7eb',
        headerTextColor: isEnabled ? (themeData?.headerTextColor || '#111827') : '#111827',
        bodyTextColor: isEnabled ? (themeData?.bodyTextColor || '#6b7280') : '#6b7280',
        fontFamily: isEnabled ? (themeData?.fontFamily || 'Manrope') : 'Manrope'
      };

  // Extract button text from branding
  const buttonText = brandingData?.buttonText || 'Get Tickets';

  // Dynamic steps based on payment provider
  const isStripePayment = eventData.organizations?.payment_provider === 'stripe';
  const steps = isStripePayment 
    ? [
        { key: 'event', label: 'Event', progress: 33 },
        { key: 'tickets', label: 'Tickets', progress: 66 },
        { key: 'details', label: 'Details', progress: 100 }
      ]
    : [
        { key: 'event', label: 'Event', progress: 25 },
        { key: 'tickets', label: 'Tickets', progress: 50 },
        { key: 'details', label: 'Details', progress: 75 },
        { key: 'payment', label: 'Payment', progress: 100 }
      ];

  const currentStepData = steps.find(step => step.key === currentStep);

  // Calculate totals for promo code hooks
  // Total number of attendee forms needed (accounting for attendees_per_ticket multiplier)
  const totalAttendees = cartItems.reduce((sum, item) => sum + (item.quantity * (item.attendees_per_ticket || 1)), 0);
  const ticketCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const ticketTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const merchandiseTotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
  const subtotal = ticketTotal + merchandiseTotal;

  // Get booking fees setting
  const bookingFeesEnabled = eventData.organizations?.stripe_booking_fee_enabled || false;

  // Initialize promo code hooks with MultiStepCheckout's own data
  const localPromoCodeHooks = usePromoCodeAndDiscounts({
    eventId: eventData.id,
    customerEmail: customerInfo?.email || '',
    ticketCount,
    subtotal,
  });

  // Get discount and apply it BEFORE tax calculation
  const discount = localPromoCodeHooks.getTotalDiscount();

  // Calculate discounted amounts (apply discount proportionally)
  let discountedTicketAmount = ticketTotal;
  let discountedMerchandiseAmount = merchandiseTotal;

  if (discount > 0 && subtotal > 0) {
    const discountRatio = 1 - (discount / subtotal);
    discountedTicketAmount = ticketTotal * discountRatio;
    discountedMerchandiseAmount = merchandiseTotal * discountRatio;
  }

  // Calculate tax using DISCOUNTED amounts
  const { taxBreakdown, taxCalculator } = useTaxCalculation({
    eventId: eventData.id,
    ticketAmount: discountedTicketAmount,
    addonAmount: discountedMerchandiseAmount,
    donationAmount: customerInfo?.donationAmount || 0,
    bookingFeePercent: bookingFeesEnabled ? 1.0 : 0,
    enabled: true,
  });

  // Initialize reservation hooks with MultiStepCheckout's own data
  const localReservationHooks = useTicketReservation(eventData.id);

  const addToCart = (ticketType: TicketType & { selectedSeats?: string[] }) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === ticketType.id);
      
      if (existingItem) {
        toast({
          title: "Ticket added",
          description: `${ticketType.name} added to cart`,
        });
        return prev.map(item =>
          item.id === ticketType.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      toast({
        title: "Ticket added",
        description: `${ticketType.name} added to cart`,
      });
      
      return [...prev, {
        ...ticketType,
        quantity: 1,
        type: 'ticket' as const,
        selectedSeats: ticketType.selectedSeats || []
      }];
    });
  };

  const updateTicketQuantity = (ticketTypeId: string, quantity: number) => {
    setCartItems(prev => {
      if (quantity === 0) {
        return prev.filter(item => item.id !== ticketTypeId);
      }

      return prev.map(item =>
        item.id === ticketTypeId ? { ...item, quantity } : item
      );
    });
  };

  const updateMerchandiseQuantity = (index: number, quantity: number) => {
    setMerchandiseCart(prev => {
      if (quantity === 0) {
        return prev.filter((_, i) => i !== index);
      }

      return prev.map((item, i) =>
        i === index ? { ...item, quantity } : item
      );
    });
  };

  const nextStep = () => {
    // Validate cart has items before leaving tickets step
    if (currentStep === 'tickets' && cartItems.length === 0 && merchandiseCart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add at least one ticket to your cart before continuing",
        variant: "destructive"
      });
      return;
    }

    const stepOrder: CheckoutStep[] = isStripePayment
      ? ['event', 'tickets', 'details']
      : ['event', 'tickets', 'details', 'payment'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const stepOrder: CheckoutStep[] = isStripePayment
      ? ['event', 'tickets', 'details']
      : ['event', 'tickets', 'details', 'payment'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  // Save abandoned cart when user has email and cart items
  const saveAbandonedCart = useCallback(async () => {
    if (!eventData?.id || !eventData?.organization_id) return;
    if (!customerInfo?.email || cartItems.length === 0) return;
    if (abandonedCartSaved.current) return;

    // Check if abandoned cart recovery is enabled for this event
    if (!eventData?.abandoned_cart_enabled) return;

    try {
      const cartItemsData = cartItems.map(item => ({
        ticket_type_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));
      const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Detect device type
      const userAgent = navigator.userAgent.toLowerCase();
      const deviceType = /mobile|android|iphone|ipad/.test(userAgent)
        ? (/ipad|tablet/.test(userAgent) ? 'tablet' : 'mobile')
        : 'desktop';

      const { error } = await supabase
        .from("abandoned_carts")
        .upsert({
          event_id: eventData.id,
          organization_id: eventData.organization_id,
          customer_email: customerInfo.email,
          customer_name: customerInfo.name || null,
          customer_phone: customerInfo.phone || null,
          cart_items: cartItemsData,
          cart_total: cartTotal,
          session_id: sessionId.current,
          source_url: window.location.href,
          device_type: deviceType,
          status: 'pending',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'event_id,customer_email,session_id'
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
  }, [eventData?.id, eventData?.organization_id, eventData?.abandoned_cart_enabled, customerInfo, cartItems]);

  // Save abandoned cart when user enters email with items in cart
  useEffect(() => {
    if (customerInfo?.email && cartItems.length > 0 && !abandonedCartSaved.current) {
      // Debounce the save to avoid too many calls
      const timer = setTimeout(() => {
        saveAbandonedCart();
      }, 2000); // Wait 2 seconds after email entry

      return () => clearTimeout(timer);
    }
  }, [customerInfo?.email, cartItems, saveAbandonedCart]);

  // Track page unload to update abandoned cart
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (customerInfo?.email && cartItems.length > 0 && !abandonedCartSaved.current) {
        // Use sendBeacon for reliability on page unload
        const payload = JSON.stringify({
          event_id: eventData.id,
          customer_email: customerInfo.email,
          session_id: sessionId.current,
        });
        navigator.sendBeacon?.('/api/abandoned-cart-beacon', payload);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [eventData?.id, customerInfo?.email, cartItems]);

  const handleCustomerDetails = (info: CustomerInfo, attendeeData?: AttendeeInfo[]) => {
    setCustomerInfo(info);
    if (attendeeData) {
      setAttendees(attendeeData);
    }

    // Check if this is a Stripe payment provider
    if (eventData.organizations?.payment_provider === 'stripe') {
      // Show Stripe payment modal instead of going to payment step
      setShowStripeModal(true);
    } else {
      // For other payment providers (like Windcave), continue to payment step
      nextStep();
    }
  };

  return (
    <div 
      className="min-h-screen bg-white"
      style={{ 
        fontFamily: theme.fontFamily
      }}
    >
      {/* Logo/Image Hero Section */}
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
                /* Fallback with event icon if no logo */
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                  <Ticket className="h-16 w-16" style={{ color: theme.primaryColor }} />
                </div>
              )}

              {/* Organization Logo (if enabled and different from main logo) */}
              {eventData.widget_customization?.branding?.showOrgLogo &&
               (eventData.organizations as any)?.logo_url &&
               (eventData.organizations as any).logo_url !== (eventData as any).logo_url && (
                <div className="mt-6">
                  <img
                    src={(eventData.organizations as any).logo_url}
                    alt={`${(eventData.organizations as any)?.name || 'Organization'} Logo`}
                    className="h-12 mx-auto object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text Container with Button - Using container width to match main content */}
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6 text-left">
              {/* Event Name */}
              <h1 className="text-3xl md:text-4xl font-bold leading-tight" style={{ color: theme.headerTextColor }}>
                {eventData.name}
              </h1>

            {/* Date with Add to Calendar */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-lg" style={{ color: theme.bodyTextColor }}>
                <Calendar className="h-6 w-6" style={{ color: theme.primaryColor }} />
                <span className="font-medium">
                  {new Date(eventData.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  {(eventData as any).event_time && `, ${(eventData as any).event_time}`}
                </span>
              </div>
              
              {/* Add to Calendar Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="text-sm"
                style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                onClick={() => {
                  // Create calendar event
                  const startDate = new Date(eventData.event_date);
                  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // Default 3 hours
                  
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

                      {/* Venue */}
          {eventData.widget_customization?.layout?.showVenue !== false && ((eventData as any).venue_address || eventData.venue) && (
            <div className="flex items-center gap-3 text-lg" style={{ color: theme.bodyTextColor }}>
              <MapPin className="h-6 w-6" style={{ color: theme.primaryColor }} />
              <div>
                <span className="font-medium">{(eventData as any).venue_address || eventData.venue}</span>
                {' '}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((eventData as any).venue_address || eventData.venue)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  (View on Google Maps)
                </a>
              </div>
            </div>
          )}

                      {/* Host/Organization */}
          {(eventData.organizations as any)?.name && (
            <div className="flex items-center gap-3 text-base" style={{ color: theme.bodyTextColor }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primaryColor }}>
                  <span className="text-xs text-white font-bold">H</span>
                </div>
                <span>Hosted by <span className="font-medium">{(eventData.organizations as any).name}</span></span>
              </div>
            )}

            {/* Custom Header Text */}
            {eventData.widget_customization?.branding?.customHeaderText && (
              <div 
                className="text-lg leading-relaxed"
                style={{ color: theme.bodyTextColor }}
                dangerouslySetInnerHTML={{ __html: eventData.widget_customization.branding.customHeaderText }}
              />
            )}

            
            </div>
            
            {/* Empty space for alignment */}
            <div className="lg:col-span-1"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 min-h-screen">
        {/* Progress Bar with Get Tickets Button */}
        <div className="flex flex-col lg:flex-row gap-8 mb-4">
          <div className="flex-1 lg:w-2/3">
            <div className="flex justify-between mb-3">
              {steps.map((step) => (
                <div
                  key={step.key}
                  className="text-sm font-medium"
                  style={{
                    color: currentStep === step.key 
                      ? theme.headerTextColor
                      : steps.findIndex(s => s.key === currentStep) > steps.findIndex(s => s.key === step.key)
                        ? theme.headerTextColor
                        : theme.headerTextColor + '80' // 50% opacity
                  }}
                >
                  {step.label}
                </div>
              ))}
            </div>
            <Progress 
              value={currentStepData?.progress || 0} 
              className="h-1.5" 
              style={{ 
                '--progress-bg': theme.primaryColor || '#000000'
              } as React.CSSProperties}
            />
          </div>
          
          {/* Get Tickets Button - restored to progress bar area */}
          <div className="lg:w-1/3 flex items-end lg:-translate-y-4 translate-y-0 transition-transform">
            {currentStep === 'event' && (
              <div className="bg-white rounded-lg border p-3 w-full max-w-sm" style={{ borderColor: '#d1d5db' }}>
                <Button
                  onClick={nextStep}
                  size="default"
                  className="font-semibold px-6 py-3 text-base shadow-none hover:shadow-sm transition-all duration-200 w-full border-0 rounded-md"
                  style={{
                    backgroundColor: theme.primaryColor,
                    color: theme.buttonTextColor
                  }}
                >
                  {buttonText}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 lg:w-2/3">
            {/* Step Content */}
            {currentStep === 'event' && (
              <Card style={{ backgroundColor: theme.backgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold" style={{ color: theme.headerTextColor }}>
                    {eventData.widget_customization?.textCustomization?.eventDescriptionTitle || "Event description"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {eventData.widget_customization?.layout?.showDescription !== false && eventData.description && (
                    <div
                      className="prose prose-lg max-w-none"
                      style={{ color: theme.bodyTextColor }}
                      dangerouslySetInnerHTML={{ __html: eventData.description }}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {currentStep === 'tickets' && (
              <div className="space-y-8">
                {/* Combined Tickets & Add-ons Section */}
                <Card style={{ backgroundColor: theme.backgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold" style={{ color: theme.headerTextColor }}>
                      {eventData.widget_customization?.textCustomization?.ticketSelectionTitle || "Select Your Tickets"}
                    </CardTitle>
                    <p style={{ color: theme.bodyTextColor }}>{eventData.widget_customization?.textCustomization?.ticketSelectionSubtitle || "Choose your tickets and any additional items"}</p>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {/* Ticket Selection */}
                    <TicketSelection
                      ticketTypes={ticketTypes}
                      cartItems={cartItems}
                      onAddToCart={addToCart}
                      onNext={() => {}} // We handle navigation manually
                      theme={theme}
                      hideHeader={true}
                      hideContinueButton={true}
                      buttonText={eventData.widget_customization?.branding?.buttonText || "Add to Cart"}
                      groupId={groupId}
                      allocationId={allocationId}
                      showCapacity={eventData.widget_customization?.layout?.showCapacity !== false}
                    />

                    {/* Add-ons Section - Only show if merchandise exists */}
                    <AddOnsSelection
                      eventId={eventData.id}
                      merchandiseCart={merchandiseCart}
                      onMerchandiseCartUpdate={setMerchandiseCart}
                      onNext={nextStep}
                      onBack={prevStep}
                      theme={theme}
                      hasCartItems={cartItems.length > 0 || merchandiseCart.length > 0}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 'details' && (
              <CustomerDetails
                customQuestions={customQuestions}
                onNext={handleCustomerDetails}
                onBack={prevStep}
                theme={theme}
                isStripePayment={isStripePayment}
                eventData={eventData}
                ticketCount={totalAttendees}
                cartItems={cartItems}
              />
            )}

            {currentStep === 'payment' && customerInfo && (
              <Payment
                eventData={eventData}
                cartItems={cartItems}
                merchandiseCart={merchandiseCart}
                customerInfo={customerInfo}
                theme={theme}
              />
            )}
          </div>

          {/* Order Summary Sidebar - Sticky */}
          <div className="lg:w-1/3 lg:sticky lg:top-24 h-fit">
            <OrderSummary
              eventData={eventData}
              cartItems={cartItems}
              merchandiseCart={merchandiseCart}
              currentStep={currentStep}
              customerInfo={customerInfo}
              onUpdateTicketQuantity={updateTicketQuantity}
              onUpdateMerchandiseQuantity={updateMerchandiseQuantity}
              onBack={prevStep}
              theme={theme}
              promoCodeHooks={localPromoCodeHooks}
              reservationHooks={localReservationHooks}
            />
          </div>
        </div>
      </div>

      {/* Stripe Payment Modal */}
      {customerInfo && (
        <StripePaymentModal
          isOpen={showStripeModal}
          onClose={() => setShowStripeModal(false)}
          eventData={eventData}
          cartItems={cartItems}
          merchandiseCart={merchandiseCart}
          customerInfo={customerInfo}
          attendees={attendees}
          theme={theme}
          promoCodeId={localPromoCodeHooks.promoCodeId}
          promoDiscount={localPromoCodeHooks.getTotalDiscount()}
          groupId={groupId}
          allocationId={allocationId}
        />
      )}
    </div>
  );
};