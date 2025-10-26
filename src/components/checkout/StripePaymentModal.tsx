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

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventData: EventData;
  cartItems: CartItem[];
  merchandiseCart: MerchandiseCartItem[];
  customerInfo: CustomerInfo;
  theme: Theme;
  promoCodeId?: string | null;
  promoDiscount?: number;
}

export const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  isOpen,
  onClose,
  eventData,
  cartItems,
  merchandiseCart,
  customerInfo,
  theme,
  promoCodeId = null,
  promoDiscount = 0
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

  // Apply discount to total and add donation
  const total = Math.max(0, subtotal - promoDiscount + processingFee + bookingFee + donationAmount);

  // Debug logging
  console.log("=== STRIPE MODAL FEE CALCULATION ===");
  console.log("Subtotal:", subtotal);
  console.log("Promo Discount:", promoDiscount);
  console.log("Booking fees enabled:", bookingFeesEnabled);
  console.log("Booking fee:", bookingFee);
  console.log("Processing fee:", processingFee);
  console.log("Donation amount:", donationAmount);
  console.log("Total:", total);

  // Load Stripe configuration when modal opens
  useEffect(() => {
    const loadStripeConfig = async () => {
      if (isOpen && !stripePublishableKey) {
        console.log('=== LOADING STRIPE CONFIG FOR MODAL ===');
        console.log('📅 Event ID for config:', eventData.id);
        setIsLoading(true);
        
        try {
          let data, error;
          
          // Try the new function first, fallback to direct table query
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_public_payment_config', { 
              p_event_id: eventData.id 
            });
          
          if (rpcError) {
            console.log('RPC function failed, trying fallback query:', rpcError);
            // Fallback: direct query to organizations table
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('events')
              .select(`
                organizations (
                  stripe_publishable_key,
                  payment_provider,
                  currency,
                  credit_card_processing_fee_percentage,
                  apple_pay_merchant_id,
                  windcave_enabled
                )
              `)
              .eq('id', eventData.id)
              .single();
            
            if (fallbackError || !fallbackData?.organizations) {
              error = fallbackError;
              data = null;
            } else {
              // Transform fallback data to match RPC format
              data = [{
                stripe_publishable_key: (fallbackData.organizations as any).stripe_publishable_key || null,
                payment_provider: fallbackData.organizations.payment_provider,
                currency: fallbackData.organizations.currency,
                credit_card_processing_fee_percentage: fallbackData.organizations.credit_card_processing_fee_percentage,
                apple_pay_merchant_id: (fallbackData.organizations as any).apple_pay_merchant_id || null,
                windcave_enabled: (fallbackData.organizations as any).windcave_enabled || false,
                stripe_account_id: null // Not available in fallback
              }];
              error = null;
            }
          } else {
            data = rpcData;
            error = rpcError;
          }
          
          console.log('📊 Final Response - Error:', error);
          console.log('📊 Final Response - Data:', data);

          if (error) {
            console.error('Error loading payment config:', error);
            toast({
              title: "Payment Error",
              description: "Failed to load payment configuration",
              variant: "destructive"
            });
            return;
          }

          if (data && data.length > 0) {
            const publishableKey = data[0].stripe_publishable_key;
            const configCurrency = data[0].currency || 'USD';
            
            if (publishableKey) {
              setStripePublishableKey(publishableKey);
              setCurrency(configCurrency);
              console.log('✅ Stripe publishable key loaded for modal');
              console.log('✅ Currency loaded:', configCurrency);
              console.log('🔍 Full payment config data:', data[0]);
            } else {
              console.error('❌ No Stripe publishable key found');
              toast({
                title: "Payment Error",
                description: "Payment configuration not found",
                variant: "destructive"
              });
            }
          }
        } catch (error) {
          console.error('❌ Exception loading Stripe config:', error);
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
                  <>
                    {console.log('🚀 Modal passing currency to payment form:', currency)}
                    {console.log('🎟️ Modal passing promoCodeId to payment form:', promoCodeId)}
                    <StripePaymentForm
                    publishableKey={stripePublishableKey}
                    eventId={eventData.id}
                    cart={cartItems}
                    merchandiseCart={merchandiseCart}
                    customerInfo={customerInfo}
                    total={total}
                    theme={theme}
                    bookingFeesEnabled={bookingFeesEnabled}
                    subtotal={subtotal}
                    bookingFee={bookingFee}
                    currency={currency}
                    promoCodeId={promoCodeId}
                    onSuccess={(orderId: string) => {
                      console.log("Payment successful, order ID:", orderId);
                      handlePaymentSuccess(orderId);
                    }}
                    onCancel={onClose}
                  />
                  </>
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
                  {processingFee > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: theme.bodyTextColor }}>Processing Fee</span>
                      <span style={{ color: theme.headerTextColor }}>${processingFee.toFixed(2)}</span>
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
