/**
 * useAvailabilityV3 - Availability fetching with polling
 * Fetches calendar availability and time slots with 30-second refresh
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DateAvailability,
  EnhancedBookingSlot,
  TimeSlotGroup,
  getAvailabilityLevel,
  groupSlotsByTimeOfDay,
} from '@/types/attraction-v3';

interface UseAvailabilityV3Props {
  attractionId: string;
  resourceId?: string | null;
  startDate?: string;
  endDate?: string;
  partySize?: number;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseAvailabilityV3Return {
  // Calendar availability
  availability: Map<string, DateAvailability>;
  availabilityArray: DateAvailability[];

  // Time slots for selected date
  slots: EnhancedBookingSlot[];
  groupedSlots: TimeSlotGroup[];

  // Loading states
  isLoadingCalendar: boolean;
  isLoadingSlots: boolean;

  // Errors
  calendarError: Error | null;
  slotsError: Error | null;

  // Actions
  refetchCalendar: () => void;
  refetchSlots: () => void;
  setSelectedDate: (date: string) => void;

  // Meta
  lastUpdated: Date | null;
}

const DEFAULT_POLLING_INTERVAL = 30000; // 30 seconds

export function useAvailabilityV3({
  attractionId,
  resourceId,
  startDate,
  endDate,
  partySize = 1,
  pollingInterval = DEFAULT_POLLING_INTERVAL,
  enabled = true,
}: UseAvailabilityV3Props): UseAvailabilityV3Return {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const lastUpdatedRef = useRef<Date | null>(null);

  // Calculate date range if not provided
  const dateRange = useMemo(() => {
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      return d.toISOString().split('T')[0];
    })();
    return { start, end };
  }, [startDate, endDate]);

  // Fetch calendar availability
  const {
    data: calendarData,
    isLoading: isLoadingCalendar,
    error: calendarError,
    refetch: refetchCalendar,
  } = useQuery({
    queryKey: ['availability-calendar-v3', attractionId, resourceId, dateRange.start, dateRange.end, partySize],
    queryFn: async () => {
      // Fetch slots aggregated by date
      const { data, error } = await supabase
        .from('attraction_booking_slots')
        .select(`
          id,
          slot_date,
          start_time,
          max_capacity,
          current_bookings,
          price_override,
          resource_id
        `)
        .eq('attraction_id', attractionId)
        .gte('slot_date', dateRange.start)
        .lte('slot_date', dateRange.end)
        .eq('is_active', true)
        .order('slot_date', { ascending: true });

      if (error) throw error;

      // Aggregate by date
      const dateMap = new Map<string, { slotsAvailable: number; totalSlots: number; lowestPrice?: number }>();

      (data || []).forEach((slot) => {
        // Filter by resource if specified
        if (resourceId && slot.resource_id !== resourceId) return;

        const available = (slot.max_capacity || 0) - (slot.current_bookings || 0);
        if (available < partySize) return; // Skip if not enough capacity

        const current = dateMap.get(slot.slot_date) || { slotsAvailable: 0, totalSlots: 0 };
        current.slotsAvailable += 1;
        current.totalSlots += 1;

        if (slot.price_override) {
          if (!current.lowestPrice || slot.price_override < current.lowestPrice) {
            current.lowestPrice = slot.price_override;
          }
        }

        dateMap.set(slot.slot_date, current);
      });

      lastUpdatedRef.current = new Date();
      return dateMap;
    },
    enabled: enabled && !!attractionId,
    refetchInterval: pollingInterval,
    staleTime: pollingInterval / 2,
  });

  // Fetch time slots for selected date
  const {
    data: slotsData,
    isLoading: isLoadingSlots,
    error: slotsError,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['availability-slots-v3', attractionId, resourceId, selectedDate, partySize],
    queryFn: async () => {
      if (!selectedDate) return [];

      const query = supabase
        .from('attraction_booking_slots')
        .select(`
          id,
          slot_date,
          start_time,
          end_time,
          max_capacity,
          current_bookings,
          price_override,
          resource_id,
          attraction_resources (
            id,
            name,
            photo_url,
            specialties
          )
        `)
        .eq('attraction_id', attractionId)
        .eq('slot_date', selectedDate)
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      // Filter by resource if specified
      if (resourceId) {
        query.eq('resource_id', resourceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to EnhancedBookingSlot
      const slots: EnhancedBookingSlot[] = (data || [])
        .map((slot) => {
          const available = (slot.max_capacity || 0) - (slot.current_bookings || 0);
          const resource = slot.attraction_resources as any;

          return {
            id: slot.id,
            date: slot.slot_date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            available_spots: available,
            total_spots: slot.max_capacity || 0,
            price: slot.price_override,
            is_available: available >= partySize,
            urgency_level: getUrgencyLevel(available, slot.max_capacity || 10),
            resource_id: slot.resource_id,
            resource_name: resource?.name,
            resource_photo: resource?.photo_url,
          };
        })
        .filter((slot) => slot.is_available);

      return slots;
    },
    enabled: enabled && !!attractionId && !!selectedDate,
    refetchInterval: pollingInterval,
    staleTime: pollingInterval / 2,
  });

  // Build availability map
  const availability = useMemo(() => {
    const map = new Map<string, DateAvailability>();

    if (calendarData) {
      calendarData.forEach((value, date) => {
        map.set(date, {
          date,
          level: getAvailabilityLevel(value.slotsAvailable),
          slotsAvailable: value.slotsAvailable,
          lowestPrice: value.lowestPrice,
        });
      });
    }

    return map;
  }, [calendarData]);

  const availabilityArray = useMemo(() => {
    return Array.from(availability.values());
  }, [availability]);

  // Group slots by time of day
  const groupedSlots = useMemo(() => {
    return groupSlotsByTimeOfDay(slotsData || []);
  }, [slotsData]);

  return {
    availability,
    availabilityArray,
    slots: slotsData || [],
    groupedSlots,
    isLoadingCalendar,
    isLoadingSlots,
    calendarError: calendarError as Error | null,
    slotsError: slotsError as Error | null,
    refetchCalendar,
    refetchSlots,
    setSelectedDate,
    lastUpdated: lastUpdatedRef.current,
  };
}

// Helper to determine urgency level
function getUrgencyLevel(available: number, total: number): 'low' | 'medium' | 'high' | 'critical' {
  const percentage = (available / total) * 100;

  if (percentage <= 10 || available <= 2) return 'critical';
  if (percentage <= 25 || available <= 5) return 'high';
  if (percentage <= 50) return 'medium';
  return 'low';
}

export default useAvailabilityV3;
