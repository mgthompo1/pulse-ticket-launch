import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem, MerchandiseCartItem, EventData, CustomerInfo } from '@/types/widget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { StripePaymentForm } from '@/components/payment/StripePaymentForm';
import { Theme } from '@/types/theme';
import { PromoCodeInput } from './PromoCodeInput';
import { ReservationTimer } from '@/components/ReservationTimer';

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

interface OrderSummaryProps {
  eventData: EventData;
  cartItems: CartItem[];
  merchandiseCart: MerchandiseCartItem[];
  currentStep?: string;
  customerInfo?: CustomerInfo | null;
  onUpdateTicketQuantity?: (ticketTypeId: string, quantity: number) => void;
  onUpdateMerchandiseQuantity?: (index: number, quantity: number) => void;
  onBack?: () => void;
  theme: Theme;
  promoCodeHooks?: PromoCodeHooks;
  reservationHooks?: ReservationHooks;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  eventData,
  cartItems,
  merchandiseCart,
  currentStep,
  customerInfo,
  onUpdateTicketQuantity,
  onUpdateMerchandiseQuantity,
  onBack,
  theme,
  promoCodeHooks,
  reservationHooks
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
  const [showStripePayment, setShowStripePayment] = useState(false);
  
  // Get booking fees setting from eventData instead of separate API call
  const bookingFeesEnabled = eventData.organizations?.stripe_booking_fee_enabled || false;
  
  // Debug logging for booking fees
  console.log("=== BOOKING FEE DEBUG ===");
  console.log("Event data organizations:", eventData.organizations);
  console.log("Stripe booking fee enabled:", eventData.organizations?.stripe_booking_fee_enabled);
  console.log("Booking fees enabled (computed):", bookingFeesEnabled);
  console.log("Payment provider:", eventData.organizations?.payment_provider);
  const calculateTicketSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateMerchandiseSubtotal = () => {
    return merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
  };

  const subtotal = calculateTicketSubtotal() + calculateMerchandiseSubtotal();

  // Calculate discount from promo code hooks
  const discount = promoCodeHooks?.getTotalDiscount() || 0;

  // Calculate booking fee (1% + $0.50) when enabled for Stripe
  const bookingFee = bookingFeesEnabled && eventData.organizations?.payment_provider === 'stripe'
    ? (subtotal * 0.01) + 0.50
    : 0;

  // Debug booking fee calculation
  console.log("=== BOOKING FEE CALCULATION ===");
  console.log("Subtotal:", subtotal);
  console.log("Discount:", discount);
  console.log("Booking fees enabled:", bookingFeesEnabled);
  console.log("Payment provider check:", eventData.organizations?.payment_provider === 'stripe');
  console.log("Calculated booking fee:", bookingFee);

  // Debug promo code visibility
  console.log("=== PROMO CODE DEBUG ===");
  console.log("customerInfo exists:", !!customerInfo);
  console.log("customerInfo:", customerInfo);
  console.log("promoCodeHooks exists:", !!promoCodeHooks);
  console.log("Should show promo code:", !!(customerInfo && promoCodeHooks));

  // Processing fee can be applied alongside booking fees
  const processingFee = eventData.organizations?.credit_card_processing_fee_percentage
    ? (subtotal * (eventData.organizations.credit_card_processing_fee_percentage / 100))
    : 0;

  // Add donation amount if present
  const donationAmount = customerInfo?.donationAmount || 0;

  const total = Math.max(0, subtotal - discount + processingFee + bookingFee + donationAmount);

  // Load Stripe configuration when on payment step
  useEffect(() => {
    const loadStripeConfig = async () => {
      if (currentStep === 'payment' && eventData.organizations?.payment_provider === 'stripe') {
        try {
          const { data: paymentConfig, error: configError } = await supabase
            .rpc('get_organization_payment_config', { 
              p_organization_id: eventData.organization_id 
            });

          if (!configError && paymentConfig && paymentConfig.length > 0) {
            const config = paymentConfig[0];
            if (config.stripe_publishable_key) {
              setStripePublishableKey(config.stripe_publishable_key);
            }
          }

          // Booking fees setting is now loaded from eventData
        } catch (error) {
          console.error('Error loading Stripe config:', error);
        }
      }
    };

    loadStripeConfig();
  }, [currentStep, eventData]);

  const handlePayment = async () => {
    if (!customerInfo) {
      toast({
        title: "Error",
        description: "Customer information is required",
        variant: "destructive"
      });
      return;
    }

    if (cartItems.length === 0 && merchandiseCart.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to your cart first",
        variant: "destructive"
      });
      return;
    }

    // Debug payment provider configuration
    console.log("=== PAYMENT PROVIDER DEBUG ===");
    console.log("eventData.organizations:", eventData.organizations);
    console.log("payment_provider:", eventData.organizations?.payment_provider);
    
    // Remove the strict payment provider check for now since it's preventing valid Windcave payments
    // The windcave-session function will handle proper validation
    console.log("Proceeding with payment processing...");

    setIsProcessing(true);

    try {
      if (eventData.organizations?.payment_provider === 'windcave') {
        // For Windcave, the Payment component handles everything automatically
        toast({
          title: "Complete your payment",
          description: "Please use the payment form below to complete your order",
        });
        return;
      } else if (eventData.organizations?.payment_provider === 'stripe') {
        if (!stripePublishableKey) {
          throw new Error("Stripe publishable key not configured");
        }
        // Show Stripe payment form
        setShowStripePayment(true);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <>
      {/* Order Summary Card */}
      <Card className="w-full max-w-sm" style={{ backgroundColor: theme.cardBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg" style={{ color: theme.headerTextColor }}>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Info */}
        <div className="space-y-2">
                      <h3 className="font-semibold text-sm" style={{ color: theme.headerTextColor }}>{eventData.name}</h3>
          {eventData.venue && (
            <p className="text-sm" style={{ color: theme.bodyTextColor }}>{eventData.venue}</p>
          )}
          <p className="text-sm" style={{ color: theme.bodyTextColor }}>
            {new Date(eventData.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <Separator />

        {/* Reservation Timer */}
        {reservationHooks && reservationHooks.hasActiveReservations() && (
          <>
            <ReservationTimer
              timeRemaining={reservationHooks.timeRemaining}
              onExtend={reservationHooks.extendReservation}
              showExtendButton={true}
            />
            <Separator />
          </>
        )}

        {/* Ticket Items */}
        {cartItems.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm" style={{ color: theme.headerTextColor }}>Tickets</h4>
            {cartItems.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                     <p className="font-medium text-sm" style={{ color: theme.bodyTextColor }}>{item.name}</p>
                     <span className="text-xs text-muted-foreground" style={{ color: theme.bodyTextColor }}>
                      ${item.price.toFixed(2)} each
                    </span>
                    {/* Display selected seats if available and seat maps are enabled */}
                    {eventData?.widget_customization?.seatMaps?.enabled && item.selectedSeats && item.selectedSeats.length > 0 && (
                      <div className="mt-1">
                         <span className="text-xs text-muted-foreground" style={{ color: theme.bodyTextColor }}>Seats: </span>
                         <span className="text-xs font-medium" style={{ color: theme.bodyTextColor }}>
                          {item.selectedSeats.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                   <p className="font-medium text-sm" style={{ color: theme.bodyTextColor }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                
                {/* Quantity Controls - Only show if onUpdateTicketQuantity is provided */}
                {onUpdateTicketQuantity && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateTicketQuantity(item.id, Math.max(0, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Badge variant="secondary" className="text-xs min-w-[3rem] text-center">
                        Qty: {item.quantity}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateTicketQuantity(item.id, item.quantity + 1)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdateTicketQuantity(item.id, 0)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {/* Static quantity display when no update function */}
                {!onUpdateTicketQuantity && (
                  <Badge variant="secondary" className="text-xs">
                    Qty: {item.quantity}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Merchandise Items */}
        {merchandiseCart.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm" style={{ color: theme.headerTextColor }}>Merchandise</h4>
            {merchandiseCart.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm" style={{ color: theme.bodyTextColor }}>{item.merchandise.name}</p>
                    <span className="text-xs text-muted-foreground" style={{ color: theme.bodyTextColor }}>
                      ${item.merchandise.price.toFixed(2)} each
                    </span>
                    {/* Size and Color Options */}
                    {(item.selectedSize || item.selectedColor) && (
                      <div className="flex items-center gap-2 mt-1">
                        {item.selectedSize && (
                          <Badge variant="outline" className="text-xs">
                            {item.selectedSize}
                          </Badge>
                        )}
                        {item.selectedColor && (
                          <Badge variant="outline" className="text-xs">
                            {item.selectedColor}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm" style={{ color: theme.bodyTextColor }}>
                    ${(item.merchandise.price * item.quantity).toFixed(2)}
                  </p>
                </div>

                {/* Quantity Controls - Only show if onUpdateMerchandiseQuantity is provided */}
                {onUpdateMerchandiseQuantity && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateMerchandiseQuantity(index, Math.max(0, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Badge variant="secondary" className="text-xs min-w-[3rem] text-center">
                        Qty: {item.quantity}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateMerchandiseQuantity(index, item.quantity + 1)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdateMerchandiseQuantity(index, 0)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Static quantity display when no update function */}
                {!onUpdateMerchandiseQuantity && (
                  <Badge variant="secondary" className="text-xs">
                    Qty: {item.quantity}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {(cartItems.length > 0 || merchandiseCart.length > 0) && (
          <>
            {/* Promo Code Input - Show as soon as there are items in cart and we have promo hooks */}
            {promoCodeHooks && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm" style={{ color: theme.headerTextColor }}>Promo Code</h3>
                  <PromoCodeInput
                    promoCode={promoCodeHooks.promoCode}
                    setPromoCode={promoCodeHooks.setPromoCode}
                    promoDiscount={promoCodeHooks.promoDiscount}
                    promoError={promoCodeHooks.promoError}
                    isValidating={promoCodeHooks.isValidating}
                    onApply={promoCodeHooks.applyPromoCode}
                    onClear={promoCodeHooks.clearPromoCode}
                  />
                  {promoCodeHooks.groupDiscountTier && cartItems.reduce((sum, item) => sum + item.quantity, 0) >= promoCodeHooks.groupDiscountTier && (
                    <p className="text-xs text-green-600 font-medium">
                      ✨ Group discount active! Saving with {cartItems.reduce((sum, item) => sum + item.quantity, 0)}+ tickets
                    </p>
                  )}
                  {reservationHooks?.hasActiveReservations() && (
                    <div className="p-2 bg-orange-50 border border-orange-300 rounded text-xs text-orange-800">
                      ⏱️ <strong>Tickets reserved!</strong> Complete within <strong>{reservationHooks.formatTimeRemaining()}</strong>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                 <span style={{ color: theme.bodyTextColor }}>Subtotal</span>
                 <span style={{ color: theme.bodyTextColor }}>${subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="bg-green-50 -mx-4 px-4 py-2 rounded">
                  {promoCodeHooks?.promoDiscount > 0 && promoCodeHooks.promoDiscount >= promoCodeHooks.groupDiscount && (
                    <div className="flex justify-between items-center text-green-700 text-sm">
                      <span className="font-semibold">🎟️ Promo: {promoCodeHooks.promoCode}</span>
                      <span className="font-semibold">-${promoCodeHooks.promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {promoCodeHooks?.groupDiscount > 0 && promoCodeHooks.groupDiscount > promoCodeHooks.promoDiscount && (
                    <div className="flex justify-between items-center text-green-700 text-sm">
                      <span className="font-semibold">👥 Group Discount ({promoCodeHooks.groupDiscountTier}+)</span>
                      <span className="font-semibold">-${promoCodeHooks.groupDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-green-800 border-t border-green-200 mt-1 pt-1 text-xs">
                    <span className="font-bold">Total Savings:</span>
                    <span className="font-bold">-${discount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {processingFee > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                   <span style={{ color: theme.bodyTextColor }}>Processing Fee ({eventData.organizations?.credit_card_processing_fee_percentage}%)</span>
                   <span style={{ color: theme.bodyTextColor }}>${processingFee.toFixed(2)}</span>
                </div>
              )}

              {bookingFee > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                   <span style={{ color: theme.bodyTextColor }}>Booking Fee</span>
                   <span style={{ color: theme.bodyTextColor }}>${bookingFee.toFixed(2)}</span>
                </div>
              )}

              {donationAmount > 0 && (
                <div className="flex justify-between text-sm font-medium text-pink-700 bg-pink-50 -mx-4 px-4 py-2 rounded">
                   <span className="flex items-center gap-1">
                     💝 Donation
                   </span>
                   <span>${donationAmount.toFixed(2)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-semibold">
                 <span style={{ color: theme.bodyTextColor }}>Total</span>
                 <span style={{ color: theme.bodyTextColor }}>${total.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="text-center p-2 bg-green-100 border border-green-300 rounded -mx-4">
                  <p className="text-xs text-green-800 font-semibold">
                    🎉 You're saving ${discount.toFixed(2)}!
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {cartItems.length === 0 && merchandiseCart.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
             <p className="text-sm" style={{ color: theme.bodyTextColor }}>Your cart is empty</p>
             <p className="text-xs mt-1" style={{ color: theme.bodyTextColor }}>Add tickets or merchandise to continue</p>
          </div>
        )}

        {/* Payment Button - Only show on payment step when NOT using multistep checkout and NOT for Windcave */}
        {currentStep === 'payment' && !onBack && customerInfo && (cartItems.length > 0 || merchandiseCart.length > 0) && eventData.organizations?.payment_provider !== 'windcave' && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <Button 
                onClick={handlePayment} 
                size="lg" 
                disabled={isProcessing}
                className="w-full border-0"
                style={{ 
                  backgroundColor: theme.primaryColor,
                                      color: theme.buttonTextColor
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay ${total.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Back Button for Multistep Checkout - Show back button when onBack prop is provided */}
        {currentStep === 'payment' && onBack && customerInfo && (cartItems.length > 0 || merchandiseCart.length > 0) && (
          <div className="space-y-4">
            <Separator />
            <Button 
              variant="outline" 
              onClick={onBack} 
              size="lg" 
              className="w-full" 
              disabled={isProcessing}
              style={{ 
                borderColor: theme.primaryColor,
                color: theme.primaryColor
              }}
            >
              Back to Details
            </Button>
          </div>
        )}

        {/* Stripe Payment Form Modal */}
        {showStripePayment && stripePublishableKey && customerInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md">
              <Card>
                <CardHeader>
                  <CardTitle style={{ color: theme.headerTextColor }}>Complete Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <StripePaymentForm
                    publishableKey={stripePublishableKey}
                    eventId={eventData.id}
                    cart={cartItems}
                    merchandiseCart={merchandiseCart}
                    customerInfo={customerInfo}
                    total={total}
                    bookingFeesEnabled={bookingFeesEnabled}
                    theme={theme}
                    onSuccess={() => {
                      setShowStripePayment(false);
                      toast({
                        title: "Payment Successful",
                        description: "Your payment has been processed successfully.",
                      });
                      window.location.href = '/payment-success';
                    }}
                    onCancel={() => setShowStripePayment(false)}
                    subtotal={subtotal}
                    bookingFee={bookingFee}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
};