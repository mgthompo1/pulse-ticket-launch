import React, { useState, useEffect } from 'react';
import { Elements, CardElement, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  ticketTypeId: string;
  quantity: number;
  price: number;
  name: string;
}

interface MerchandiseItem {
  merchandiseId: string;
  quantity: number;
  price: number;
  name: string;
  options?: Record<string, string>;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
}

interface StripePaymentFormProps {
  publishableKey: string;
  eventId: string;
  cart: CartItem[];
  merchandiseCart: MerchandiseItem[];
  customerInfo: CustomerInfo;
  total: number;
  enableApplePay?: boolean;
  enableGooglePay?: boolean;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
}

const CheckoutForm = ({ eventId, cart, merchandiseCart, customerInfo, total, enableApplePay = false, enableGooglePay = false, onSuccess, onCancel }: Omit<StripePaymentFormProps, 'publishableKey'>) => {
  console.log("=== CHECKOUT FORM RENDER ===");
  console.log("Props received:", { eventId, cart, merchandiseCart, customerInfo, total });
  
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const { toast } = useToast();

  // Log when component mounts
  useEffect(() => {
    console.log("=== CHECKOUT FORM MOUNTED ===");
    console.log("Stripe available:", !!stripe);
    console.log("Elements available:", !!elements);
  }, [stripe, elements]);

  // Initialize PaymentRequest for Apple Pay and Google Pay
  useEffect(() => {
    // Only initialize if Apple Pay or Google Pay is enabled
    if (!enableApplePay && !enableGooglePay) {
      console.log("=== PAYMENT REQUEST DEBUG ===");
      console.log("Apple Pay and Google Pay are disabled in configuration");
      setCanMakePayment(false);
      setPaymentRequest(null);
      return;
    }

    console.log("=== PAYMENT REQUEST DEBUG ===");
    console.log("Stripe available:", !!stripe);
    console.log("Elements available:", !!elements);
    console.log("Total amount:", total);
    console.log("Total is valid:", total > 0 && isFinite(total));
    console.log("Apple Pay enabled:", enableApplePay);
    console.log("Google Pay enabled:", enableGooglePay);
    
    // Add a small delay to ensure Stripe Elements are fully loaded
    const timer = setTimeout(() => {
      if (stripe && elements && total > 0 && isFinite(total)) {
      console.log("Creating PaymentRequest...");
      
      const pr = stripe.paymentRequest({
        country: 'NZ',
        currency: 'nzd', // Must be lowercase for Stripe PaymentRequest
        total: {
          label: 'Total',
          amount: Math.round(total * 100), // Convert to cents
        },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
        // Add additional options for better cross-browser support
        disableWallets: [], // Don't disable any wallets
        requestShipping: false, // Don't request shipping for tickets
      });

      console.log("PaymentRequest created successfully:", pr);

      // Check if the PaymentRequest is supported
      pr.canMakePayment().then((result: any) => {
        console.log("PaymentRequest canMakePayment result:", result);
        console.log("Result details:", {
          applePay: result?.applePay,
          googlePay: result?.googlePay,
          canMakePayment: !!result
        });
        
        // More permissive check - show Apple Pay/Google Pay if any payment method is available
        const hasAnyPaymentMethod = result && (
          result.applePay || 
          result.googlePay || 
          result.basicCard || 
          result.https
        );
        
        console.log("Has any payment method:", hasAnyPaymentMethod);
        
        setCanMakePayment(!!hasAnyPaymentMethod);
        if (hasAnyPaymentMethod) {
          console.log("Setting paymentRequest state - payment method available");
          setPaymentRequest(pr);
        } else {
          console.log("No payment methods available on this device/browser");
          console.log("This could be due to:");
          console.log("- Not on HTTPS (required for Apple Pay/Google Pay)");
          console.log("- Browser doesn't support PaymentRequest API");
          console.log("- No payment methods configured on device");
          console.log("- Device doesn't support mobile payments");
        }
      }).catch((error: any) => {
        console.error("Error checking PaymentRequest support:", error);
        console.log("Falling back to card-only payment");
        setCanMakePayment(false);
      });

      // Handle PaymentRequest completion
      pr.on('paymentmethod', async (event: any) => {
        setLoading(true);
        try {
          // Prepare items array combining tickets and merchandise
          const items = [
            ...cart.map((ticket: any) => ({
              type: 'ticket',
              ticket_type_id: ticket.id || ticket.ticketTypeId,
              quantity: ticket.quantity,
              unit_price: ticket.price,
            })),
            ...merchandiseCart.map((item: any) => ({
              type: 'merchandise',
              merchandise_id: item.merchandise.id,
              quantity: item.quantity,
              unit_price: item.merchandise.price,
              merchandise_options: {
                size: item.selectedSize,
                color: item.selectedColor,
              },
            })),
          ];

          console.log("=== APPLE PAY/GOOGLE PAY PAYMENT DEBUG ===");
          console.log("Sending to create-payment-intent:", {
            eventId,
            items,
            customerInfo,
            total
          });

          // Create payment intent
          const { data, error } = await supabase.functions.invoke('create-payment-intent', {
            body: {
              eventId,
              items,
              customerInfo,
              total
            }
          });

          if (error) {
            console.error("Failed to create payment intent:", error);
            throw new Error(error.message || "Failed to create payment intent");
          }

          // Confirm the payment with the payment method
          const { error: confirmError } = await stripe.confirmCardPayment(
            data.clientSecret,
            {
              payment_method: event.paymentMethod.id,
            }
          );

          if (confirmError) {
            console.error("Payment confirmation failed:", confirmError);
            throw confirmError;
          }

          // Payment successful, process the order
          const { error: processError } = await supabase.functions.invoke('stripe-payment-success', {
            body: {
              orderId: data.orderId,
              paymentIntentId: data.clientSecret.split('_secret_')[0]
            }
          });

          if (processError) {
            console.error("Post-payment processing failed:", processError);
          }

          toast({
            title: "Payment Successful",
            description: "Your tickets have been purchased successfully!",
          });

          onSuccess(data.orderId);
        } catch (error: any) {
          console.error('Express payment failed:', error);
          toast({
            title: "Payment Failed",
            description: error.message || "There was an error processing your payment. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      });

      // Handle PaymentRequest cancellation
      pr.on('cancel', () => {
        console.log('PaymentRequest was cancelled');
      });
    }
    }, 100); // 100ms delay

    // Cleanup timer
    return () => clearTimeout(timer);
  }, [stripe, elements, total, cart, merchandiseCart, customerInfo, eventId, onSuccess, toast]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Prepare items array combining tickets and merchandise
      const items = [
        ...cart.map((ticket: any) => ({
          type: 'ticket',
          ticket_type_id: ticket.id || ticket.ticketTypeId,
          quantity: ticket.quantity,
          unit_price: ticket.price,
        })),
        ...merchandiseCart.map((item: any) => ({
          type: 'merchandise',
          merchandise_id: item.merchandise.id,
          quantity: item.quantity,
          unit_price: item.merchandise.price,
          merchandise_options: {
            size: item.selectedSize,
            color: item.selectedColor,
          },
        })),
      ];

      console.log("=== STRIPE PAYMENT FORM DEBUG ===");
      console.log("Sending to create-payment-intent:", {
        eventId,
        items,
        customerInfo,
        total
      });

      // Create payment intent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          eventId,
          items,
          customerInfo,
          total
        }
      });

      if (error) throw error;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      // Confirm payment
      const { error: paymentError } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
          },
        }
      });

      if (paymentError) {
        // Handle specific payment decline messages
        const errorTitle = "Payment Failed";
        let errorDescription = "Please try again or use a different payment method.";
        
        if (paymentError.type === 'card_error') {
          switch (paymentError.code) {
            case 'card_declined':
              errorDescription = "Your card was declined. Please try again or use a different payment method.";
              break;
            case 'insufficient_funds':
              errorDescription = "Insufficient funds. Please check your account balance or use a different card.";
              break;
            case 'expired_card':
              errorDescription = "Your card has expired. Please use a different payment method.";
              break;
            case 'incorrect_cvc':
              errorDescription = "Incorrect security code. Please check your CVC and try again.";
              break;
            case 'processing_error':
              errorDescription = "Payment processing error. Please try again in a few moments.";
              break;
            default:
              errorDescription = paymentError.message || "Payment failed. Please try again.";
          }
        } else if (paymentError.type === 'validation_error') {
          errorDescription = "Please check your payment details and try again.";
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
        });
        return;
      }

      // Payment confirmed successfully, now process the order
      console.log("Payment confirmed, processing order...");
      
      try {
        // Call our success handler to create tickets and send emails
        const { error: processError } = await supabase.functions.invoke('stripe-payment-success', {
          body: {
            orderId: data.orderId,
            paymentIntentId: data.clientSecret.split('_secret_')[0] // Extract payment intent ID
          }
        });

        if (processError) {
          console.error("Post-payment processing failed:", processError);
          // Still show success to user since payment went through
        }
      } catch (processError) {
        console.error("Failed to process post-payment actions:", processError);
        // Still show success to user since payment went through
      }

      toast({
        title: "Payment Successful",
        description: "Your tickets have been purchased successfully!",
      });

      onSuccess(data.orderId);
    } catch (error: unknown) {
      console.error('Payment failed:', error);
      
      // Handle non-Stripe errors (like network issues or server errors)
      const errorTitle = "Payment Failed";
      let errorDescription = "There was an error processing your payment. Please try again.";
      
      if (error instanceof Error) {
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorDescription = "Network error. Please check your connection and try again.";
        } else if (error.message) {
          errorDescription = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Express Payment Options - Apple Pay and Google Pay */}
      {canMakePayment && paymentRequest && (enableApplePay || enableGooglePay) ? (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="text-center">
            <div className="mb-3">
              <p className="text-2xl font-bold">${total.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Express Checkout</p>
            <p className="text-xs text-muted-foreground mb-2">
              💡 Works on all browsers - Apple Pay shows QR code on desktop
            </p>
          </div>
          <div className="flex justify-center">
            <PaymentRequestButtonElement
              options={{
                paymentRequest,
                style: {
                  paymentRequestButton: {
                    type: 'buy',
                    theme: 'dark',
                    height: '48px',
                  },
                },
              }}
            />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-muted/30 px-2 text-muted-foreground">Or pay with card</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-4 border rounded-lg bg-muted/30">
          <div className="mb-3">
            <p className="text-2xl font-bold">${total.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Total Amount</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {enableApplePay || enableGooglePay ? "Card Payment" : "Payment"}
          </p>
        </div>
      )}
      
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: 'hsl(var(--foreground))',
                '::placeholder': {
                  color: 'hsl(var(--muted-foreground))',
                },
              },
            },
          }}
        />
      </div>
      
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading} className="flex-1">
          {loading ? "Processing..." : `Proceed to Payment`}
        </Button>
      </div>
    </form>
  );
};

export const StripePaymentForm = ({ publishableKey, ...props }: StripePaymentFormProps) => {
  console.log('=== STRIPE PAYMENT FORM INIT ===');
  console.log('Publishable key received:', publishableKey);
  console.log('Publishable key type:', typeof publishableKey);
  console.log('Publishable key length:', publishableKey?.length);
  console.log('Props passed to CheckoutForm:', props);
  
  const stripePromise = loadStripe(publishableKey);

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};