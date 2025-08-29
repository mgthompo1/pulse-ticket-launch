import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';

interface StripePaymentFormProps {
  eventId: string;
  cart: any[];
  merchandiseCart: any[];
  customerInfo: any;
  total: number;
  enableApplePay?: boolean;
  enableGooglePay?: boolean;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
}

const CheckoutForm = ({ 
  eventId, 
  cart, 
  merchandiseCart, 
  customerInfo, 
  total, 
  enableApplePay = false, 
  enableGooglePay = false, 
  onSuccess, 
  onCancel
}: StripePaymentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [expressCheckoutElement, setExpressCheckoutElement] = useState<any>(null);
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  // Log when component mounts
  useEffect(() => {
    console.log("=== CHECKOUT FORM MOUNTED ===");
    console.log("Stripe available:", !!stripe);
    console.log("Elements available:", !!elements);
    console.log("Apple Pay enabled:", enableApplePay);
    console.log("Google Pay enabled:", enableGooglePay);
  }, [stripe, elements, enableApplePay, enableGooglePay]);

  // Initialize Express Checkout Element
  useEffect(() => {
    if (!stripe || !elements) return;

    console.log("=== EXPRESS CHECKOUT INIT ===");
    console.log("Creating Express Checkout Element...");

    const expressElement = elements.create("expressCheckout", {
      emailRequired: true,
      // Only show enabled payment methods
      paymentMethodOrder: enableApplePay && enableGooglePay 
        ? ['apple_pay', 'google_pay', 'card']
        : enableApplePay 
        ? ['apple_pay', 'card']
        : enableGooglePay 
        ? ['google_pay', 'card']
        : ['card']
    });

    setExpressCheckoutElement(expressElement);

    // Listen for confirm event
    expressElement.on('confirm', async (event: any) => {
      console.log("Express Checkout confirm event:", event);
      await handleExpressCheckoutConfirm(event);
    });

    // Listen for ready event
    expressElement.on('ready', (event: any) => {
      console.log("Express Checkout ready:", event);
    });

    console.log("Express Checkout Element created successfully");
  }, [stripe, elements, enableApplePay, enableGooglePay]);

  const handleExpressCheckoutConfirm = async (event: any) => {
    setLoading(true);
    try {
      console.log("=== EXPRESS CHECKOUT CONFIRM ===");
      console.log("Event:", event);

      // Create payment intent on your server
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          cart,
          merchandiseCart,
          customerInfo,
          total,
          paymentMethodType: event.paymentMethod.type
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      // Confirm the payment
      const { error } = await stripe!.confirmPayment({
        elements: elements!,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?orderId=${eventId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error("Payment confirmation error:", error);
        toast({
          title: "Payment Error",
          description: error.message || "Payment failed",
          variant: "destructive"
        });
      } else {
        console.log("Payment confirmed successfully");
        onSuccess(eventId);
      }
    } catch (error: any) {
      console.error("Express checkout error:", error);
      toast({
        title: "Error",
        description: error.message || "Payment failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      // Handle card payment submission
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?orderId=${eventId}`,
        },
      });

      if (error) {
        toast({
          title: "Payment Error",
          description: error.message || "Payment failed",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Error",
        description: error.message || "Payment failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Express Checkout Element */}
      {(enableApplePay || enableGooglePay) && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="text-center">
            <div className="mb-3">
              <p className="text-2xl font-bold">${total.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Express Checkout</p>
            <p className="text-xs text-muted-foreground mb-2">
              💡 Apple Pay and Google Pay available when supported
            </p>
          </div>
          
          {/* Debug Information */}
          <div className="text-xs text-muted-foreground text-center mb-2">
            Debug: enableGooglePay={enableGooglePay.toString()}, enableApplePay={enableApplePay.toString()}
          </div>
          
          {/* Express Checkout Element */}
          <div id="express-checkout-element" className="min-h-[48px]">
            {expressCheckoutElement && (
              <div ref={(el) => {
                if (el && expressCheckoutElement) {
                  expressCheckoutElement.mount(el);
                }
              }} />
            )}
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
      )}
      
      {/* Card Payment Form */}
      <div className="p-4 border rounded-lg">
        <div id="card-element" className="min-h-[48px]">
          {/* Card element will be mounted here */}
        </div>
      </div>
      
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading} className="flex-1">
          {loading ? "Processing..." : `Pay $${total.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
};

export const StripePaymentForm = ({ publishableKey, ...props }: StripePaymentFormProps & { publishableKey: string }) => {
  console.log('=== STRIPE PAYMENT FORM INIT ===');
  console.log('Publishable key received:', publishableKey);
  console.log('Publishable key type:', typeof publishableKey);
  console.log('Publishable key length:', publishableKey?.length);
  console.log('Props passed to CheckoutForm:', props);
  
  const stripePromise = loadStripe(publishableKey);

  return (
    <Elements stripe={stripePromise} options={{
      mode: 'payment',
      amount: Math.round(props.total * 100), // Convert to cents
      currency: 'nzd', // Your currency
    }}>
      <CheckoutForm {...props} />
    </Elements>
  );
};