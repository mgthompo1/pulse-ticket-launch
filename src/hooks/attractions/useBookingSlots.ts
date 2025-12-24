import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookingSlot, OperatingHours } from '@/types/attraction';

interface UseBookingSlotsOptions {
  attractionId: string;
  selectedDate: string;
  selectedResourceId: string | null;
  operatingHours?: OperatingHours | null;
  blackoutDates?: string[] | null;
}

interface UseBookingSlotsReturn {
  slots: BookingSlot[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  isDateBlackedOut: (date: string) => boolean;
  isWithinOperatingHours: (date: string, time: string) => boolean;
}

export function useBookingSlots({
  attractionId,
  selectedDate,
  selectedResourceId,
  operatingHours,
  blackoutDates
}: UseBookingSlotsOptions): UseBookingSlotsReturn {
  const { toast } = useToast();
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isDateBlackedOut = useCallback((date: string): boolean => {
    if (!blackoutDates || blackoutDates.length === 0) return false;
    return blackoutDates.includes(date);
  }, [blackoutDates]);

  const isWithinOperatingHours = useCallback((date: string, time: string): boolean => {
    if (!operatingHours) return true; // No operating hours = always open

    const dateObj = new Date(date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dateObj.getDay()];

    const dayHours = operatingHours[dayName];
    if (!dayHours || dayHours.closed) return false;

    // Compare times
    const timeNum = parseInt(time.replace(':', ''), 10);
    const openNum = parseInt(dayHours.open.replace(':', ''), 10);
    const closeNum = parseInt(dayHours.close.replace(':', ''), 10);

    return timeNum >= openNum && timeNum < closeNum;
  }, [operatingHours]);

  const loadSlots = useCallback(async () => {
    if (!attractionId || !selectedDate) return;

    // Check if date is blacked out
    if (isDateBlackedOut(selectedDate)) {
      setSlots([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('booking_slots')
        .select('*')
        .eq('attraction_id', attractionId)
        .eq('status', 'available')
        .gte('start_time', `${selectedDate}T00:00:00`)
        .lt('start_time', `${selectedDate}T23:59:59`)
        .order('start_time');

      if (selectedResourceId) {
        query = query.eq('resource_id', selectedResourceId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Filter out fully booked slots and check operating hours
      const availableSlots = (data || []).filter(slot => {
        // Check capacity
        if (slot.current_bookings >= slot.max_capacity) return false;

        // Check operating hours
        if (operatingHours) {
          const slotTime = new Date(slot.start_time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          if (!isWithinOperatingHours(selectedDate, slotTime)) return false;
        }

        return true;
      });

      setSlots(availableSlots);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load slots');
      setError(error);
      toast({
        title: 'Error',
        description: 'Failed to load available time slots',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [attractionId, selectedDate, selectedResourceId, operatingHours, isDateBlackedOut, isWithinOperatingHours, toast]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  return {
    slots,
    loading,
    error,
    reload: loadSlots,
    isDateBlackedOut,
    isWithinOperatingHours
  };
}
