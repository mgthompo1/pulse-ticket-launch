import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface ReservationResult {
  success: boolean;
  reservation_id: string | null;
  available_quantity: number;
  error_message: string | null;
}

interface CartItem {
  id: string;
  quantity: number;
  [key: string]: any;
}

export const useTicketReservation = (eventId: string) => {
  const [sessionId] = useState(() => uuidv4());
  const [reservations, setReservations] = useState<string[]>([]);
  const [reservationExpiry, setReservationExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const cleanupRef = useRef<boolean>(false);

  // Timer for reservation countdown
  useEffect(() => {
    if (!reservationExpiry) return;

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((reservationExpiry.getTime() - now.getTime()) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Reservations expired
        setReservations([]);
        setReservationExpiry(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservationExpiry]);

  // Cleanup reservations on unmount
  useEffect(() => {
    return () => {
      if (reservations.length > 0 && !cleanupRef.current) {
        cleanupRef.current = true;
        cancelAllReservations();
      }
    };
  }, [reservations.length]);

  // Reserve tickets for a cart item
  const reserveTickets = async (
    ticketTypeId: string,
    quantity: number,
    customerEmail: string = ''
  ): Promise<ReservationResult> => {
    try {
      const { data, error } = await supabase.rpc('reserve_tickets', {
        p_event_id: eventId,
        p_ticket_type_id: ticketTypeId,
        p_quantity: quantity,
        p_session_id: sessionId,
        p_customer_email: customerEmail,
      });

      if (error) {
        console.error('Error reserving tickets:', error);
        return {
          success: false,
          reservation_id: null,
          available_quantity: 0,
          error_message: error.message,
        };
      }

      const result = data[0] as ReservationResult;

      if (result.success && result.reservation_id) {
        setReservations((prev) => [...prev, result.reservation_id!]);
        // Set expiry to 15 minutes from now
        setReservationExpiry(new Date(Date.now() + 15 * 60 * 1000));
      }

      return result;
    } catch (error: any) {
      console.error('Error reserving tickets:', error);
      return {
        success: false,
        reservation_id: null,
        available_quantity: 0,
        error_message: error.message,
      };
    }
  };

  // Complete all reservations (after successful payment)
  const completeAllReservations = async (orderId: string): Promise<boolean> => {
    try {
      const results = await Promise.all(
        reservations.map((reservationId) =>
          supabase.rpc('complete_reservation', {
            p_reservation_id: reservationId,
            p_order_id: orderId,
          })
        )
      );

      const allSuccessful = results.every((result) => !result.error && result.data === true);

      if (allSuccessful) {
        setReservations([]);
        setReservationExpiry(null);
        cleanupRef.current = true;
      }

      return allSuccessful;
    } catch (error) {
      console.error('Error completing reservations:', error);
      return false;
    }
  };

  // Cancel all reservations (if user abandons cart)
  const cancelAllReservations = useCallback(async () => {
    if (reservations.length === 0) return;

    try {
      const { error } = await supabase.rpc('cancel_reservation', {
        p_session_id: sessionId,
      });

      if (error) {
        console.error('Error canceling reservations:', error);
      } else {
        setReservations([]);
        setReservationExpiry(null);
      }
    } catch (error) {
      console.error('Error canceling reservations:', error);
    }
  }, [sessionId, reservations.length]);

  // Format time remaining for display
  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Check if reservations are active
  const hasActiveReservations = () => {
    return reservations.length > 0 && timeRemaining > 0;
  };

  // Reserve multiple items at once (for full cart)
  const reserveMultipleTickets = async (
    cart: CartItem[],
    customerEmail: string = ''
  ): Promise<{ success: boolean; failedItems: string[] }> => {
    const failedItems: string[] = [];

    for (const item of cart) {
      if (item.quantity > 0) {
        const result = await reserveTickets(item.id, item.quantity, customerEmail);
        if (!result.success) {
          failedItems.push(item.name || item.id);
        }
      }
    }

    return {
      success: failedItems.length === 0,
      failedItems,
    };
  };

  return {
    sessionId,
    reservations,
    reservationExpiry,
    timeRemaining,
    reserveTickets,
    reserveMultipleTickets,
    completeAllReservations,
    cancelAllReservations,
    formatTimeRemaining,
    hasActiveReservations,
  };
};
