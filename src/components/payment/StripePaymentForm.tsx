import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
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
  publishableKey: string;
  currency?: string;
}

const CheckoutForm = ({ 
  orderId,
  theme,
  customerInfo,
  onCancel,
  onSuccess,
  currency
}: { 
  orderId: string;
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

  console.log('🌍 Currency in CheckoutForm:', currency);
  
  const country = getCountryFromCurrency(currency);
  const needsPostalCode = requiresPostalCode(currency);
  
  console.log('🌍 Country determined:', country, 'Postal code required:', needsPostalCode);

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
        
      console.log("Return URL:", returnUrl);
      
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
        console.log("=== CAPTURING PAYMENT DETAILS ===");
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
          } else {
            console.log("✅ Payment details captured:", data);
          }
        } catch (captureError) {
          console.error("Payment details capture error:", captureError);
          // Don't fail the whole process
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
  total, 
  theme,
  onCancel,
  onSuccess,
  bookingFeesEnabled = false,
  subtotal = 0,
  bookingFee = 0,
  currency
}: StripePaymentFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Use useMemo to prevent recreating the stripe promise on every render
  const stripePromise = React.useMemo(() => loadStripe(publishableKey), [publishableKey]);

  // Create payment intent on component mount
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        console.log("=== CREATING PAYMENT INTENT ===");
        console.log("eventId:", eventId);
        console.log("total:", total);
        console.log("bookingFeesEnabled:", bookingFeesEnabled);
        console.log("subtotal:", subtotal);
        console.log("bookingFee:", bookingFee);

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

        // Create payment intent
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

        setClientSecret(data.client_secret);
        setOrderId(data.orderId);
        // Extract payment intent ID from client secret
        const piId = data.client_secret.split('_secret')[0];
        setPaymentIntentId(piId);
      } catch (error: any) {
        console.error("Payment intent creation error:", error);
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
  }, [eventId, total, bookingFeesEnabled, subtotal, bookingFee, cart, merchandiseCart, customerInfo, toast]);

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
        theme={theme}
        customerInfo={customerInfo}
        onCancel={onCancel}
        onSuccess={onSuccess}
        currency={currency}
      />
    </Elements>
  );
};