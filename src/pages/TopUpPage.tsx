import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  CreditCard,
  DollarSign,
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface TopUpData {
  token: string;
  cardId: string;
  cardLast4: string;
  cardholderName: string;
  currentBalance: number;
  organizationName: string;
  expiresAt: string;
  isValid: boolean;
  isExpired: boolean;
  isUsed: boolean;
}

const PRESET_AMOUNTS = [25, 50, 100, 150];

const TopUpPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [topUpData, setTopUpData] = useState<TopUpData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    try {
      // Query the issuing_card_loads table to find the token
      const { data: loadData, error: loadError } = await supabase
        .from('issuing_card_loads')
        .select(`
          id,
          card_id,
          topup_token,
          topup_token_expires_at,
          topup_token_used_at,
          parent_email,
          issuing_cards (
            id,
            card_last4,
            cardholder_name,
            current_balance,
            card_status,
            organizations (
              name
            )
          )
        `)
        .eq('topup_token', token)
        .single();

      if (loadError || !loadData) {
        setError('Invalid or expired top-up link');
        return;
      }

      const card = loadData.issuing_cards as any;
      const expiresAt = new Date(loadData.topup_token_expires_at);
      const isExpired = expiresAt < new Date();
      const isUsed = !!loadData.topup_token_used_at;

      if (isExpired) {
        setError('This top-up link has expired');
        return;
      }

      if (isUsed) {
        setError('This top-up link has already been used');
        return;
      }

      if (card.card_status !== 'active') {
        setError('This card is no longer active');
        return;
      }

      setTopUpData({
        token: token!,
        cardId: card.id,
        cardLast4: card.card_last4,
        cardholderName: card.cardholder_name,
        currentBalance: card.current_balance,
        organizationName: card.organizations?.name || 'Organization',
        expiresAt: loadData.topup_token_expires_at,
        isValid: true,
        isExpired: false,
        isUsed: false,
      });
    } catch (err: any) {
      console.error('Error validating token:', err);
      setError('Failed to validate top-up link');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !topUpData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Invalid Link</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Please contact the organization for a new top-up link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Load Card Funds</h1>
          <p className="text-gray-600">{topUpData.organizationName}</p>
        </div>

        {/* Card Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Card Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Cardholder</p>
                  <p className="font-medium text-lg">{topUpData.cardholderName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Card</p>
                  <p className="font-mono text-lg">•••• {topUpData.cardLast4}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-1">Current Balance</p>
                <p className="text-3xl font-bold text-primary">
                  ${(topUpData.currentBalance / 100).toFixed(2)}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>Link expires:</strong>{' '}
                  {new Date(topUpData.expiresAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Elements stripe={stripePromise}>
          <PaymentForm topUpData={topUpData} />
        </Elements>
      </div>
    </div>
  );
};

interface PaymentFormProps {
  topUpData: TopUpData;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ topUpData }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newBalance, setNewBalance] = useState(0);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    if (value) {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed > 0) {
        setSelectedAmount(parsed);
      } else {
        setSelectedAmount(null);
      }
    } else {
      setSelectedAmount(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !selectedAmount) {
      return;
    }

    if (selectedAmount < 1) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum top-up amount is $1.00',
        variant: 'destructive',
      });
      return;
    }

    if (selectedAmount > 500) {
      toast({
        title: 'Invalid Amount',
        description: 'Maximum top-up amount is $500.00',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      // Get card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      // Call edge function to process payment
      const { data, error } = await supabase.functions.invoke('process-topup-payment', {
        body: {
          token: topUpData.token,
          amount: Math.round(selectedAmount * 100), // Convert to cents
        },
      });

      if (error) throw error;

      if (!data?.clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        setNewBalance(topUpData.currentBalance + Math.round(selectedAmount * 100));
        setSuccess(true);

        toast({
          title: 'Success!',
          description: `$${selectedAmount.toFixed(2)} loaded successfully`,
        });
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600">
                ${selectedAmount?.toFixed(2)} has been loaded onto the card
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">New Balance</p>
              <p className="text-3xl font-bold text-primary">
                ${(newBalance / 100).toFixed(2)}
              </p>
            </div>
            <div className="pt-4">
              <p className="text-sm text-gray-500">
                The funds are now available on the card for {topUpData.cardholderName}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Select Amount
        </CardTitle>
        <CardDescription>Choose how much to load onto the card</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preset amounts */}
          <div>
            <Label className="mb-3 block">Quick Select</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PRESET_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={selectedAmount === amount && !customAmount ? 'default' : 'outline'}
                  onClick={() => handleAmountSelect(amount)}
                  className="h-16 text-lg"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <Label htmlFor="customAmount">Custom Amount</Label>
            <div className="relative mt-2">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="customAmount"
                type="number"
                step="0.01"
                min="1"
                max="500"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum: $1.00 | Maximum: $500.00</p>
          </div>

          {/* Stripe Card Element */}
          <div>
            <Label className="mb-2 block">Payment Information</Label>
            <div className="border rounded-md p-3">
              <CardElement
                options={{
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
                }}
              />
            </div>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={!stripe || !selectedAmount || processing}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Load ${selectedAmount?.toFixed(2) || '0.00'}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Payments are processed securely through Stripe
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default TopUpPage;
