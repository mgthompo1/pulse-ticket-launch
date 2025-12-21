import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
// Stripe will be loaded dynamically when needed
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Theme } from '@/types/theme';

interface AttendeeInfo {
  attendee_name: string;
  attendee_email: string;
}

interface TaxData {
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  tax_name: string | null;
  tax_inclusive: boolean;
  tax_on_tickets: number;
  tax_on_addons: number;
  tax_on_donations: number;
  tax_on_fees: number;
  booking_fee: number;
  booking_fee_tax: number;
}

interface PaymentPlanInfo {
  id: string;
  name: string;
  plan_type: 'deposit' | 'installment';
  deposit_percentage: number | null;
  number_of_installments: number | null;
  payment_plan_fee_percentage: number;
  payment_plan_fee_fixed: number;
}

interface PaymentScheduleItem {
  installment_number: number;
  amount: number;
  due_date: Date;
  label: string;
}

interface StripePaymentFormProps {
  eventId: string;
  cart: any[];
  merchandiseCart: any[];
  customerInfo: any;
  attendees?: AttendeeInfo[];
  total: number;
  theme: Theme;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
  bookingFeesEnabled?: boolean;
  subtotal?: number;
  bookingFee?: number;
  publishableKey: string;
  currency?: string;
  promoCodeId?: string | null;
  promoDiscount?: number;
  taxData?: TaxData | null;
  groupId?: string | null;
  allocationId?: string | null;
  // Payment plan props
  paymentPlan?: PaymentPlanInfo | null;
  paymentSchedule?: PaymentScheduleItem[] | null;
}

const CheckoutForm = ({ 
  orderId,
  paymentIntentId,
  theme,
  customerInfo,
  onCancel,
  onSuccess,
  currency
}: { 
  orderId: string;
  paymentIntentId: string | null;
  theme: Theme;
  customerInfo: any;
  onCancel: () => void;
  onSuccess: (orderId: string) => void;
  currency?: string;
}) => {
  const [loading, setLoading] = useState(false);

  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  // Map currency to country code
  const getCountryFromCurrency = (currency?: string): string => {
    if (!currency) return 'US'; // Default to US if currency is undefined
    
    const currencyToCountry: { [key: string]: string } = {
      'USD': 'US',
      'CAD': 'CA',
      'GBP': 'GB',
      'EUR': 'DE', // Default to Germany for EUR
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

  const requiresPostalCode = (currency?: string): boolean => {
    if (!currency) return true; // Default to requiring postal code if currency is undefined
    
    // Only USD requires postal code collection in the UI
    return currency.toUpperCase() === 'USD';
  };

  const country = getCountryFromCurrency(currency);
  const needsPostalCode = requiresPostalCode(currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      // Confirm the payment with Payment Element  
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const returnUrl = isDev
        ? `http://localhost:${window.location.port}/payment-success?orderId=${orderId}`
        : `${window.location.origin}/payment-success?orderId=${orderId}`;

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: {
              name: customerInfo?.name || 'Customer',
              email: customerInfo?.email || '',
              phone: customerInfo?.phone || '',
              address: {
                country: country,
                ...(needsPostalCode ? {} : {
                  line1: null,
                  line2: null,
                  city: null,
                  state: null,
                  postal_code: null
                })
              }
            }
          }
        },
        redirect: 'if_required', // Only redirect for payment methods that require it
      });

      if (confirmError) {
        toast({
          title: "Payment Error",
          description: confirmError.message || "Payment failed",
          variant: "destructive"
        });
      } else {
        // Payment successful - capture payment details
        if (paymentIntentId && orderId) {
          try {
            // Capture payment details using the payment intent ID
            const { data, error } = await supabase.functions.invoke('capture-payment-details', {
              body: { 
                paymentIntentId: paymentIntentId,
                orderId: orderId 
              }
            });

            if (error) {
              console.error("Failed to capture payment details:", error);
              // Don't fail the whole process, just log the error
            }
          } catch (captureError) {
            console.error("Payment details capture error:", captureError);
            // Don't fail the whole process
          }
        }

        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        // Call success handler with the order ID
        onSuccess(orderId);
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
    <div className="max-h-[60vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payment Element - supports multiple payment methods */}
        <div className="border rounded-lg bg-gray-50/50 p-3">
          <PaymentElement 
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card'],
              fields: {
                billingDetails: {
                  name: 'never',
                  email: 'never',
                  phone: 'never',
                  address: needsPostalCode ? {
                    country: 'never',
                    line1: 'never',
                    line2: 'never',
                    city: 'never',
                    state: 'never',
                    postalCode: 'auto'
                  } : 'never'
                }
              },
              terms: {
                card: 'never'
              }
            }}
          />
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
    </div>
  );
};

export const StripePaymentForm = ({
  publishableKey,
  eventId,
  cart,
  merchandiseCart,
  customerInfo,
  attendees = [],
  total,
  theme,
  onCancel,
  onSuccess,
  bookingFeesEnabled = false,
  subtotal = 0,
  bookingFee = 0,
  currency,
  promoCodeId = null,
  promoDiscount = 0,
  taxData = null,
  groupId = null,
  allocationId = null,
  paymentPlan = null,
  paymentSchedule = null
}: StripePaymentFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [idempotencyKey] = useState(() => `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const { toast } = useToast();
  const paymentIntentCreated = React.useRef(false);
  
  // Use useMemo to prevent recreating the stripe promise on every render
  const stripePromise = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    return import('@stripe/stripe-js').then(({ loadStripe }) => loadStripe(publishableKey));
  }, [publishableKey]);

  // Create payment intent on component mount
  useEffect(() => {
    // Prevent duplicate calls
    if (paymentIntentCreated.current) {
      return;
    }

    const createPaymentIntent = async () => {
      try {
        paymentIntentCreated.current = true;

        console.log('🎯 StripePaymentForm creating payment intent with group tracking:', {
          groupId,
          allocationId,
          promoCodeId,
          promoDiscount,
          subtotal,
          total
        });

        // Prepare payment schedule for edge function (convert Date objects to ISO strings)
        const paymentScheduleForRequest = paymentSchedule?.map(item => ({
          ...item,
          due_date: item.due_date.toISOString()
        })) || null;

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
          taxData,
          // Payment plan info
          paymentPlan: paymentPlan ? {
            id: paymentPlan.id,
            name: paymentPlan.name,
            plan_type: paymentPlan.plan_type,
            deposit_percentage: paymentPlan.deposit_percentage,
            number_of_installments: paymentPlan.number_of_installments,
            payment_plan_fee_percentage: paymentPlan.payment_plan_fee_percentage,
            payment_plan_fee_fixed: paymentPlan.payment_plan_fee_fixed
          } : null,
          paymentSchedule: paymentScheduleForRequest,
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

        // Create payment intent with idempotency key
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: requestBody,
          headers: {
            'idempotency-key': idempotencyKey
          }
        });

        if (error) {
          console.error("Edge function error:", error);
          throw error;
        }

        if (data?.error) {
          console.error("Edge function returned error:", data.error);
          throw new Error(data.error);
        }

        if (!data.client_secret) {
          console.error("No client_secret in response");
          throw new Error("No client_secret returned from payment intent creation");
        }

        setClientSecret(data.client_secret);
        setOrderId(data.orderId);
        // Extract payment intent ID from client secret
        const piId = data.client_secret.split('_secret')[0];
        setPaymentIntentId(piId);
      } catch (error: any) {
        console.error("Payment intent creation error:", error);

        // Reset the ref so user can retry
        paymentIntentCreated.current = false;

        toast({
          title: "Error",
          description: error.message || "Failed to initialize payment",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2" style={{ color: theme.bodyTextColor }}>Initializing payment...</span>
      </div>
    );
  }

  if (!clientSecret || !orderId) {
    return (
      <div className="text-center py-8" style={{ color: theme.bodyTextColor }}>
        <p>Unable to initialize payment. Please try again.</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">
          Cancel
        </Button>
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
        },
      }}
    >
      <CheckoutForm 
        orderId={orderId}
        paymentIntentId={paymentIntentId}
        theme={theme}
        customerInfo={customerInfo}
        onCancel={onCancel}
        onSuccess={onSuccess}
        currency={currency}
      />
    </Elements>
  );
};