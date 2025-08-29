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



  // Initialize Card Element
  useEffect(() => {
    if (!stripe || !elements) return;

    console.log("=== CARD ELEMENT INIT ===");
    const cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: 'hsl(var(--foreground))',
          '::placeholder': {
            color: 'hsl(var(--muted-foreground))',
          },
        },
      },
    });

    const cardContainer = document.getElementById('card-element');
    if (cardContainer) {
      cardElement.mount(cardContainer);
    }

    return () => {
      cardElement.destroy();
    };
  }, [stripe, elements]);



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
      {/* Total Amount Display */}
      <div className="text-center p-4 border rounded-lg bg-muted/30">
        <div className="mb-3">
          <p className="text-2xl font-bold">${total.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">Total Amount</p>
        </div>
      </div>

      {/* Card Payment Form */}
      <div className="p-4 border rounded-lg">
        <div className="text-center mb-3">
          <p className="text-sm text-muted-foreground">Card Payment</p>
        </div>
        <div id="card-element" className="min-h-[48px]">
          {/* Card element will be mounted here */}
        </div>
      </div>
      
      {/* Main Payment Button */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading} className="flex-1">
          {loading ? "Processing..." : `Proceed to Payment`}
        </Button>
      </div>

      {/* Express Payment Alternatives */}
      {(enableApplePay || enableGooglePay) && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <div className="text-center">
            <p className="text-sm font-medium mb-3">Express Payment Options</p>
          </div>
          
          {/* Google Pay Button */}
          {enableGooglePay && (
            <button
              type="button"
              onClick={() => {
                console.log("Google Pay button clicked");
                // Handle Google Pay payment
              }}
              className="w-full bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors border border-gray-300 flex items-center justify-center"
              style={{ minHeight: '48px' }}
            >
              <span className="flex items-center justify-center">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.26 11c.35-1.88 1.88-3.24 3.74-3.24 1.88 0 3.39 1.36 3.74 3.24H5.26zM9 12.5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                </svg>
                Pay with Google Pay
              </span>
            </button>
          )}
          
          {/* Apple Pay Button */}
          {enableApplePay && (
            <button
              type="button"
              onClick={() => {
                console.log("Apple Pay button clicked");
                // Handle Apple Pay payment
              }}
              className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center"
              style={{ minHeight: '48px' }}
            >
              <span className="flex items-center justify-center">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Pay with Apple Pay
              </span>
            </button>
          )}
          
          {/* Stripe Link Button */}
          <button
            type="button"
            onClick={() => {
              console.log("Stripe Link button clicked");
              // Handle Stripe Link payment
            }}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            style={{ minHeight: '48px' }}
          >
            <span className="flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Pay with Stripe Link
            </span>
          </button>
        </div>
      )}
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