import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AttractionData,
  BookingSlot,
  BookingFormData,
  PaymentProvider,
  generateBookingReference
} from '@/types/attraction';

// Extend Window to include Windcave types
declare global {
  interface Window {
    WindcavePayments?: {
      DropIn: {
        create: (config: any) => any;
      };
    };
    windcaveDropIn?: any;
  }
}

interface UseAttractionPaymentOptions {
  attractionData: AttractionData | null;
  selectedSlot: BookingSlot | null;
  bookingForm: BookingFormData;
  totalPrice: number;
  paymentProvider: PaymentProvider;
}

interface UseAttractionPaymentReturn {
  pendingBookingId: string | null;
  windcaveSessionData: any;
  isProcessing: boolean;
  isInitializingWindcave: boolean;
  createPendingBooking: () => Promise<string | null>;
  handlePaymentSuccess: () => Promise<void>;
  handlePaymentError: (error: Error) => void;
  initializeWindcave: () => Promise<void>;
  loadWindcaveScripts: (endpoint: string) => Promise<void>;
  resetPayment: () => void;
}

export function useAttractionPayment({
  attractionData,
  selectedSlot,
  bookingForm,
  totalPrice,
  paymentProvider
}: UseAttractionPaymentOptions): UseAttractionPaymentReturn {
  const { toast } = useToast();
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [windcaveSessionData, setWindcaveSessionData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializingWindcave, setIsInitializingWindcave] = useState(false);
  const windcaveScriptsLoaded = useRef(false);

  // Load Windcave scripts
  const loadWindcaveScripts = useCallback(async (endpoint: string): Promise<void> => {
    if (windcaveScriptsLoaded.current) return;

    return new Promise((resolve, reject) => {
      const baseUrl = endpoint === 'SEC' ? 'https://sec.windcave.com' : 'https://uat.windcave.com';
      const scripts = [
        '/js/lib/drop-in-v1.js',
        '/js/windcavepayments-dropin-v1.js',
        '/js/lib/hosted-fields-v1.js',
        '/js/windcavepayments-hostedfields-v1.js',
        '/js/windcavepayments-applepay-v1.js',
        '/js/windcavepayments-googlepay-v1.js'
      ];

      // Check if already loaded
      const existingScripts = Array.from(document.head.querySelectorAll('script'))
        .filter(script => script.src.includes('windcave'));

      if (existingScripts.length > 0) {
        windcaveScriptsLoaded.current = true;
        resolve();
        return;
      }

      let loadedCount = 0;
      const totalScripts = scripts.length;

      scripts.forEach((scriptPath) => {
        const script = document.createElement('script');
        script.src = baseUrl + scriptPath;
        script.async = true;
        script.onload = () => {
          loadedCount++;
          if (loadedCount === totalScripts) {
            windcaveScriptsLoaded.current = true;
            resolve();
          }
        };
        script.onerror = (error) => {
          toast({
            title: 'Script Loading Error',
            description: `Failed to load payment script. Please refresh and try again.`,
            variant: 'destructive'
          });
          reject(error);
        };
        document.head.appendChild(script);
      });
    });
  }, [toast]);

  // Initialize Windcave Drop-In
  const initializeWindcave = useCallback(async (retryCount = 0) => {
    if (!windcaveSessionData || !window.WindcavePayments) {
      console.error('Windcave session data or WindcavePayments not available');
      return;
    }

    const container = document.getElementById('windcave-drop-in');
    if (!container) {
      if (retryCount < 10) {
        setTimeout(() => initializeWindcave(retryCount + 1), 100);
        return;
      }
      toast({
        title: 'Payment Setup Error',
        description: 'Payment form container not found. Please refresh and try again.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsInitializingWindcave(true);

      const dropIn = window.WindcavePayments.DropIn.create({
        ...windcaveSessionData,
        container: 'windcave-drop-in',
        onSuccess: async (status: string) => {
          if (status === 'done') {
            if (window.windcaveDropIn) {
              window.windcaveDropIn.close();
              window.windcaveDropIn = null;
            }
            return;
          }
          await handlePaymentSuccess();
        },
        onError: (error: any) => {
          handlePaymentError(new Error(error.message || 'Payment failed'));
        },
        options: {
          enableAutoComplete: true,
          enableSecureForm: true,
          enableFormValidation: true,
          enableCardValidation: true,
          enableCardFormatting: true
        }
      });

      window.windcaveDropIn = dropIn;
    } catch (error) {
      console.error('Error initializing Windcave Drop-In:', error);
      toast({
        title: 'Payment Setup Error',
        description: 'Failed to initialize payment form. Please refresh and try again.',
        variant: 'destructive'
      });
    } finally {
      setIsInitializingWindcave(false);
    }
  }, [windcaveSessionData, toast]);

  // Create Windcave session for booking
  const createWindcaveSession = useCallback(async (bookingId: string) => {
    if (!bookingId || !attractionData) return;

    try {
      const customerInfo = {
        name: bookingForm.customerName,
        email: bookingForm.customerEmail,
        phone: bookingForm.customerPhone
      };

      const bookingItems = [{
        id: bookingId,
        name: `${attractionData.name} - Booking`,
        quantity: bookingForm.partySize,
        price: totalPrice,
        type: 'attraction_booking'
      }];

      const { data, error } = await supabase.functions.invoke('windcave-session', {
        body: {
          attractionId: attractionData.id,
          bookingId: bookingId,
          items: bookingItems,
          customerInfo: customerInfo,
          isAttraction: true
        }
      });

      if (error) throw error;

      setWindcaveSessionData(data);
    } catch (error) {
      console.error('Error creating Windcave session:', error);
      toast({
        title: 'Payment Setup Error',
        description: 'Failed to initialize payment. Please try again.',
        variant: 'destructive'
      });
    }
  }, [attractionData, bookingForm, totalPrice, toast]);

  // Create pending booking
  const createPendingBooking = useCallback(async (): Promise<string | null> => {
    if (!bookingForm.selectedSlotId || !attractionData || !selectedSlot) {
      return null;
    }

    setIsProcessing(true);

    try {
      if (!attractionData.organization_id) {
        throw new Error('Missing organization information');
      }

      const totalAmount = (selectedSlot.price_override ?? attractionData.base_price) * bookingForm.partySize;
      const bookingReference = generateBookingReference();

      const bookingData = {
        attraction_id: attractionData.id,
        booking_slot_id: bookingForm.selectedSlotId,
        organization_id: attractionData.organization_id,
        customer_name: bookingForm.customerName,
        customer_email: bookingForm.customerEmail,
        customer_phone: bookingForm.customerPhone || null,
        party_size: bookingForm.partySize,
        special_requests: bookingForm.specialRequests || null,
        total_amount: totalAmount,
        payment_status: 'pending',
        booking_status: 'pending',
        booking_reference: bookingReference
      };

      let createdBookingId: string;

      try {
        // Try Edge Function first
        const { data, error } = await supabase.functions.invoke('create-attraction-booking', {
          body: bookingData
        });

        if (error) throw error;
        if (!data.booking) throw new Error('No booking data returned');

        createdBookingId = data.booking.id;
      } catch (functionError) {
        console.warn('Edge Function failed, falling back to direct insert:', functionError);

        // Fallback to direct database insert
        const { data: directData, error: directError } = await supabase
          .from('attraction_bookings')
          .insert(bookingData)
          .select()
          .single();

        if (directError) {
          throw new Error(`Booking creation failed: ${directError.message}`);
        }

        createdBookingId = directData.id;
      }

      setPendingBookingId(createdBookingId);

      // For Windcave, create session
      if (paymentProvider === 'windcave') {
        await createWindcaveSession(createdBookingId);
      }

      toast({
        title: 'Booking Created',
        description: 'Please complete payment to confirm your booking'
      });

      return createdBookingId;
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create booking',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [attractionData, selectedSlot, bookingForm, paymentProvider, createWindcaveSession, toast]);

  // Handle payment success
  const handlePaymentSuccess = useCallback(async () => {
    if (!pendingBookingId || !selectedSlot) return;

    try {
      // Update booking status
      await supabase
        .from('attraction_bookings')
        .update({
          payment_status: 'paid',
          booking_status: 'confirmed'
        })
        .eq('id', pendingBookingId);

      // Update slot booking count
      await supabase
        .from('booking_slots')
        .update({
          current_bookings: selectedSlot.current_bookings + bookingForm.partySize
        })
        .eq('id', selectedSlot.id);

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-booking-email', {
          body: { bookingId: pendingBookingId }
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      toast({
        title: 'Payment Successful!',
        description: 'Your booking has been confirmed!'
      });
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast({
        title: 'Error',
        description: 'Payment was successful but there was an issue confirming your booking. Please contact support.',
        variant: 'destructive'
      });
    }
  }, [pendingBookingId, selectedSlot, bookingForm.partySize, toast]);

  // Handle payment error
  const handlePaymentError = useCallback((error: Error) => {
    console.error('Payment failed:', error);
    toast({
      title: 'Payment Failed',
      description: error.message || 'Please try again',
      variant: 'destructive'
    });
  }, [toast]);

  // Reset payment state
  const resetPayment = useCallback(() => {
    setPendingBookingId(null);
    setWindcaveSessionData(null);
    setIsProcessing(false);
    setIsInitializingWindcave(false);
  }, []);

  // Auto-initialize Windcave when session data is available
  useEffect(() => {
    if (windcaveSessionData && paymentProvider === 'windcave' && window.WindcavePayments) {
      const timer = setTimeout(initializeWindcave, 100);
      return () => clearTimeout(timer);
    }
  }, [windcaveSessionData, paymentProvider, initializeWindcave]);

  return {
    pendingBookingId,
    windcaveSessionData,
    isProcessing,
    isInitializingWindcave,
    createPendingBooking,
    handlePaymentSuccess,
    handlePaymentError,
    initializeWindcave,
    loadWindcaveScripts,
    resetPayment
  };
}
