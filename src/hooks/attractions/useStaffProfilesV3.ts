/**
 * useStaffProfilesV3 - Staff/Resource profile fetching
 * Fetches staff profiles with availability info
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StaffProfile } from '@/types/attraction-v3';

interface UseStaffProfilesV3Props {
  attractionId: string;
  selectedDate?: string;
  enabled?: boolean;
}

interface UseStaffProfilesV3Return {
  staff: StaffProfile[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  getStaffById: (id: string) => StaffProfile | undefined;
  availableStaff: StaffProfile[];
}

export function useStaffProfilesV3({
  attractionId,
  selectedDate,
  enabled = true,
}: UseStaffProfilesV3Props): UseStaffProfilesV3Return {
  // Fetch staff profiles
  const {
    data: staffData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['staff-profiles-v3', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_resources')
        .select(`
          id,
          name,
          capacity,
          is_active,
          photo_url,
          bio,
          specialties,
          display_order,
          show_on_widget
        `)
        .eq('attraction_id', attractionId)
        .eq('is_active', true)
        .eq('show_on_widget', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Transform to StaffProfile
      const profiles: StaffProfile[] = (data || []).map((resource) => ({
        id: resource.id,
        name: resource.name,
        capacity: resource.capacity || 1,
        is_active: resource.is_active,
        photo_url: resource.photo_url,
        bio: resource.bio,
        specialties: resource.specialties || [],
        display_order: resource.display_order || 0,
        show_on_widget: resource.show_on_widget,
      }));

      return profiles;
    },
    enabled: enabled && !!attractionId,
  });

  // Fetch ratings for staff (from reviews)
  const { data: ratingsData } = useQuery({
    queryKey: ['staff-ratings-v3', attractionId],
    queryFn: async () => {
      // This would fetch from a reviews table if available
      // For now, return empty ratings
      return new Map<string, { average: number; count: number }>();
    },
    enabled: enabled && !!attractionId,
  });

  // Fetch availability for selected date
  const { data: availabilityData } = useQuery({
    queryKey: ['staff-availability-v3', attractionId, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return new Set<string>();

      const { data, error } = await supabase
        .from('attraction_booking_slots')
        .select('resource_id')
        .eq('attraction_id', attractionId)
        .eq('slot_date', selectedDate)
        .eq('is_active', true)
        .gt('max_capacity', 0);

      if (error) throw error;

      const availableIds = new Set<string>();
      (data || []).forEach((slot) => {
        if (slot.resource_id) {
          availableIds.add(slot.resource_id);
        }
      });

      return availableIds;
    },
    enabled: enabled && !!attractionId && !!selectedDate,
  });

  // Merge ratings with staff profiles
  const staff = useMemo(() => {
    if (!staffData) return [];

    return staffData.map((profile) => {
      const rating = ratingsData?.get(profile.id);
      return {
        ...profile,
        rating_average: rating?.average,
        booking_count: rating?.count,
      };
    });
  }, [staffData, ratingsData]);

  // Filter to available staff for selected date
  const availableStaff = useMemo(() => {
    if (!selectedDate || !availabilityData) return staff;
    return staff.filter((s) => availabilityData.has(s.id));
  }, [staff, selectedDate, availabilityData]);

  const getStaffById = (id: string) => staff.find((s) => s.id === id);

  return {
    staff,
    isLoading,
    error: error as Error | null,
    refetch,
    getStaffById,
    availableStaff,
  };
}

export default useStaffProfilesV3;
