import React, { useState, useMemo, useCallback, useEffect } from "react";
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
  ArrowRight,
  X,
  Check,
  ShoppingBag,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCheckoutEngine } from "@/hooks/useCheckoutEngine";
import { PromoCodeInput } from "@/components/checkout/PromoCodeInput";
import { MerchandiseCartItem, TicketType, EventData, CustomQuestion, WindcaveLink } from "@/types/widget";
import { StripePaymentForm } from "@/components/payment/StripePaymentForm";
import MerchandiseSelector from "@/components/MerchandiseSelector";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import { Theme } from "@/types/theme";

type ModalStep = 'tickets' | 'merchandise' | 'details' | 'payment';

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

interface WindcaveSessionParams {
  cart: Array<{ id: string; name: string; price: number; quantity: number }>;
  merchandiseCart: MerchandiseCartItem[];
  customerInfo: { name: string; email: string; phone: string };
  customAnswers: Record<string, any>;
  donationAmount?: number;
}

interface FreeRegistrationParams {
  cart: Array<{ id: string; name: string; price: number; quantity: number }>;
  customerInfo: { name: string; email: string; phone: string };
  customAnswers: Record<string, any>;
  platformTip?: number;
}

interface ModalCheckoutProps {
  eventData: EventData;
  ticketTypes: TicketType[];
  customQuestions: CustomQuestion[];
  paymentProvider: string;
  stripePublishableKey?: string;
  onCreateWindcaveSession?: (params: WindcaveSessionParams) => Promise<void>;
  onFreeRegistration?: (params: FreeRegistrationParams) => Promise<void>;
  windcaveReady?: boolean;
  showWindcavePaymentForm?: boolean;
  onBackToTickets?: () => void;
  dropInRef?: React.RefObject<HTMLDivElement>;
  promoCodeHooks?: PromoCodeHooks;
  reservationHooks?: ReservationHooks;
  groupId?: string | null;
  allocationId?: string | null;
  onPaymentSuccess?: (orderId: string) => Promise<void>;
  getAvailableQuantity?: (ticketType: TicketType) => number;
}

export const ModalCheckout: React.FC<ModalCheckoutProps> = ({
  eventData,
  ticketTypes,
  customQuestions,
  paymentProvider,
  stripePublishableKey,
  onCreateWindcaveSession,
  onFreeRegistration,
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
  const promoHooks = promoCodeHooks;

  // Modal and step state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ModalStep>('tickets');
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const [windcaveInitialized, setWindcaveInitialized] = useState(false);
  const [isInitializingWindcave, setIsInitializingWindcave] = useState(false);
  const [isSubmittingFreeRegistration, setIsSubmittingFreeRegistration] = useState(false);
  const [freeRegistrationComplete, setFreeRegistrationComplete] = useState(false);

  // Platform tip state for free events
  const [platformTipAmount, setPlatformTipAmount] = useState<number | null>(null);
  const [customTipAmount, setCustomTipAmount] = useState<string>('');
  const platformTipOptions = [0, 1, 2, 5];

  // Computed values
  const eventTheme: Theme = useMemo(() => theme, [theme]);
  const platformStripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

  // Check if merchandise is available
  const [hasMerchandise, setHasMerchandise] = useState(false);

  // Donation configuration
  const crmEnabled = eventData?.organizations?.crm_enabled ?? (eventData as any)?.crm_enabled;
  const isDonationsEnabled = eventData?.donations_enabled && crmEnabled;
  const donationSuggestedAmounts = (eventData?.donation_suggested_amounts || [5, 10, 25, 50, 100]).map(amount =>
    typeof amount === 'string' ? parseFloat(amount) : amount
  );
  const donationTitle = eventData?.donation_title || 'Support Our Cause';
  const donationDescription = eventData?.donation_description;

  // Theme colors
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

  // Initialize Windcave when reaching payment step
  useEffect(() => {
    const initializeWindcave = async () => {
      if (
        currentStep === 'payment' &&
        paymentProvider === 'windcave' &&
        !windcaveInitialized &&
        !isInitializingWindcave &&
        onCreateWindcaveSession &&
        cartItems.length > 0
      ) {
        console.log('🔄 ModalCheckout: Initializing Windcave session...');
        console.log('🔄 Cart items:', cartItems);
        console.log('🔄 Customer info:', customerInfo);
        console.log('🔄 Custom answers:', customAnswers);
        setIsInitializingWindcave(true);
        try {
          await onCreateWindcaveSession({
            cart: cartItems,
            merchandiseCart,
            customerInfo,
            customAnswers,
            donationAmount: selectedDonationAmount || undefined
          });
          setWindcaveInitialized(true);
          console.log('✅ ModalCheckout: Windcave session created');
        } catch (error) {
          console.error('❌ ModalCheckout: Failed to create Windcave session:', error);
        } finally {
          setIsInitializingWindcave(false);
        }
      }
    };

    initializeWindcave();
  }, [currentStep, paymentProvider, windcaveInitialized, isInitializingWindcave, onCreateWindcaveSession, cartItems, merchandiseCart, customerInfo, customAnswers, selectedDonationAmount]);

  // Reset Windcave state when modal closes or step changes away from payment
  useEffect(() => {
    if (currentStep !== 'payment' || !isModalOpen) {
      setWindcaveInitialized(false);
    }
  }, [currentStep, isModalOpen]);

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

  // Check if this is a free event
  const isFreeEvent = eventData?.pricing_type === 'free';

  // Step configuration - free events skip payment step
  const steps: { key: ModalStep; label: string; icon: React.ReactNode }[] = useMemo(() => {
    const baseSteps: { key: ModalStep; label: string; icon: React.ReactNode }[] = [
      { key: 'tickets', label: isFreeEvent ? 'RSVP' : 'Tickets', icon: <Ticket className="h-4 w-4" /> },
    ];

    if (hasMerchandise && !isFreeEvent) {
      baseSteps.push({ key: 'merchandise', label: 'Extras', icon: <ShoppingBag className="h-4 w-4" /> });
    }

    baseSteps.push(
      { key: 'details', label: 'Details', icon: <User className="h-4 w-4" /> }
    );

    // Only add payment step for paid events
    if (!isFreeEvent) {
      baseSteps.push({ key: 'payment', label: 'Payment', icon: <CreditCard className="h-4 w-4" /> });
    }

    return baseSteps;
  }, [hasMerchandise, isFreeEvent]);

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  // Handlers
  const handleAddToCart = (ticketType: TicketType) => {
    addToCart(ticketType);
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

  const openModal = () => {
    setIsModalOpen(true);
    setCurrentStep('tickets');
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Validate custom questions (only call on form submission, not during render)
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

  // Check if required custom questions are answered (without setting state)
  const areCustomQuestionsValid = useMemo(() => {
    return customQuestions.every((q) => !q.required || customAnswers[q.id]);
  }, [customQuestions, customAnswers]);

  const canProceedFromTickets = cartItems.length > 0;
  const canProceedFromDetails = customerInfo.name && customerInfo.email && areCustomQuestionsValid;

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      // Track checkout start when moving to payment
      if (steps[nextIndex].key === 'payment' && eventData) {
        trackBeginCheckout(eventData.id, eventData.name, getTotalAmount(), eventData.organizations?.currency || 'USD');
      }
      setCurrentStep(steps[nextIndex].key);
    }
  };

  // Get the effective tip amount
  const getEffectiveTipAmount = (): number => {
    if (platformTipAmount !== null) return platformTipAmount;
    const customAmount = parseFloat(customTipAmount);
    return !isNaN(customAmount) && customAmount > 0 ? customAmount : 0;
  };

  // Handle tip selection
  const handleTipSelect = (amount: number) => {
    setPlatformTipAmount(amount);
    setCustomTipAmount('');
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTipAmount(value);
    setPlatformTipAmount(null);
  };

  // Handle free event registration (no payment required)
  const handleFreeRegistration = async () => {
    if (!onFreeRegistration || !canProceedFromDetails) return;

    // Validate custom questions first
    if (!validateCustomQuestions()) return;

    const tipAmount = getEffectiveTipAmount();

    setIsSubmittingFreeRegistration(true);
    try {
      await onFreeRegistration({
        cart: cartItems,
        customerInfo,
        customAnswers,
        platformTip: tipAmount > 0 ? tipAmount : undefined,
      });
      setFreeRegistrationComplete(true);
      // Track successful registration
      if (eventData) {
        trackPurchase(eventData.id, eventData.name, tipAmount, eventData.organizations?.currency || 'USD', 'free_registration');
      }
    } catch (error) {
      console.error('Free registration failed:', error);
    } finally {
      setIsSubmittingFreeRegistration(false);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;

        return (
          <React.Fragment key={step.key}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isCompleted
                  ? 'bg-green-100 text-green-700'
                  : 'bg-muted text-muted-foreground'
              }`}
              style={isActive ? { backgroundColor: primaryColor, color: buttonTextColor } : undefined}
            >
              {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${index < currentStepIndex ? 'bg-green-500' : 'bg-muted'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Render order summary (sidebar in modal)
  const renderOrderSummary = () => (
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        Order Summary
      </h3>

      {cartItems.length === 0 && merchandiseCart.length === 0 ? (
        <p className="text-sm text-muted-foreground">Your cart is empty</p>
      ) : (
        <>
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.name} × {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          {merchandiseCart.map((item, index) => (
            <div key={`merch-${index}`} className="flex justify-between text-sm">
              <span>{item.merchandise.name} × {item.quantity}</span>
              <span>${(item.merchandise.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          {getTotalDiscount() > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Discount</span>
              <span>-${getTotalDiscount().toFixed(2)}</span>
            </div>
          )}

          {selectedDonationAmount && selectedDonationAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>Donation</span>
              <span>${selectedDonationAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>${getTotalAmount().toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  );

  // Render tickets step
  const renderTicketsStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: headerTextColor }}>
          Select Your Tickets
        </h2>
        <p className="text-sm text-muted-foreground">Choose the tickets you'd like to purchase</p>
      </div>

      {ticketTypes.length === 0 ? (
        <div className="text-center py-8">
          <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No tickets available</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
          {ticketTypes.map((ticketType) => {
            const availableQty = getAvailableQuantity(ticketType);
            const cartItem = cartItems.find(item => item.id === ticketType.id);

            return (
              <div
                key={ticketType.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                style={{ borderColor: eventTheme.borderColor }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{ticketType.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium" style={{ color: primaryColor }}>${ticketType.price}</span>
                      <span>•</span>
                      <span>{availableQty} available</span>
                    </div>
                    {ticketType.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticketType.description}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {cartItem ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(ticketType.id, cartItem.quantity - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(ticketType.id, cartItem.quantity + 1)}
                          className="h-8 w-8 p-0"
                          disabled={cartItem.quantity >= availableQty}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleAddToCart(ticketType)}
                        size="sm"
                        disabled={availableQty <= 0}
                        style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                      >
                        {availableQty <= 0 ? "Sold Out" : "Add"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Promo Code */}
      {promoHooks && cartItems.length > 0 && (
        <div className="border-t pt-4">
          <PromoCodeInput
            promoCode={promoHooks.promoCode}
            setPromoCode={promoHooks.setPromoCode}
            promoDiscount={promoHooks.promoDiscount}
            promoError={promoHooks.promoError}
            isValidating={promoHooks.isValidating}
            onApply={promoHooks.applyPromoCode}
            onClear={promoHooks.clearPromoCode}
          />
        </div>
      )}
    </div>
  );

  // Render merchandise step
  const renderMerchandiseStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: headerTextColor }}>
          Add Some Extras
        </h2>
        <p className="text-sm text-muted-foreground">Optional merchandise and add-ons</p>
      </div>

      <div className="max-h-[50vh] overflow-y-auto">
        <MerchandiseSelector
          eventId={eventData.id}
          onCartUpdate={(cart) => {
            setMerchandiseCart(cart);
            if (cart.length > 0 || merchandiseCart.length > 0) {
              setHasMerchandise(true);
            }
          }}
          theme={eventTheme}
          compact
        />
      </div>
    </div>
  );

  // Render details step
  const renderDetailsStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: headerTextColor }}>
          Your Information
        </h2>
        <p className="text-sm text-muted-foreground">We'll use this to send your tickets</p>
      </div>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
        {/* Customer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              placeholder="John Doe"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john@example.com"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
              className="mt-1"
            />
          </div>
        </div>

        {/* Custom Questions */}
        {customQuestions.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-sm">Additional Information</h3>
            {customQuestions.map((q: CustomQuestion) => (
              <div key={q.id} className="space-y-1">
                <Label>
                  {q.label} {q.required && <span className="text-destructive">*</span>}
                </Label>
                {q.type === 'text' && (
                  <Input
                    value={customAnswers[q.id] || ''}
                    onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    placeholder={q.label}
                  />
                )}
                {q.type === 'textarea' && (
                  <textarea
                    className="w-full border rounded p-2 text-sm"
                    value={customAnswers[q.id] || ''}
                    onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    placeholder={q.label}
                    rows={3}
                  />
                )}
                {(q.type === 'select' || q.type === 'radio') && (
                  <Select
                    value={customAnswers[q.id] || ''}
                    onValueChange={(value) => setCustomAnswers(a => ({ ...a, [q.id]: value }))}
                  >
                    <SelectTrigger>
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
                      <label key={idx} className="flex items-center gap-2 text-sm">
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
                {customErrors[q.id] && (
                  <p className="text-xs text-destructive">{customErrors[q.id]}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Platform Tip for Free Events */}
        {isFreeEvent && (
          <Card className="border overflow-hidden" style={{ borderColor: '#e0e0e0' }}>
            <CardHeader className="pb-3" style={{ backgroundColor: '#f9f9f9' }}>
              <CardTitle className="flex items-center gap-2 text-base font-bold" style={{ color: headerTextColor }}>
                <Heart className="h-5 w-5 text-pink-500" />
                Support TicketFlo
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Love free ticketing? Leave a tip to help us keep the lights on!
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Tip Amount Options */}
              <div className="grid grid-cols-4 gap-2">
                {platformTipOptions.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTipSelect(amount)}
                    className={`transition-all ${platformTipAmount === amount && !customTipAmount ? 'ring-2 ring-offset-1 ring-pink-500' : ''}`}
                    style={{
                      borderColor: platformTipAmount === amount && !customTipAmount ? '#ec4899' : undefined,
                      backgroundColor: platformTipAmount === amount && !customTipAmount ? '#fdf2f8' : undefined,
                    }}
                  >
                    {amount === 0 ? 'No tip' : `$${amount}`}
                  </Button>
                ))}
              </div>

              {/* Custom Tip Amount */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Or enter custom:</span>
                <div className="relative flex-1 max-w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.50"
                    placeholder="0.00"
                    value={customTipAmount}
                    onChange={(e) => handleCustomTipChange(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              {/* Selected tip feedback */}
              {getEffectiveTipAmount() > 0 && (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium bg-pink-50 text-pink-700"
                >
                  <Heart className="h-4 w-4 fill-current" />
                  Thank you! Your ${getEffectiveTipAmount().toFixed(2)} tip helps keep TicketFlo free.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Donations */}
        {isDonationsEnabled && (
          <Card className="border-2 overflow-hidden" style={{ borderColor: `${primaryColor}30` }}>
            <CardHeader className="pb-3" style={{ backgroundColor: `${primaryColor}08` }}>
              <CardTitle className="flex items-center gap-2 text-base font-bold" style={{ color: headerTextColor }}>
                <Heart className="h-5 w-5" style={{ color: primaryColor }} />
                {donationTitle}
              </CardTitle>
              {donationDescription && (
                <p className="text-sm text-muted-foreground mt-1">{donationDescription}</p>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Suggested Amounts */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {donationSuggestedAmounts.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDonationAmountSelect(amount)}
                    className={`transition-all ${selectedDonationAmount === amount && !customDonationAmount ? 'ring-2 ring-offset-1' : ''}`}
                    style={{
                      borderColor: selectedDonationAmount === amount && !customDonationAmount ? primaryColor : undefined,
                      backgroundColor: selectedDonationAmount === amount && !customDonationAmount ? `${primaryColor}10` : undefined,
                    }}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Or enter custom:</span>
                <div className="relative flex-1 max-w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={customDonationAmount}
                    onChange={(e) => handleCustomDonationChange(e.target.value)}
                    className="pl-7"
                  />
                </div>
                {selectedDonationAmount && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDonationAmount(null);
                      setCustomDonationAmount('');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Selected amount feedback */}
              {selectedDonationAmount && selectedDonationAmount > 0 && (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
                >
                  <Heart className="h-4 w-4 fill-current" />
                  Thank you for adding a ${selectedDonationAmount.toFixed(2)} donation!
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  // Render payment step
  const renderPaymentStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: headerTextColor }}>
          Complete Payment
        </h2>
        <p className="text-sm text-muted-foreground">Secure payment processing</p>
      </div>

      {/* Final Order Summary */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
        {cartItems.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.name} × {item.quantity}</span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        {merchandiseCart.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span>{item.merchandise.name} × {item.quantity}</span>
            <span>${(item.merchandise.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        {getTotalDiscount() > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>-${getTotalDiscount().toFixed(2)}</span>
          </div>
        )}
        {selectedDonationAmount && selectedDonationAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Donation</span>
            <span>${selectedDonationAmount.toFixed(2)}</span>
          </div>
        )}
        {bookingFeeEnabled && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Booking Fee</span>
            <span>${((subtotal * 0.01) + 0.50).toFixed(2)}</span>
          </div>
        )}
        <div className="border-t pt-2 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span style={{ color: primaryColor }}>${getTotalAmount().toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Form */}
      {paymentProvider === "stripe" && platformStripeKey && (
        <StripePaymentForm
          publishableKey={platformStripeKey}
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
          onCancel={() => goToPrevStep()}
          onSuccess={async (orderId: string) => {
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
            closeModal();
          }}
        />
      )}

      {/* Windcave Payment */}
      {paymentProvider === "windcave" && (
        <div className="w-full">
          {/* Loading state while initializing Windcave */}
          {(isInitializingWindcave || (!showWindcavePaymentForm && !windcaveInitialized)) && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" style={{ borderColor: primaryColor }}></div>
                <p className="text-sm text-muted-foreground">Loading payment form...</p>
              </div>
            </div>
          )}
          {/* Windcave Drop-In container - this is where the form gets mounted */}
          <div
            ref={dropInRef}
            id="windcave-drop-in"
            className="w-full min-h-[200px]"
            style={{ display: showWindcavePaymentForm ? 'block' : 'none' }}
          />
        </div>
      )}
    </div>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'tickets':
        return renderTicketsStep();
      case 'merchandise':
        return renderMerchandiseStep();
      case 'details':
        return renderDetailsStep();
      case 'payment':
        return renderPaymentStep();
      default:
        return null;
    }
  };

  // Can proceed to next step?
  const canProceed = () => {
    switch (currentStep) {
      case 'tickets':
        return canProceedFromTickets;
      case 'merchandise':
        return true; // Always can skip merchandise
      case 'details':
        return customerInfo.name && customerInfo.email;
      case 'payment':
        return false; // Payment handles its own submission
      default:
        return false;
    }
  };

  // Format date nicely like Eventbrite
  const formatEventDate = () => {
    const date = new Date(eventData.event_date);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Get price range text
  const getPriceRange = () => {
    if (ticketTypes.length === 0) return null;
    const prices = ticketTypes.map(t => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) {
      return min === 0 ? 'Free' : `$${min.toFixed(2)}`;
    }
    return min === 0 ? `Free – $${max.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#f8f7fa',
        fontFamily: eventTheme.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Hero Image - Full Width */}
      {eventData.widget_customization?.layout?.showEventImage !== false && (eventData as any).logo_url && (
        <div className="w-full bg-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="aspect-[2/1] md:aspect-[2.5/1] overflow-hidden">
              <img
                src={(eventData as any).logo_url}
                alt={eventData.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Title & Date */}
            <div>
              <p className="text-base font-semibold mb-2" style={{ color: primaryColor }}>
                {formatEventDate()}
                {(eventData as any).event_time && ` · ${(eventData as any).event_time}`}
              </p>
              <h1
                className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight"
                style={{ color: '#1e0a3c' }}
              >
                {eventData.name}
              </h1>
            </div>

            {/* Event Description Card */}
            {eventData.widget_customization?.layout?.showDescription !== false && eventData.description && (
              <div
                className="bg-white rounded-xl p-6 shadow-sm"
                style={{ border: '1px solid #eeedf2' }}
              >
                <h2 className="text-xl font-bold mb-4" style={{ color: '#1e0a3c' }}>
                  About this event
                </h2>
                <div
                  className="prose prose-gray max-w-none text-base leading-relaxed [&>p]:mb-4 [&>ul]:mb-4 [&>ol]:mb-4"
                  style={{ color: '#39364f' }}
                  dangerouslySetInnerHTML={{ __html: eventData.description }}
                />
              </div>
            )}

            {/* Date and Time Card */}
            <div
              className="bg-white rounded-xl p-6 shadow-sm"
              style={{ border: '1px solid #eeedf2' }}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: '#1e0a3c' }}>
                Date and time
              </h2>
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${primaryColor}10` }}
                >
                  <Calendar className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="font-semibold text-base" style={{ color: '#1e0a3c' }}>
                    {formatEventDate()}
                  </p>
                  {(eventData as any).event_time && (
                    <p className="text-sm mt-1" style={{ color: '#6f7287' }}>
                      {(eventData as any).event_time}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Location Card with Map */}
            {eventData.venue && (
              <div
                className="bg-white rounded-xl shadow-sm overflow-hidden"
                style={{ border: '1px solid #eeedf2' }}
              >
                {/* Google Maps Embed */}
                <div className="w-full h-48 bg-gray-100">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(eventData.venue + ((eventData as any).address ? ', ' + (eventData as any).address : ''))}`}
                  />
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: '#1e0a3c' }}>
                    Location
                  </h2>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primaryColor}10` }}
                    >
                      <MapPin className="h-6 w-6" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="font-semibold text-base" style={{ color: '#1e0a3c' }}>
                        {eventData.venue}
                      </p>
                      {(eventData as any).address && (
                        <p className="text-sm mt-1" style={{ color: '#6f7287' }}>
                          {(eventData as any).address}
                        </p>
                      )}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventData.venue + ((eventData as any).address ? ', ' + (eventData as any).address : ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium mt-2 inline-block hover:underline"
                        style={{ color: primaryColor }}
                      >
                        View on Google Maps
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Organizer Card */}
            {eventData.organizations?.name && (
              <div
                className="bg-white rounded-xl p-6 shadow-sm"
                style={{ border: '1px solid #eeedf2' }}
              >
                <h2 className="text-xl font-bold mb-4" style={{ color: '#1e0a3c' }}>
                  Organised by
                </h2>
                <div className="flex items-center gap-4">
                  {(eventData.organizations as any)?.logo_url ? (
                    <img
                      src={(eventData.organizations as any).logo_url}
                      alt={eventData.organizations.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {eventData.organizations.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-base" style={{ color: '#1e0a3c' }}>
                      {eventData.organizations.name}
                    </p>
                    <p className="text-sm" style={{ color: '#6f7287' }}>
                      Event organiser
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sticky Ticket Card */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <div
                className="bg-white rounded-xl shadow-lg overflow-hidden"
                style={{ border: '1px solid #eeedf2' }}
              >
                {/* Price Display */}
                <div className="p-6 border-b" style={{ borderColor: '#eeedf2' }}>
                  <p className="text-2xl font-bold mb-1" style={{ color: '#1e0a3c' }}>
                    {ticketTypes.length > 0 ? (
                      ticketTypes.length === 1 ? (
                        ticketTypes[0].price === 0 ? 'Free' : `$${ticketTypes[0].price.toFixed(2)}`
                      ) : (
                        (() => {
                          const prices = ticketTypes.map(t => t.price);
                          const min = Math.min(...prices);
                          const max = Math.max(...prices);
                          if (min === max) {
                            return min === 0 ? 'Free' : `$${min.toFixed(2)}`;
                          }
                          return min === 0 ? `Free – $${max.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
                        })()
                      )
                    ) : (
                      'Tickets'
                    )}
                  </p>
                  {ticketTypes.length > 1 && (
                    <p className="text-sm" style={{ color: '#6f7287' }}>
                      {ticketTypes.length} ticket types available
                    </p>
                  )}
                  {ticketTypes.length === 1 && (
                    <p className="text-sm" style={{ color: '#6f7287' }}>
                      {ticketTypes[0].name}
                    </p>
                  )}
                </div>

                {/* Ticket Preview */}
                <div className="p-4 border-b space-y-3" style={{ borderColor: '#eeedf2' }}>
                  {ticketTypes.slice(0, 3).map((ticket) => {
                    const available = getAvailableQuantity(ticket);
                    return (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg"
                        style={{ backgroundColor: '#f8f7fa' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: '#1e0a3c' }}>
                            {ticket.name}
                          </p>
                          {available <= 10 && available > 0 && (
                            <p className="text-xs text-orange-600 font-medium">
                              Only {available} left
                            </p>
                          )}
                          {available === 0 && (
                            <p className="text-xs text-red-600 font-medium">Sold out</p>
                          )}
                        </div>
                        <p className="font-semibold text-sm ml-3" style={{ color: '#1e0a3c' }}>
                          {ticket.price === 0 ? 'Free' : `$${ticket.price.toFixed(2)}`}
                        </p>
                      </div>
                    );
                  })}
                  {ticketTypes.length > 3 && (
                    <p className="text-xs text-center pt-1" style={{ color: '#6f7287' }}>
                      +{ticketTypes.length - 3} more options
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <div className="p-4">
                  <Button
                    size="lg"
                    onClick={openModal}
                    className="w-full text-base font-semibold py-6 rounded-lg transition-all hover:opacity-90"
                    style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                  >
                    Get tickets
                  </Button>
                </div>

                {/* Trust Badge */}
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#6f7287' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Secure checkout</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40" style={{ borderColor: '#eeedf2' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            {getPriceRange() && (
              <p className="font-bold text-lg" style={{ color: '#1e0a3c' }}>
                {getPriceRange()}
              </p>
            )}
          </div>
          <Button
            size="lg"
            onClick={openModal}
            className="px-8 font-semibold rounded-lg"
            style={{ backgroundColor: primaryColor, color: buttonTextColor }}
          >
            Get tickets
          </Button>
        </div>
      </div>

      {/* Add padding at bottom for mobile sticky footer */}
      <div className="lg:hidden h-24" />

      {/* Checkout Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5" style={{ color: primaryColor }} />
              <span className="font-semibold">{eventData.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={closeModal} className="h-8 w-8 p-0 rounded-full hover:bg-gray-100">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Step Indicator */}
          <div className="px-4 pt-4">
            {renderStepIndicator()}
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {renderStepContent()}
          </div>

          {/* Navigation Footer */}
          {currentStep !== 'payment' && (
            <div className="border-t p-4 flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={currentStepIndex === 0 ? closeModal : goToPrevStep}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {currentStepIndex === 0 ? 'Close' : 'Back'}
              </Button>

              <div className="flex items-center gap-4">
                {cartItems.length > 0 && (
                  <span className="text-sm font-medium">
                    {ticketCount} {isFreeEvent ? 'spot' : 'ticket'}{ticketCount !== 1 ? 's' : ''}
                    {!isFreeEvent && ` • $${getTotalAmount().toFixed(2)}`}
                    {isFreeEvent && ' • Free'}
                  </span>
                )}

                {/* For free events on details step, show Register button */}
                {isFreeEvent && currentStep === 'details' ? (
                  <Button
                    onClick={handleFreeRegistration}
                    disabled={!canProceed() || isSubmittingFreeRegistration}
                    className="flex items-center gap-2"
                    style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                  >
                    {isSubmittingFreeRegistration ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        Registering...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <Check className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={goToNextStep}
                    disabled={!canProceed()}
                    className="flex items-center gap-2"
                    style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                  >
                    {currentStep === 'details' ? 'Continue to Payment' : 'Continue'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
