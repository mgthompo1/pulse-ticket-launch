import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StripePaymentFormProps {
  publishableKey: string;
  eventId: string;
  cart: any[];
  merchandiseCart: any[];
  customerInfo: any;
  total: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm = ({ eventId, cart, merchandiseCart, customerInfo, total, onSuccess, onCancel }: Omit<StripePaymentFormProps, 'publishableKey'>) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          eventId,
          tickets: cart,
          merchandise: merchandiseCart,
          customerInfo
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
        throw paymentError;
      }

      toast({
        title: "Payment Successful",
        description: "Your tickets have been purchased successfully!",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Payment failed:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          {loading ? "Processing..." : `Pay $${total.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
};

export const StripePaymentForm = ({ publishableKey, ...props }: StripePaymentFormProps) => {
  const stripePromise = loadStripe(publishableKey);

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};