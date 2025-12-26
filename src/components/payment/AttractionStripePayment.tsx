import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Lock, Loader2 } from 'lucide-react';

interface AttractionStripePaymentProps {
  amount: number;
  currency?: string;
  description: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  onSuccess: () => void;
  onError: (error: Error) => void;
  metadata?: Record<string, string>;
  theme?: {
    primary?: string;
    secondary?: string;
  };
}

// Map currency to country code for billing
const getCountryFromCurrency = (currency: string): string => {
  const currencyToCountry: { [key: string]: string } = {
    'USD': 'US',
    'CAD': 'CA',
    'GBP': 'GB',
    'EUR': 'DE',
    'AUD': 'AU',
    'NZD': 'NZ',
    'JPY': 'JP',
    'SGD': 'SG',
    'CHF': 'CH',
    'SEK': 'SE',
    'NOK': 'NO',
    'DKK': 'DK'
  };
  return currencyToCountry[currency.toUpperCase()] || 'US';
};

const CheckoutForm = ({
  amount,
  currency = "USD",
  customerEmail,
  customerName,
  customerPhone,
  onSuccess,
  onError,
  theme = {}
}: AttractionStripePaymentProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const { toast } = useToast();

  const country = getCountryFromCurrency(currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Error",
        description: "Please wait for the payment form to load",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Build return URL for redirect-based payment methods
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const returnUrl = isDev
        ? `http://localhost:${window.location.port}/payment-success`
        : `${window.location.origin}/payment-success`;

      // Confirm payment using the modern PaymentElement API
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: {
              name: customerName,
              email: customerEmail,
              phone: customerPhone || undefined,
              address: {
                country: country,
              }
            }
          }
        },
        redirect: 'if_required', // Only redirect for payment methods that require it (like bank redirects)
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Payment failed');
      }

      toast({
        title: "Payment Successful!",
        description: "Your booking has been confirmed."
      });

      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : 'An error occurred during payment',
        variant: "destructive"
      });
      onError(error instanceof Error ? error : new Error('Payment failed'));
    } finally {
      setLoading(false);
    }
  };

  // Format currency for display
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Payment Element - Modern Stripe UI with multiple payment methods */}
      <div className="border border-border rounded-lg bg-card p-4">
        <PaymentElement
          onReady={() => setPaymentReady(true)}
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
            fields: {
              billingDetails: {
                name: 'never',
                email: 'never',
                phone: 'never',
                address: {
                  country: 'never',
                  line1: 'never',
                  line2: 'never',
                  city: 'never',
                  state: 'never',
                  postalCode: 'auto' // Only show postal code if needed
                }
              }
            },
            terms: {
              card: 'never'
            }
          }}
        />
      </div>

      {/* Pay Button */}
      <Button
        type="submit"
        disabled={!stripe || !paymentReady || loading}
        className="w-full py-6 text-base font-semibold"
        style={{
          backgroundColor: theme.primary || undefined,
          borderColor: theme.primary || undefined
        }}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pay {formatAmount(amount, currency)}
          </span>
        )}
      </Button>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5" />
        <span>Secured by Stripe</span>
      </div>
    </form>
  );
};

export const AttractionStripePayment: React.FC<AttractionStripePaymentProps> = (props) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => `attraction_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const paymentIntentCreated = React.useRef(false);

  // Load Stripe config and create payment intent
  useEffect(() => {
    if (paymentIntentCreated.current) return;

    const initializePayment = async () => {
      try {
        paymentIntentCreated.current = true;

        // Get the organization ID from the metadata
        const organizationId = props.metadata?.organization_id;
        if (!organizationId) {
          setError('Organization not configured for payments');
          setLoading(false);
          return;
        }

        // Load payment credentials from the database
        const { data: credData, error: credError } = await supabase
          .from('payment_credentials')
          .select('stripe_publishable_key')
          .eq('organization_id', organizationId)
          .single();

        if (credError || !credData?.stripe_publishable_key) {
          setError('Payment system not configured. Please set up Stripe in your payment settings.');
          setLoading(false);
          return;
        }

        setPublishableKey(credData.stripe_publishable_key);

        // Create payment intent
        const paymentData = {
          amount: Math.round(props.amount * 100), // Convert to cents
          currency: (props.currency || 'USD').toLowerCase(),
          description: props.description,
          customer_email: props.customerEmail,
          customer_name: props.customerName,
          metadata: props.metadata || {}
        };

        console.log('Creating payment intent for attraction:', paymentData);

        const { data: paymentIntent, error: piError } = await supabase.functions.invoke('create-payment-intent', {
          body: paymentData,
          headers: {
            'idempotency-key': idempotencyKey
          }
        });

        if (piError || !paymentIntent?.client_secret) {
          throw new Error(piError?.message || 'Failed to create payment intent');
        }

        setClientSecret(paymentIntent.client_secret);
      } catch (err) {
        console.error('Payment initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize payment');
        paymentIntentCreated.current = false; // Allow retry
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [props.metadata?.organization_id, props.amount, props.currency, props.description, props.customerEmail, props.customerName, idempotencyKey]);

  const stripePromise = useMemo(() => {
    if (!publishableKey || typeof window === 'undefined') return null;
    return import('@stripe/stripe-js').then(({ loadStripe }) => loadStripe(publishableKey));
  }, [publishableKey]);

  if (loading) {
    return (
      <div className="p-6 border border-border rounded-lg bg-card text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-muted-foreground">Initializing secure payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-destructive/50 rounded-lg bg-destructive/5 text-center">
        <p className="text-destructive font-medium">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            paymentIntentCreated.current = false;
            setLoading(true);
            setError(null);
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="p-6 border border-border rounded-lg bg-card text-center">
        <p className="text-muted-foreground">Unable to initialize payment. Please try again.</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: props.theme?.primary || '#3b82f6',
            borderRadius: '8px',
          },
        },
      }}
    >
      <CheckoutForm {...props} />
    </Elements>
  );
};
