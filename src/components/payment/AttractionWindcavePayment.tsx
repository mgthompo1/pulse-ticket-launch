/**
 * AttractionWindcavePayment - Windcave payment for attraction bookings
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WindcaveHostedFields } from './WindcaveHostedFields';
import { Loader2, AlertCircle } from 'lucide-react';

interface AttractionWindcavePaymentProps {
  attractionId: string;
  bookingId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  onSuccess: (sessionId: string) => void;
  onError: (error: Error) => void;
  theme?: {
    primary?: string;
  };
}

export const AttractionWindcavePayment: React.FC<AttractionWindcavePaymentProps> = ({
  attractionId,
  bookingId,
  amount,
  currency,
  description,
  customerEmail,
  customerName,
  onSuccess,
  onError,
  theme,
}) => {
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attractionData, setAttractionData] = useState<any>(null);

  useEffect(() => {
    createWindcaveSession();
  }, [attractionId, amount]);

  const createWindcaveSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get attraction data for organization info
      const { data: attraction, error: attractionError } = await supabase
        .from('attractions')
        .select(`
          *,
          organizations!inner(
            payment_provider,
            currency,
            windcave_endpoint
          )
        `)
        .eq('id', attractionId)
        .single();

      if (attractionError || !attraction) {
        throw new Error('Failed to load attraction details');
      }

      setAttractionData({
        organizations: attraction.organizations,
      });

      // Create Windcave session via edge function
      const { data, error: sessionError } = await supabase.functions.invoke('windcave-session', {
        body: {
          attractionId,
          bookingId,
          isAttraction: true,
          items: [
            {
              type: 'attraction_booking',
              id: bookingId,
              price: amount,
              quantity: 1,
              description,
            },
          ],
          customerInfo: {
            name: customerName,
            email: customerEmail,
          },
        },
      });

      if (sessionError) {
        console.error('Windcave session error:', sessionError);
        throw new Error(sessionError.message || 'Failed to create payment session');
      }

      if (!data || !data.sessionId) {
        throw new Error('Invalid response from payment service');
      }

      setSessionData({
        sessionId: data.sessionId,
        links: data.links,
        totalAmount: amount,
        orderId: data.orderId || bookingId,
      });

    } catch (err) {
      console.error('Windcave initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      onError(err instanceof Error ? err : new Error('Failed to initialize payment'));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      // Verify payment status via edge function
      const { data, error } = await supabase.functions.invoke('windcave-dropin-success', {
        body: {
          sessionId,
          bookingId,
          isAttraction: true,
        },
      });

      if (error) {
        throw new Error('Payment verification failed');
      }

      onSuccess(sessionId);
    } catch (err) {
      console.error('Payment verification error:', err);
      onError(err instanceof Error ? err : new Error('Payment verification failed'));
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    onError(new Error(errorMessage));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3">Initializing secure payment...</span>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error || 'Failed to initialize payment'}</span>
        </div>
        <button
          onClick={createWindcaveSession}
          className="mt-3 text-sm text-red-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <WindcaveHostedFields
      sessionData={sessionData}
      onSuccess={handlePaymentSuccess}
      onError={handlePaymentError}
      isProcessing={false}
      eventData={attractionData}
    />
  );
};

export default AttractionWindcavePayment;
