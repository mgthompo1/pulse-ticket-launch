import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, X } from 'lucide-react';
import { CartItem, MerchandiseCartItem, EventData, CustomerInfo } from '@/types/widget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { StripePaymentForm } from '@/components/payment/StripePaymentForm';
import { Theme } from '@/types/theme';
import { AttendeeInfo } from './AttendeeDetailsForm';
import { useTaxCalculation, formatTaxForOrder } from '@/hooks/useTaxCalculation';
import { getStripePublishableKey, isStripeTestModeForOrg } from '@/lib/stripe-config';
import { PaymentPlanSelector } from './PaymentPlanSelector';

interface PaymentPlan {
  id: string;
  name: string;
  plan_type: 'deposit' | 'installment';
  deposit_percentage: number | null;
  number_of_installments: number | null;
  payment_plan_fee_percentage: number;
  payment_plan_fee_fixed: number;
}

interface PaymentScheduleItem {
  installment_number: number;
  amount: number;
  due_date: Date;
  label: string;
}

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventData: EventData;
  cartItems: CartItem[];
  merchandiseCart: MerchandiseCartItem[];
  customerInfo: CustomerInfo;
  attendees?: AttendeeInfo[];
  theme: Theme;
  promoCodeId?: string | null;
  promoDiscount?: number;
  groupId?: string | null;
  allocationId?: string | null;
  // Payment plan props
  showPaymentPlans?: boolean;
  selectedPaymentPlan?: PaymentPlan | null;
  paymentSchedule?: PaymentScheduleItem[] | null;
  onPaymentPlanSelected?: (plan: PaymentPlan | null, schedule: PaymentScheduleItem[] | null) => void;
  isSignedIn?: boolean;
}

export const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  isOpen,
  onClose,
  eventData,
  cartItems,
  merchandiseCart,
  customerInfo,
  attendees = [],
  theme,
  promoCodeId = null,
  promoDiscount = 0,
  groupId = null,
  allocationId = null,
  showPaymentPlans = false,
  selectedPaymentPlan = null,
  paymentSchedule = null,
  onPaymentPlanSelected,
  isSignedIn = false
}) => {
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate totals
  const calculateTotal = (): number => {
    const ticketSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const merchandiseSubtotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
    return ticketSubtotal + merchandiseSubtotal;
  };

  const subtotal = calculateTotal();

  // Get booking fees setting from eventData
  const bookingFeesEnabled = eventData.organizations?.stripe_booking_fee_enabled || false;

  // Calculate booking fee (1% + $0.50) when enabled for Stripe
  const bookingFee = bookingFeesEnabled && eventData.organizations?.payment_provider === 'stripe'
    ? (subtotal * 0.01) + 0.50
    : 0;

  // Processing fee can be applied alongside booking fees
  const processingFee = eventData.organizations?.credit_card_processing_fee_percentage
    ? subtotal * (eventData.organizations.credit_card_processing_fee_percentage / 100)
    : 0;

  // Add donation amount if present
  const donationAmount = customerInfo?.donationAmount || 0;

  // Calculate subtotals
  const ticketSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const merchandiseSubtotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);

  // Apply discount proportionally to tickets and merchandise BEFORE tax calculation
  let discountedTicketAmount = ticketSubtotal;
  let discountedMerchandiseAmount = merchandiseSubtotal;

  if (promoDiscount > 0 && subtotal > 0) {
    const discountRatio = 1 - (promoDiscount / subtotal);
    discountedTicketAmount = ticketSubtotal * discountRatio;
    discountedMerchandiseAmount = merchandiseSubtotal * discountRatio;
  }

  // Calculate tax using DISCOUNTED amounts
  const { taxBreakdown, taxCalculator, taxEnabled, taxName, taxRate, taxInclusive } = useTaxCalculation({
    eventId: eventData.id,
    ticketAmount: discountedTicketAmount,
    addonAmount: discountedMerchandiseAmount,
    donationAmount: donationAmount,
    bookingFeePercent: bookingFeesEnabled ? 1.0 : 0,
    enabled: true,
  });

  // Apply tax to processing fee if tax is enabled
  const processingFeeWithTax = taxCalculator?.config?.enabled
    ? processingFee * (1 + (taxCalculator.config.rate / 100))
    : processingFee;

  // Use tax-aware total if tax is enabled, otherwise fall back to old calculation
  // Note: taxBreakdown.grandTotal already includes tickets, addons, donations, 1% booking fee, and all taxes
  // We only need to add: processing fee (with tax) and the $0.50 flat booking fee
  const flatBookingFee = bookingFeesEnabled && eventData.organizations?.payment_provider === 'stripe' ? 0.50 : 0;
  const total = taxBreakdown
    ? taxBreakdown.grandTotal + processingFeeWithTax + flatBookingFee
    : Math.max(0, subtotal - promoDiscount + processingFee + bookingFee + donationAmount);

  // Format tax data for edge function
  const taxData = taxBreakdown && taxCalculator ? formatTaxForOrder(taxBreakdown, taxCalculator) : null;

  // Load Stripe configuration when modal opens
  useEffect(() => {
    const loadStripeConfig = async () => {
      if (isOpen && !stripePublishableKey) {
        setIsLoading(true);

        try {
          // With Stripe Connect, use the platform publishable key (supports test/live mode toggle)
          // Pass organization to check stripe_test_mode setting from database
          const platformKey = getStripePublishableKey(eventData.organizations);
          const configCurrency = eventData.organizations?.currency || 'USD';

          if (platformKey) {
            const isTestMode = isStripeTestModeForOrg(eventData.organizations);
            const modeLabel = isTestMode ? 'TEST' : 'LIVE';
            console.log(`✅ Using platform Stripe ${modeLabel} publishable key for Connect`);
            console.log(`   Organization test mode: ${eventData.organizations?.stripe_test_mode}`);
            setStripePublishableKey(platformKey);
            setCurrency(configCurrency);
          } else {
            console.error('❌ Platform Stripe publishable key not configured in environment');
            toast({
              title: "Payment Error",
              description: "Payment system not configured",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error initializing Stripe:', error);
          toast({
            title: "Payment Error",
            description: "Failed to initialize payment system",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadStripeConfig();
  }, [isOpen, eventData.id, stripePublishableKey, currency]);

  console.log('🎯 StripePaymentModal props:', { groupId, allocationId, promoCodeId });

  const handlePaymentSuccess = (orderId: string) => {
    toast({
      title: "Payment Successful!",
      description: "Your tickets have been confirmed. Check your email for details.",
    });

    // Close modal and redirect to success page with orderId
    onClose();
    setTimeout(() => {
      window.location.href = `/payment-success?orderId=${orderId}`;
    }, 1500);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{ color: theme.headerTextColor }}>
            Complete Your Purchase
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto flex-1 min-h-0">
          {/* Payment Form */}
          <div className="space-y-6">
            {/* Payment Plan Selector - Show when enabled and user is signed in */}
            {showPaymentPlans && onPaymentPlanSelected && (
              <PaymentPlanSelector
                eventId={eventData.id}
                organizationId={eventData.organization_id}
                orderTotal={subtotal}
                eventDate={eventData.event_date}
                theme={theme}
                isSignedIn={isSignedIn}
                onPlanSelected={onPaymentPlanSelected}
                selectedPlanId={selectedPaymentPlan?.id}
                groupId={groupId}
                allocationId={allocationId}
              />
            )}

            <Card style={{ backgroundColor: theme.cardBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: theme.headerTextColor }}>
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2" style={{ color: theme.bodyTextColor }}>Loading payment form...</span>
                  </div>
                ) : stripePublishableKey ? (
                  <StripePaymentForm
                    publishableKey={stripePublishableKey}
                    eventId={eventData.id}
                    cart={cartItems}
                    merchandiseCart={merchandiseCart}
                    customerInfo={customerInfo}
                    attendees={attendees}
                    total={selectedPaymentPlan && paymentSchedule ? paymentSchedule[0]?.amount || total : total}
                    theme={theme}
                    bookingFeesEnabled={bookingFeesEnabled}
                    subtotal={subtotal}
                    bookingFee={bookingFee}
                    currency={currency}
                    promoCodeId={promoCodeId}
                    promoDiscount={promoDiscount}
                    taxData={taxData}
                    groupId={groupId}
                    allocationId={allocationId}
                    paymentPlan={selectedPaymentPlan}
                    paymentSchedule={paymentSchedule}
                    onSuccess={handlePaymentSuccess}
                    onCancel={onClose}
                  />
                ) : (
                  <div className="text-center py-8" style={{ color: theme.bodyTextColor }}>
                    <p>Payment system is not available at the moment.</p>
                    <p className="text-sm mt-2">Please try again later or contact support.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card style={{ backgroundColor: theme.cardBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
              <CardHeader>
                <CardTitle style={{ color: theme.headerTextColor }}>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Event Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold" style={{ color: theme.headerTextColor }}>{eventData.name}</h3>
                  <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                    {new Date(eventData.event_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {eventData.venue && (
                    <p className="text-sm" style={{ color: theme.bodyTextColor }}>{eventData.venue}</p>
                  )}
                </div>

                <Separator />

                {/* Customer Info */}
                <div className="space-y-2">
                  <h4 className="font-medium" style={{ color: theme.headerTextColor }}>Customer Details</h4>
                  <p className="text-sm" style={{ color: theme.bodyTextColor }}>{customerInfo.name}</p>
                  <p className="text-sm" style={{ color: theme.bodyTextColor }}>{customerInfo.email}</p>
                  {customerInfo.phone && (
                    <p className="text-sm" style={{ color: theme.bodyTextColor }}>{customerInfo.phone}</p>
                  )}
                </div>

                <Separator />

                {/* Ticket Items */}
                <div className="space-y-3">
                  <h4 className="font-medium" style={{ color: theme.headerTextColor }}>Tickets</h4>
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.headerTextColor }}>
                          {item.quantity}x {item.name}
                        </p>
                        <p className="text-xs" style={{ color: theme.bodyTextColor }}>
                          ${item.price.toFixed(2)} each
                        </p>
                      </div>
                      <p className="text-sm font-medium" style={{ color: theme.headerTextColor }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Merchandise Items */}
                {merchandiseCart.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium" style={{ color: theme.headerTextColor }}>Merchandise</h4>
                      {merchandiseCart.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium" style={{ color: theme.headerTextColor }}>
                              {item.quantity}x {item.merchandise.name}
                            </p>
                            <p className="text-xs" style={{ color: theme.bodyTextColor }}>
                              ${item.merchandise.price.toFixed(2)} each
                            </p>
                          </div>
                          <p className="text-sm font-medium" style={{ color: theme.headerTextColor }}>
                            ${(item.merchandise.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span style={{ color: theme.bodyTextColor }}>Subtotal</span>
                    <span style={{ color: theme.headerTextColor }}>${subtotal.toFixed(2)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span className="font-medium">Promo Discount</span>
                      <span className="font-medium">-${promoDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Tax Breakdown */}
                  {taxEnabled && taxBreakdown && (
                    <>
                      {taxInclusive && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: theme.bodyTextColor }}>Subtotal (excl. {taxName}):</span>
                          <span style={{ color: theme.bodyTextColor }}>${taxBreakdown.subtotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span style={{ color: theme.bodyTextColor }}>{taxName} ({taxRate.toFixed(2)}%):</span>
                        <span style={{ color: theme.bodyTextColor }}>${taxBreakdown.totalTax.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {processingFee > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: theme.bodyTextColor }}>
                        Processing Fee
                        {taxCalculator?.config?.enabled && ` (inc. ${taxCalculator.config.name})`}
                      </span>
                      <span style={{ color: theme.headerTextColor }}>${processingFeeWithTax.toFixed(2)}</span>
                    </div>
                  )}
                  {bookingFee > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: theme.bodyTextColor }}>Booking Fee</span>
                      <span style={{ color: theme.headerTextColor }}>${bookingFee.toFixed(2)}</span>
                    </div>
                  )}
                  {donationAmount > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: theme.bodyTextColor }}>Donation</span>
                      <span style={{ color: theme.headerTextColor }}>${donationAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg">
                    <span style={{ color: theme.headerTextColor }}>Total</span>
                    <span style={{ color: theme.headerTextColor }}>${total.toFixed(2)}</span>
                  </div>

                  {/* Payment Plan Schedule */}
                  {selectedPaymentPlan && paymentSchedule && paymentSchedule.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-dashed">
                      <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Payment Schedule - {selectedPaymentPlan.name}
                      </h4>
                      <div className="space-y-2">
                        {paymentSchedule.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span style={{ color: theme.bodyTextColor }}>
                              {item.label} - {item.due_date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span
                              className={idx === 0 ? 'font-medium text-green-600' : ''}
                              style={idx !== 0 ? { color: theme.headerTextColor } : undefined}
                            >
                              ${item.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                        <span className="font-medium">Due Today:</span> ${paymentSchedule[0]?.amount.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
