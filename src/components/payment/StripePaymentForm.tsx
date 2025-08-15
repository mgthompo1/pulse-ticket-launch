import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
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
  onSuccess: (orderId: string) => void;
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
        <Button type="submit" disabled={!stripe || loading} variant="success" className="flex-1">
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