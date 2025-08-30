import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { CartItem, MerchandiseCartItem, EventData, CustomerInfo } from '@/types/widget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { StripePaymentForm } from '@/components/payment/StripePaymentForm';
import { WindcaveHostedFields } from '@/components/payment/WindcaveHostedFields';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Theme } from '@/types/theme';

interface PaymentProps {
  eventData: EventData;
  cartItems: CartItem[];
  merchandiseCart: MerchandiseCartItem[];
  customerInfo: CustomerInfo;
  theme: Theme;
}

export const Payment: React.FC<PaymentProps> = ({
  eventData,
  cartItems,
  merchandiseCart,
  customerInfo,
  theme
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [windcaveSessionData, setWindcaveSessionData] = useState<any>(null);
  const [showWindcavePayment, setShowWindcavePayment] = useState(false);

  // Calculate totals
  const calculateTotal = (): number => {
    const ticketSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const merchandiseSubtotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
    return ticketSubtotal + merchandiseSubtotal;
  };

  const subtotal = calculateTotal();
  const processingFee = eventData.organizations?.credit_card_processing_fee_percentage 
    ? subtotal * (eventData.organizations.credit_card_processing_fee_percentage / 100)
    : 0;
  const total = subtotal + processingFee;

  // Auto-initialize Windcave payment when component loads
  useEffect(() => {
    const initializePayment = async () => {
      if (eventData.organizations?.payment_provider === 'windcave' && !windcaveSessionData) {
        console.log("Auto-initializing Windcave payment...");
        
        setIsProcessing(true);
        
        try {
          // Prepare order items
          const items = [
            ...cartItems.map(item => ({
              type: 'ticket' as const,
              ticket_type_id: item.id,
              quantity: item.quantity,
              unit_price: item.price,
            })),
            ...merchandiseCart.map(item => ({
              type: 'merchandise' as const,
              merchandise_id: item.merchandise.id,
              quantity: item.quantity,
              unit_price: item.merchandise.price,
              merchandise_options: {
                size: item.selectedSize,
                color: item.selectedColor,
              },
            })),
          ];

          const { data, error } = await supabase.functions.invoke('windcave-session', {
            body: {
              eventId: eventData.id,
              items,
              customerInfo,
            },
          });

          if (error) throw error;

          console.log("Windcave session response:", data);
          
          if (data.links) {
            setWindcaveSessionData(data);
            setShowWindcavePayment(true);
          }
        } catch (error: any) {
          console.error('Auto-initialization error:', error);
          toast({
            title: "Payment Error",
            description: error.message || "Failed to initialize payment",
            variant: "destructive"
          });
        } finally {
          setIsProcessing(false);
        }
      }
    };

    // Only auto-initialize for Windcave
    if (eventData.organizations?.payment_provider === 'windcave') {
      initializePayment();
    }
  }, [eventData, customerInfo, cartItems, merchandiseCart, windcaveSessionData]);

  // Load Stripe configuration when needed
  useEffect(() => {
    const loadStripeConfig = async () => {
      if (eventData.organizations?.payment_provider === 'stripe') {
        console.log('=== LOADING STRIPE CONFIG ===');
        console.log('Event ID:', eventData.id);
        
        try {
          // Use the new public function to get payment config for this specific event
          const { data, error } = await supabase
            .rpc('get_public_payment_config', { 
              p_event_id: eventData.id 
            });

          console.log('Payment config response:', { data, error });

          if (error) {
            console.error('Error loading payment config:', error);
            return;
          }

          if (data && data.length > 0) {
            console.log('Payment config data:', data[0]);
            const publishableKey = data[0].stripe_publishable_key;
            console.log('Stripe publishable key:', publishableKey);
            
            if (publishableKey) {
              setStripePublishableKey(publishableKey);
              console.log('✅ Stripe publishable key set successfully');
            } else {
              console.error('❌ No Stripe publishable key found in response');
            }
          } else {
            console.error('❌ No payment config data returned');
          }
        } catch (error) {
          console.error('❌ Exception loading Stripe config:', error);
        }
      }
    };

    loadStripeConfig();
  }, [eventData.organizations?.payment_provider, eventData.id]);

  const handlePayment = async () => {
    // This function is now only for Stripe payments
    if (eventData.organizations?.payment_provider === 'stripe') {
      setShowStripePayment(true);
      return;
    }

    // For Windcave, the payment should already be initialized automatically
    toast({
      title: "Payment already initialized",
      description: "Please use the payment form below",
    });
  };

  const handleWindcaveSuccess = async (sessionId: string) => {
    try {
      toast({
        title: "Payment Successful!",
        description: "Finalizing your order...",
      });
      
      const { data, error } = await supabase.functions.invoke('windcave-dropin-success', {
        body: { 
          sessionId: sessionId,
          eventId: eventData.id
        }
      });

      if (error) throw error;

      toast({
        title: "Order Complete!",
        description: "Your tickets have been confirmed. Check your email for details.",
      });
      
      // Redirect to payment success page with the order ID
      setTimeout(() => {
        if (data?.orderId) {
          window.location.href = `/payment-success?orderId=${data.orderId}`;
        } else {
          // Fallback to payment success page without order ID (will show appropriate message)
          window.location.href = '/payment-success';
        }
      }, 1500);
      
    } catch (error: any) {
      console.error("Error finalizing order:", error);
      toast({
        title: "Payment Processed",
        description: "Payment successful but there was an issue finalizing your order. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setShowWindcavePayment(false);
      setIsProcessing(false);
    }
  };

  const handleWindcaveError = (error: string) => {
    console.error("Windcave payment error:", error);
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive"
    });
    setShowWindcavePayment(false);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Customer Information Display */}
      <Card style={{ backgroundColor: theme.cardBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
        <CardHeader>
          <CardTitle style={{ color: theme.headerTextColor }}>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium" style={{ color: theme.headerTextColor }}>Name</p>
            <p className="text-sm text-muted-foreground" style={{ color: theme.bodyTextColor }}>{customerInfo.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: theme.headerTextColor }}>Email</p>
            <p className="text-sm text-muted-foreground" style={{ color: theme.bodyTextColor }}>{customerInfo.email}</p>
          </div>
          {customerInfo.phone && (
            <div>
              <p className="text-sm font-medium" style={{ color: theme.headerTextColor }}>Phone</p>
              <p className="text-sm text-muted-foreground" style={{ color: theme.bodyTextColor }}>{customerInfo.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card style={{ backgroundColor: theme.cardBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
        <CardHeader>
          <CardTitle style={{ color: theme.headerTextColor }}>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ticket Items */}
          {cartItems.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm" style={{ color: theme.headerTextColor }}>Tickets</h4>
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm" style={{ color: theme.bodyTextColor }}>{item.name}</p>
                    <p className="text-xs text-muted-foreground" style={{ color: theme.bodyTextColor }}>Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                  </div>
                  <p className="font-medium text-sm" style={{ color: theme.bodyTextColor }}>${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Merchandise Items */}
          {merchandiseCart.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm" style={{ color: theme.headerTextColor }}>Merchandise</h4>
              {merchandiseCart.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm" style={{ color: theme.bodyTextColor }}>{item.merchandise.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">Qty: {item.quantity}</Badge>
                      {item.selectedSize && (
                        <Badge variant="outline" className="text-xs">{item.selectedSize}</Badge>
                      )}
                      {item.selectedColor && (
                        <Badge variant="outline" className="text-xs">{item.selectedColor}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground" style={{ color: theme.bodyTextColor }}>
                      ${item.merchandise.price.toFixed(2)} each
                    </span>
                  </div>
                  <p className="font-medium text-sm" style={{ color: theme.bodyTextColor }}>
                    ${(item.merchandise.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: theme.bodyTextColor }}>Subtotal</span>
              <span style={{ color: theme.bodyTextColor }}>${subtotal.toFixed(2)}</span>
            </div>
            
            {processingFee > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span style={{ color: theme.bodyTextColor }}>Processing Fee ({eventData.organizations?.credit_card_processing_fee_percentage}%)</span>
                <span style={{ color: theme.bodyTextColor }}>${processingFee.toFixed(2)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between font-semibold">
              <span style={{ color: theme.bodyTextColor }}>Total</span>
              <span style={{ color: theme.bodyTextColor }}>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Button - Only show for Stripe payments */}
          {eventData.organizations?.payment_provider === 'stripe' && !showStripePayment && (
            <div className="pt-4">
              <Button 
                onClick={handlePayment}
                size="lg"
                disabled={isProcessing}
                className="w-full"
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
          )}

          {/* Loading state for Windcave */}
          {eventData.organizations?.payment_provider === 'windcave' && !showWindcavePayment && (
            <div className="pt-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground" style={{ color: theme.bodyTextColor }}>Initializing payment form...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Windcave Hosted Fields - Full width separate card */}
      {showWindcavePayment && windcaveSessionData && (
        <WindcaveHostedFields
          sessionData={windcaveSessionData}
          onSuccess={handleWindcaveSuccess}
          onError={handleWindcaveError}
          isProcessing={isProcessing}
          eventData={eventData}
        />
      )}

      {/* Stripe Payment Form Modal */}
      <Dialog open={showStripePayment} onOpenChange={setShowStripePayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: theme.headerTextColor }}>Complete Payment</DialogTitle>
          </DialogHeader>
          {stripePublishableKey ? (
            <>
              {/* Debug logging */}
              {(() => {
                console.log('=== RENDERING STRIPE FORM ===', { 
                  stripePublishableKey, 
                  showStripePayment,
                  hasKey: !!stripePublishableKey,
                  keyLength: stripePublishableKey?.length 
                });
                return null;
              })()}
              <StripePaymentForm
                key={`stripe-${eventData.id}-${stripePublishableKey}`} // More stable key
                publishableKey={stripePublishableKey}
                eventId={eventData.id}
                cart={cartItems as any}
                merchandiseCart={merchandiseCart as any}
                customerInfo={customerInfo}
                total={total}
                onSuccess={(orderId: string) => {
                  setShowStripePayment(false);
                  toast({
                    title: "Payment Successful",
                    description: "Your payment has been processed successfully.",
                  });
                  // Redirect to payment success page with the order ID
                  window.location.href = `/payment-success?orderId=${orderId}`;
                }}
                onCancel={() => setShowStripePayment(false)}
              />
            </>
          ) : (
            <div className="p-4 text-center">
              <p>Loading payment form...</p>
              <p className="text-sm text-muted-foreground">Stripe key: {stripePublishableKey || 'Not loaded'}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};