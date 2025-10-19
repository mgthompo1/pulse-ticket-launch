import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
// Stripe will be loaded dynamically when needed
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';

interface AttractionStripePaymentProps {
  amount: number;
  currency?: string;
  description: string;
  customerEmail: string;
  customerName: string;
  onSuccess: () => void;
  onError: (error: Error) => void;
  metadata?: Record<string, string>;
  theme?: {
    primary?: string;
    secondary?: string;
  };
}

const CheckoutForm = ({
  amount,
  currency = "USD",
  description,
  customerEmail,
  customerName,
  onSuccess,
  onError,
  metadata = {},
  theme = {}
}: AttractionStripePaymentProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [idempotencyKey] = useState(() => `attraction_${Date.now()}_${Math.random().toString(36).substring(7)}`);
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
      // Log the data being sent
      const paymentData = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        description,
        customer_email: customerEmail,
        customer_name: customerName,
        metadata
      };
      
      console.log("=== SENDING PAYMENT DATA ===");
      console.log("Payment data:", paymentData);
      console.log("Organization ID:", metadata?.organization_id);

      // Create payment intent with idempotency key
      console.log("=== IDEMPOTENCY KEY ===", idempotencyKey);
      const { data: paymentIntent, error: piError } = await supabase.functions.invoke('create-payment-intent', {
        body: paymentData,
        headers: {
          'idempotency-key': idempotencyKey
        }
      });

      console.log("=== PAYMENT INTENT RESPONSE ===");
      console.log("Payment intent data:", paymentIntent);
      console.log("Payment intent error:", piError);

      if (piError || !paymentIntent?.client_secret) {
        throw new Error(piError?.message || 'Failed to create payment intent');
      }

      // Confirm payment
      const { error: confirmError } = await stripe.confirmCardPayment(paymentIntent.client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerName,
            email: customerEmail,
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Payment failed');
      }

      toast({
        title: "Payment Successful!",
        description: "Your payment has been processed successfully."
      });

      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      onError(error instanceof Error ? error : new Error('Payment failed'));
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement options={cardElementOptions} />
      </div>
      
      <div className="flex gap-3">
        <Button 
          type="submit" 
          disabled={!stripe || loading} 
          className="flex-1"
          style={{ 
            backgroundColor: theme.primary || '#3b82f6',
            borderColor: theme.primary || '#3b82f6'
          }}
        >
          {loading ? "Processing..." : `Pay $${amount.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
};

export const AttractionStripePayment: React.FC<AttractionStripePaymentProps> = (props) => {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStripeConfig = async () => {
      try {
        // Get the organization ID from the metadata
        const organizationId = props.metadata?.organization_id;
        if (!organizationId) {
          console.error('No organization ID provided');
          setLoading(false);
          return;
        }

        // Load payment credentials from the database
        const { data: credData, error } = await supabase
          .from('payment_credentials')
          .select('stripe_publishable_key')
          .eq('organization_id', organizationId)
          .single();

        if (error) {
          console.error('Error loading payment credentials:', error);
          setLoading(false);
          return;
        }

        if (credData?.stripe_publishable_key) {
          setPublishableKey(credData.stripe_publishable_key);
        }
      } catch (error) {
        console.error('Error loading Stripe configuration:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStripeConfig();
  }, [props.metadata?.organization_id]);

  const stripePromise = useMemo(() => {
    if (!publishableKey || typeof window === 'undefined') return null;
    return import('@stripe/stripe-js').then(({ loadStripe }) => loadStripe(publishableKey));
  }, [publishableKey]);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg text-center">
        <p>Loading payment system...</p>
      </div>
    );
  }

  if (!publishableKey || !stripePromise) {
    return (
      <div className="p-4 border rounded-lg text-center text-red-600">
        <p>Payment system not configured. Please set up Stripe in your payment settings.</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};
