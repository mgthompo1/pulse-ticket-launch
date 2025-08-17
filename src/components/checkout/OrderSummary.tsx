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

interface OrderSummaryProps {
  eventData: EventData;
  cartItems: CartItem[];
  merchandiseCart: MerchandiseCartItem[];
  currentStep?: string;
  customerInfo?: CustomerInfo | null;
  onUpdateTicketQuantity?: (ticketTypeId: string, quantity: number) => void;
  onBack?: () => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  eventData,
  cartItems,
  merchandiseCart,
  currentStep,
  customerInfo,
  onUpdateTicketQuantity,
  onBack
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
  const [showStripePayment, setShowStripePayment] = useState(false);
  const calculateTicketSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateMerchandiseSubtotal = () => {
    return merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
  };

  const subtotal = calculateTicketSubtotal() + calculateMerchandiseSubtotal();
  
  const processingFee = eventData.organizations?.credit_card_processing_fee_percentage 
    ? (subtotal * (eventData.organizations.credit_card_processing_fee_percentage / 100))
    : 0;

  const total = subtotal + processingFee;

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

      if (eventData.organizations?.payment_provider === 'windcave') {
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
          // Check if WindcavePayments is available
          if (!window.WindcavePayments?.DropIn) {
            console.error("WindcavePayments.DropIn not available");
            throw new Error("Windcave payment system not ready");
          }

          console.log("Initializing Windcave Drop-In with data:", data);
          
          // Use the same approach as the working one-page checkout
          const links = data.links;
          const totalAmount = data.totalAmount;

          // Create the drop-in using the exact same approach from TicketWidget
          window.windcaveDropIn = window.WindcavePayments?.DropIn.create({
            ...data,
            // Add the same configurations as the working implementation
            card: {
              hideCardholderName: true,
              supportedCards: ["visa", "mastercard", "amex"],
              disableCardAutoComplete: false,
              cardImagePlacement: "right",
              sideIcons: ["visa", "mastercard", "amex"],
              enableCardValidation: true,
              enableCardFormatting: true
            },
            security: {
              enableAutoComplete: true,
              enableSecureForm: true,
              enableFormValidation: true
            },
            // General onSuccess callback (for non-Apple Pay payments)
            onSuccess: async (status: string, data?: any) => {
              console.log("=== WINDCAVE SUCCESS CALLBACK ===");
              console.log("Success status:", status);
              console.log("Success data:", data);
              
              // Critical: Handle 3DSecure authentication flow
              if (status == "3DSecure") {
                console.log("3DSecure authentication in progress...");
                return;
              }
              
              console.log("Transaction finished");
              
              // Close the drop-in widget
              if (window.windcaveDropIn) {
                window.windcaveDropIn.close();
                window.windcaveDropIn = null;
              }
              
              // Extract session ID from links for completion
              const sessionId = links[0]?.href?.split('/').pop();
              console.log("=== DEBUG INFO ===");
              console.log("Full link:", links[0]?.href);
              console.log("Extracted sessionId:", sessionId);
              console.log("Event ID:", eventData?.id);
              
              if (sessionId && eventData) {
                toast({
                  title: "Payment Successful!",
                  description: "Finalizing your order...",
                });
                
                try {
                  console.log("=== CALLING WINDCAVE DROPIN SUCCESS ===");
                  console.log("About to call function with:", {
                    sessionId: sessionId,
                    eventId: eventData.id
                  });
                  
                  // Call the Drop In success function to finalize the order
                  const { data, error } = await supabase.functions.invoke('windcave-dropin-success', {
                    body: { 
                      sessionId: sessionId,
                      eventId: eventData.id
                    }
                  });

                  console.log("=== FUNCTION RESPONSE ===");
                  console.log("Data:", data);
                  console.log("Error:", error);

                  if (error) {
                    console.error("=== WINDCAVE DROPIN SUCCESS ERROR ===");
                    console.error("Full error object:", error);
                    console.error("Error message:", error.message);
                    console.error("Error details:", error.details);
                    throw error;
                  }

                  console.log("=== WINDCAVE DROPIN SUCCESS DATA ===");
                  console.log("Response data:", data);

                  toast({
                    title: "Order Complete!",
                    description: `Your tickets have been confirmed. Check your email for details.`,
                  });
                  
                  // Redirect to success page
                  setTimeout(() => {
                    window.location.href = '/payment-success';
                  }, 1500);
                  
                } catch (error: any) {
                  console.error("=== COMPLETE ERROR DETAILS ===");
                  console.error("Error finalizing order:", error);
                  console.error("Error type:", typeof error);
                  console.error("Error constructor:", error?.constructor?.name);
                  console.error("Error stack:", error?.stack);
                  toast({
                    title: "Payment Processed",
                    description: "Payment successful but there was an issue finalizing your order. Please contact support.",
                    variant: "destructive"
                  });
                }
              } else {
                toast({
                  title: "Payment Complete",
                  description: "Your payment has been processed successfully!",
                });
                
                // Redirect to success page
                setTimeout(() => {
                  window.location.href = '/payment-success';
                }, 1500);
              }
            },
            // General onError callback (for non-Apple Pay payments)
            onError: (error: any) => {
              console.error("=== WINDCAVE ERROR CALLBACK ===");
              console.error("Transaction failed:", error);
              
              // Close the drop-in widget
              if (window.windcaveDropIn) {
                window.windcaveDropIn.close();
                window.windcaveDropIn = null;
              }
              
              let errorMessage = "Payment failed. Please try again.";
              if (typeof error === 'string') {
                errorMessage = error;
              } else if (error?.message) {
                errorMessage = error.message;
              }
              
              toast({
                title: "Payment Failed",
                description: errorMessage,
                variant: "destructive"
              });
            },
            // Additional configuration to ensure proper security
            options: {
              enableAutoComplete: true,
              enableSecureForm: true,
              enableFormValidation: true,
              enableCardValidation: true,
              enableCardFormatting: true
            }
          } as any);
        }
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
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">{eventData.name}</h3>
          {eventData.venue && (
            <p className="text-sm text-muted-foreground">{eventData.venue}</p>
          )}
          <p className="text-sm text-muted-foreground">
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

        {/* Ticket Items */}
        {cartItems.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Tickets</h4>
            {cartItems.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <span className="text-xs text-muted-foreground">
                      ${item.price.toFixed(2)} each
                    </span>
                  </div>
                  <p className="font-medium text-sm">
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
            <h4 className="font-medium text-sm">Merchandise</h4>
            {merchandiseCart.map((item, index) => (
              <div key={index} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.merchandise.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      Qty: {item.quantity}
                    </Badge>
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
                  <span className="text-xs text-muted-foreground">
                    ${item.merchandise.price.toFixed(2)} each
                  </span>
                </div>
                <p className="font-medium text-sm">
                  ${(item.merchandise.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

        {(cartItems.length > 0 || merchandiseCart.length > 0) && (
          <>
            <Separator />
            
            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              {processingFee > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing Fee ({eventData.organizations?.credit_card_processing_fee_percentage}%)</span>
                  <span>${processingFee.toFixed(2)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        {cartItems.length === 0 && merchandiseCart.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Your cart is empty</p>
            <p className="text-xs mt-1">Add tickets or merchandise to continue</p>
          </div>
        )}

        {/* Payment Button - Only show on payment step */}
        {currentStep === 'payment' && customerInfo && (cartItems.length > 0 || merchandiseCart.length > 0) && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <Button 
                onClick={handlePayment} 
                size="lg" 
                disabled={isProcessing}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white border-0"
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
              
              {onBack && (
                <Button variant="outline" onClick={onBack} size="lg" className="w-full" disabled={isProcessing}>
                  Back to Details
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stripe Payment Form Modal */}
        {showStripePayment && stripePublishableKey && customerInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md">
              <Card>
                <CardHeader>
                  <CardTitle>Complete Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <StripePaymentForm
                    publishableKey={stripePublishableKey}
                    eventId={eventData.id}
                    cart={cartItems as any}
                    merchandiseCart={merchandiseCart as any}
                    customerInfo={customerInfo}
                    total={total}
                    onSuccess={() => {
                      setShowStripePayment(false);
                      toast({
                        title: "Payment Successful",
                        description: "Your payment has been processed successfully.",
                      });
                      window.location.href = '/payment-success';
                    }}
                    onCancel={() => setShowStripePayment(false)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};