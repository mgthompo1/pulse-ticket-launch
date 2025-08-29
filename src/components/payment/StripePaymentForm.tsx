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
          {loading ? "Processing..." : `Pay`}
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