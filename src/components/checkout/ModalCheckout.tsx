import React, { useState, useMemo, useCallback } from "react";
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
import { StripeCardForm } from "@/components/payment/StripeCardForm";
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

interface ModalCheckoutProps {
  eventData: EventData;
  ticketTypes: TicketType[];
  customQuestions: CustomQuestion[];
  paymentProvider: string;
  stripePublishableKey?: string;
  onCreateWindcaveSession?: () => Promise<void>;
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

  // Step configuration
  const steps: { key: ModalStep; label: string; icon: React.ReactNode }[] = useMemo(() => {
    const baseSteps: { key: ModalStep; label: string; icon: React.ReactNode }[] = [
      { key: 'tickets', label: 'Tickets', icon: <Ticket className="h-4 w-4" /> },
    ];

    if (hasMerchandise) {
      baseSteps.push({ key: 'merchandise', label: 'Extras', icon: <ShoppingBag className="h-4 w-4" /> });
    }

    baseSteps.push(
      { key: 'details', label: 'Details', icon: <User className="h-4 w-4" /> },
      { key: 'payment', label: 'Payment', icon: <CreditCard className="h-4 w-4" /> }
    );

    return baseSteps;
  }, [hasMerchandise]);

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

  const canProceedFromTickets = cartItems.length > 0;
  const canProceedFromDetails = customerInfo.name && customerInfo.email && validateCustomQuestions();

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

        {/* Donations */}
        {isDonationsEnabled && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Heart className="h-4 w-4" style={{ color: primaryColor }} />
                {donationTitle}
              </h3>
              {donationDescription && (
                <p className="text-xs text-muted-foreground mt-1">{donationDescription}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {donationSuggestedAmounts.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDonationAmountSelect(amount)}
                  className={selectedDonationAmount === amount && !customDonationAmount ? 'ring-2' : ''}
                  style={{
                    borderColor: selectedDonationAmount === amount && !customDonationAmount ? primaryColor : undefined,
                  }}
                >
                  ${amount}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">$</span>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="Custom amount"
                value={customDonationAmount}
                onChange={(e) => handleCustomDonationChange(e.target.value)}
                className="w-32"
              />
              {selectedDonationAmount && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDonationAmount(null);
                    setCustomDonationAmount('');
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
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
        <div
          ref={dropInRef}
          id="windcave-drop-in"
          className="w-full"
        >
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading payment form...</p>
            </div>
          </div>
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

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: eventTheme.backgroundColor,
        fontFamily: eventTheme.fontFamily,
        color: headerTextColor,
      }}
    >
      {/* Event Landing Page */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Event Header */}
        <div className="text-center mb-8">
          {eventData.widget_customization?.layout?.showEventImage !== false && (
            <div className="mb-6">
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
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: headerTextColor }}>
            {eventData.name}
          </h1>

          {/* Event Details */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-base mb-6" style={{ color: bodyTextColor }}>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" style={{ color: primaryColor }} />
              <span>
                {new Date(eventData.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            {eventData.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" style={{ color: primaryColor }} />
                <span>{eventData.venue}</span>
              </div>
            )}
          </div>

          {/* Get Tickets Button */}
          <Button
            size="lg"
            onClick={openModal}
            className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: primaryColor, color: buttonTextColor }}
          >
            <Ticket className="h-5 w-5 mr-2" />
            Get Tickets
          </Button>

          {/* Price hint */}
          {ticketTypes.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Starting from ${Math.min(...ticketTypes.map(t => t.price)).toFixed(2)}
            </p>
          )}
        </div>

        {/* Event Description */}
        {eventData.widget_customization?.layout?.showDescription !== false && eventData.description && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: headerTextColor }}>
              About This Event
            </h2>
            <div
              className="prose max-w-none"
              style={{ color: bodyTextColor }}
              dangerouslySetInnerHTML={{ __html: eventData.description }}
            />
          </div>
        )}

        {/* Organization Info */}
        {eventData.organizations?.name && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Hosted by</p>
            <div className="flex items-center justify-center gap-3">
              {(eventData.organizations as any)?.logo_url && (
                <img
                  src={(eventData.organizations as any).logo_url}
                  alt={eventData.organizations.name}
                  className="h-10 w-auto object-contain"
                />
              )}
              <span className="font-semibold text-lg">{eventData.organizations.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5" style={{ color: primaryColor }} />
              <span className="font-semibold">{eventData.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={closeModal} className="h-8 w-8 p-0">
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
                    {ticketCount} ticket{ticketCount !== 1 ? 's' : ''} • ${getTotalAmount().toFixed(2)}
                  </span>
                )}

                <Button
                  onClick={goToNextStep}
                  disabled={!canProceed()}
                  className="flex items-center gap-2"
                  style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                >
                  {currentStep === 'details' ? 'Continue to Payment' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
