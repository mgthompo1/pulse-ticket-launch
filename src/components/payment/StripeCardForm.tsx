import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Theme } from '@/types/theme';
import { Loader2 } from 'lucide-react';

interface StripeCardFormProps {
  eventId: string;
  cart: any[];
  merchandiseCart: any[];
  customerInfo: any;
  attendees?: any[];
  total: number;
  subtotal: number;
  theme: Theme;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
  bookingFeesEnabled?: boolean;
  bookingFee?: number;
  currency?: string;
  promoCodeId?: string | null;
  promoDiscount?: number;
  groupId?: string | null;
  allocationId?: string | null;
}

const CheckoutForm = ({
  eventId,
  cart,
  merchandiseCart,
  customerInfo,
  attendees = [],
  total,
  subtotal,
  theme,
  onSuccess,
  onCancel,
  bookingFeesEnabled = false,
  bookingFee = 0,
  currency = 'USD',
  promoCodeId = null,
  promoDiscount = 0,
  groupId = null,
  allocationId = null,
}: StripeCardFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [idempotencyKey] = useState(() => `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Error",
        description: "Please wait for Stripe to load",
        variant: "destructive"
      });
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast({
        title: "Error",
        description: "Card element not found",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare request body
      const requestBody = {
        eventId,
        total,
        subtotal,
        bookingFee,
        bookingFeesEnabled,
        promoCodeId,
        promoDiscount,
        groupId,
        allocationId,
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
        attendees,
        paymentMethod: 'card'
      };

      // Create payment intent
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: requestBody,
        headers: {
          'idempotency-key': idempotencyKey
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create payment intent');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data.client_secret) {
        throw new Error('No client secret received');
      }

      // Confirm card payment
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone || undefined,
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Payment failed');
      }

      if (paymentIntent?.status === 'succeeded') {
        toast({
          title: "Payment Successful!",
          description: "Your tickets are on the way to your email."
        });
        onSuccess(data.order_id);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: theme.headerTextColor || '#424770',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#dc2626',
        iconColor: '#dc2626',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className="p-4 border rounded-lg"
        style={{
          backgroundColor: theme.inputBackgroundColor,
          borderColor: theme.borderColor
        }}
      >
        <CardElement options={cardElementOptions} />
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1"
          style={{
            backgroundColor: theme.primaryColor,
            color: theme.buttonTextColor,
          }}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${total.toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  );
};

export const StripeCardForm: React.FC<StripeCardFormProps> = (props) => {
  const [loading, setLoading] = useState(true);

  // Use platform Stripe key for Stripe Connect
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

  const stripePromise = useMemo(() => {
    if (!publishableKey || typeof window === 'undefined') return null;
    return import('@stripe/stripe-js').then(({ loadStripe }) => loadStripe(publishableKey));
  }, [publishableKey]);

  useEffect(() => {
    // Just a brief delay to show loading state
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading payment...</p>
      </div>
    );
  }

  if (!publishableKey || !stripePromise) {
    return (
      <div className="p-4 border rounded-lg text-center text-red-600">
        <p>Payment system not configured.</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};
