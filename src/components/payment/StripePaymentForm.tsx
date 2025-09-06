import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Theme } from '@/types/theme';

interface StripePaymentFormProps {
  eventId: string;
  cart: any[];
  merchandiseCart: any[];
  customerInfo: any;
  total: number;
  theme: Theme;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
  bookingFeesEnabled?: boolean;
  subtotal?: number;
  bookingFee?: number;
}

const CheckoutForm = ({ 
  eventId, 
  cart, 
  merchandiseCart, 
  customerInfo, 
  total, 
  theme,
  onCancel,
  bookingFeesEnabled = false,
  subtotal = 0,
  bookingFee = 0
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
  }, [stripe, elements]);



  // Initialize Card Element
  useEffect(() => {
    if (!stripe || !elements) return;

    console.log("=== CARD ELEMENT INIT ===");
    const cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '15px',
          color: 'hsl(var(--foreground))',
          lineHeight: '1.4',
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
      // For Card Element, we need to create a payment method first
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement('card')!,
      });

      if (paymentMethodError) {
        toast({
          title: "Payment Error",
          description: paymentMethodError.message || "Failed to create payment method",
          variant: "destructive"
        });
        return;
      }

      console.log("=== PAYMENT INTENT REQUEST ===");
      console.log("eventId:", eventId);
      console.log("total:", total);
      console.log("cart:", cart);
      console.log("merchandiseCart:", merchandiseCart);
      console.log("customerInfo:", customerInfo);

      const requestBody = { 
        eventId, 
        total,
        subtotal,
        bookingFee,
        bookingFeesEnabled,
        items: [
          ...cart.map(item => ({
            id: item.id,
            ticket_type_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            type: 'ticket'
          })),
          ...merchandiseCart.map(item => ({ 
            id: item.merchandise.id,
            merchandise_id: item.merchandise.id,
            quantity: item.quantity,
            unit_price: item.merchandise.price,
            type: 'merchandise',
            selectedSize: (item as any).selectedSize,
            selectedColor: (item as any).selectedColor
          }))
        ],
        customerInfo,
        paymentMethod: 'card'
      };

      console.log("=== FULL REQUEST BODY ===");
      console.log(JSON.stringify(requestBody, null, 2));

      // Now create the payment intent and confirm with the payment method
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: requestBody
      });

      if (error) throw error;

      console.log("=== PAYMENT INTENT RESPONSE ===");
      console.log("Full response data:", data);
      console.log("client_secret:", data.client_secret);
      console.log("orderId:", data.orderId);

      if (!data.client_secret) {
        throw new Error("No client_secret returned from payment intent creation");
      }

      // Confirm the payment with the payment method
      const { error: confirmError } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: paymentMethod.id,
      });

      if (confirmError) {
        toast({
          title: "Payment Error",
          description: confirmError.message || "Payment failed",
          variant: "destructive"
        });
      } else {
        // Payment successful
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        // Redirect to success page with the ACTUAL order ID from the response
        const orderId = data.orderId || data.id;
        window.location.href = `/payment-success?orderId=${orderId}`;
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card Payment Form */}
      <div className="border rounded-lg bg-gray-50/50">
        <div id="card-element" className="min-h-[40px] p-3">
          {/* Card element will be mounted here */}
        </div>
      </div>
      
      {/* Main Payment Button */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || loading} 
          className="flex-1"
          style={{ 
            backgroundColor: theme.primaryColor,
            color: theme.buttonTextColor,
            borderColor: theme.primaryColor
          }}
        >
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
  
  // Use useMemo to prevent recreating the stripe promise on every render
  const stripePromise = React.useMemo(() => loadStripe(publishableKey), [publishableKey]);

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