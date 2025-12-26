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
  timezone?: string; // Attraction's timezone (e.g., 'Pacific/Auckland')
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

// Helper to get date in a specific timezone
function getDateInTimezone(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: timezone }); // Returns YYYY-MM-DD
}

// Helper to get time in a specific timezone
function getTimeInTimezone(date: Date, timezone: string): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function useAvailabilityV3({
  attractionId,
  resourceId,
  startDate,
  endDate,
  partySize = 1,
  pollingInterval = DEFAULT_POLLING_INTERVAL,
  enabled = true,
  timezone = 'Pacific/Auckland', // Default to NZ
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
      // Fetch slots aggregated by date from booking_slots table
      const { data, error } = await supabase
        .from('booking_slots')
        .select(`
          id,
          start_time,
          end_time,
          max_capacity,
          current_bookings,
          price_override,
          resource_id,
          status
        `)
        .eq('attraction_id', attractionId)
        .gte('start_time', `${dateRange.start}T00:00:00`)
        .lte('start_time', `${dateRange.end}T23:59:59`)
        .eq('status', 'available')
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Aggregate by date
      const dateMap = new Map<string, { slotsAvailable: number; totalSlots: number; lowestPrice?: number }>();

      (data || []).forEach((slot) => {
        // Filter by resource if specified
        if (resourceId && slot.resource_id !== resourceId) return;

        const available = (slot.max_capacity || 0) - (slot.current_bookings || 0);
        if (available < partySize) return; // Skip if not enough capacity

        // Get date in the attraction's timezone (not browser timezone)
        const normalizedTime = slot.start_time
          .replace(' ', 'T')
          .replace(/\+00$/, 'Z')
          .replace(/\+00:00$/, 'Z');
        const slotDate = getDateInTimezone(new Date(normalizedTime), timezone);

        const current = dateMap.get(slotDate) || { slotsAvailable: 0, totalSlots: 0 };
        current.slotsAvailable += 1;
        current.totalSlots += 1;

        if (slot.price_override) {
          if (!current.lowestPrice || slot.price_override < current.lowestPrice) {
            current.lowestPrice = slot.price_override;
          }
        }

        dateMap.set(slotDate, current);
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

      // Query a wider range to account for timezone differences
      // Then filter client-side by local date
      const queryStartDate = new Date(selectedDate);
      queryStartDate.setDate(queryStartDate.getDate() - 1);
      const queryEndDate = new Date(selectedDate);
      queryEndDate.setDate(queryEndDate.getDate() + 1);

      let query = supabase
        .from('booking_slots')
        .select(`
          id,
          start_time,
          end_time,
          max_capacity,
          current_bookings,
          price_override,
          resource_id,
          status,
          attraction_resources (
            id,
            name,
            photo_url,
            specialties
          )
        `)
        .eq('attraction_id', attractionId)
        .gte('start_time', queryStartDate.toISOString())
        .lt('start_time', queryEndDate.toISOString())
        .eq('status', 'available')
        .order('start_time', { ascending: true });

      // Filter by resource if specified
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Debug: log what we got from the database
      const debugSlots = data?.map(s => {
        const normalized = s.start_time.replace(' ', 'T').replace(/\+00$/, 'Z').replace(/\+00:00$/, 'Z');
        const slotDate = new Date(normalized);
        return {
          start_time_raw: s.start_time,
          attractionDate: getDateInTimezone(slotDate, timezone),
          attractionTime: getTimeInTimezone(slotDate, timezone),
          matchesSelected: getDateInTimezone(slotDate, timezone) === selectedDate
        };
      });
      console.log('Slots query result:', {
        selectedDate,
        attractionTimezone: timezone,
        slotsReturned: data?.length,
        slotsMatchingDate: debugSlots?.filter(s => s.matchesSelected).length,
        firstFewSlots: debugSlots?.slice(0, 10)
      });

      // Transform to EnhancedBookingSlot
      const slots: EnhancedBookingSlot[] = (data || [])
        .map((slot) => {
          const spotsLeft = (slot.max_capacity || 0) - (slot.current_bookings || 0);
          const resource = slot.attraction_resources as any;

          // Normalize timestamp format for proper Date parsing
          const normalizedStartTime = slot.start_time
            .replace(' ', 'T')
            .replace(/\+00$/, 'Z')
            .replace(/\+00:00$/, 'Z');
          const normalizedEndTime = slot.end_time
            .replace(' ', 'T')
            .replace(/\+00$/, 'Z')
            .replace(/\+00:00$/, 'Z');

          // Get date/time in the attraction's timezone for filtering and display
          const startDate = new Date(normalizedStartTime);
          const endDate = new Date(normalizedEndTime);
          const slotAttractionDate = getDateInTimezone(startDate, timezone);

          // Get hour in attraction timezone for grouping (morning/afternoon/evening)
          const hourInAttractionTz = parseInt(
            startDate.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })
          );

          return {
            id: slot.id,
            attraction_id: attractionId,
            resource_id: slot.resource_id,
            start_time: normalizedStartTime,
            end_time: normalizedEndTime,
            // Add display-ready times in attraction timezone
            display_start_time: getTimeInTimezone(startDate, timezone),
            display_end_time: getTimeInTimezone(endDate, timezone),
            _hour_in_tz: hourInAttractionTz, // For morning/afternoon/evening grouping
            status: slot.status as 'available' | 'booked' | 'blocked' | 'maintenance',
            max_capacity: slot.max_capacity || 0,
            current_bookings: slot.current_bookings || 0,
            spots_left: spotsLeft,
            price: slot.price_override ?? 0,
            price_override: slot.price_override,
            urgency_level: getUrgencyLevel(spotsLeft, slot.max_capacity || 10),
            resource: resource ? {
              id: resource.id,
              name: resource.name,
              photo_url: resource.photo_url,
              specialties: resource.specialties,
            } : null,
            _attractionDate: slotAttractionDate, // Date in attraction's timezone
          };
        })
        .filter((slot) => {
          // Filter to only include slots that match the selected date in attraction's timezone
          const matchesDate = (slot as any)._attractionDate === selectedDate;
          const hasCapacity = slot.spots_left >= partySize;
          return matchesDate && hasCapacity;
        });

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
          level: getAvailabilityLevel(value.slotsAvailable, value.totalSlots),
          slots_available: value.slotsAvailable,
          total_slots: value.totalSlots,
          lowest_price: value.lowestPrice,
          is_blackout: false,
          is_closed: false,
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

// Helper to determine urgency/availability level
function getUrgencyLevel(available: number, total: number): 'high' | 'medium' | 'low' | 'none' {
  if (available === 0) return 'none';
  const percentage = (available / total) * 100;

  if (percentage <= 20 || available <= 2) return 'low'; // Low availability = urgent
  if (percentage <= 50 || available <= 5) return 'medium';
  return 'high'; // High availability = not urgent
}

export default useAvailabilityV3;
