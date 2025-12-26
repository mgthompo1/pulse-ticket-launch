/**
 * Golf Configuration Hooks
 * CRUD operations for golf course-specific settings
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GolfCourseConfig } from '@/types/verticals';

// ============================================================================
// Golf Course Config
// ============================================================================

export function useGolfConfig(attractionId: string) {
  return useQuery({
    queryKey: ['golfConfig', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('golf_course_config')
        .select('*')
        .eq('attraction_id', attractionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data as GolfCourseConfig | null;
    },
    enabled: !!attractionId,
  });
}

interface CreateGolfConfigInput {
  attraction_id: string;
  tee_time_interval?: number;
  first_tee_time?: string;
  last_tee_time?: string;
  holes_options?: number[];
  default_holes?: number;
  nine_hole_duration?: number;
  eighteen_hole_duration?: number;
  max_players_per_tee?: number;
  min_players_per_tee?: number;
  allow_join_existing?: boolean;
  allow_single_bookings?: boolean;
  course_rating?: number;
  slope_rating?: number;
  par?: number;
  total_yards?: number;
  cart_included?: boolean;
  cart_fee?: number;
  walking_allowed?: boolean;
  require_handicap?: boolean;
  dress_code?: string;
  caddie_available?: boolean;
  caddie_fee?: number;
}

export function useCreateGolfConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGolfConfigInput) => {
      const { data, error } = await supabase
        .from('golf_course_config')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as GolfCourseConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['golfConfig', data.attraction_id] });
    },
  });
}

export function useUpdateGolfConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attraction_id, ...updates }: Partial<GolfCourseConfig> & { attraction_id: string }) => {
      const { data, error } = await supabase
        .from('golf_course_config')
        .update(updates)
        .eq('attraction_id', attraction_id)
        .select()
        .single();

      if (error) throw error;
      return data as GolfCourseConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['golfConfig', data.attraction_id] });
    },
  });
}

export function useUpsertGolfConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: CreateGolfConfigInput) => {
      const { data, error } = await supabase
        .from('golf_course_config')
        .upsert(config, { onConflict: 'attraction_id' })
        .select()
        .single();

      if (error) throw error;
      return data as GolfCourseConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['golfConfig', data.attraction_id] });
    },
  });
}

// ============================================================================
// Tee Time Generation
// ============================================================================

interface TeeTimeSlot {
  time: string;
  displayTime: string;
  availableSpots: number;
  maxSpots: number;
  canJoin: boolean;
  existingBookings: number;
}

interface GenerateTeeTimesInput {
  attractionId: string;
  date: string;
  holesSelected?: number;
}

/**
 * Generate tee time slots for a given date based on golf config
 */
export function useTeeTimeSlots({ attractionId, date, holesSelected }: GenerateTeeTimesInput) {
  const { data: config } = useGolfConfig(attractionId);

  return useQuery({
    queryKey: ['teeTimeSlots', attractionId, date, holesSelected],
    queryFn: async () => {
      if (!config) return [];

      const interval = config.tee_time_interval || 10;
      const firstTee = config.first_tee_time || '06:00';
      const lastTee = config.last_tee_time || '18:00';
      const maxPlayers = config.max_players_per_tee || 4;

      // Parse times
      const [firstH, firstM] = firstTee.split(':').map(Number);
      const [lastH, lastM] = lastTee.split(':').map(Number);

      // Generate slots
      const slots: TeeTimeSlot[] = [];
      let currentH = firstH;
      let currentM = firstM;

      while (currentH < lastH || (currentH === lastH && currentM <= lastM)) {
        const timeStr = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;
        const hour = currentH > 12 ? currentH - 12 : currentH === 0 ? 12 : currentH;
        const ampm = currentH >= 12 ? 'PM' : 'AM';
        const displayTime = `${hour}:${currentM.toString().padStart(2, '0')} ${ampm}`;

        slots.push({
          time: timeStr,
          displayTime,
          availableSpots: maxPlayers,
          maxSpots: maxPlayers,
          canJoin: config.allow_join_existing || false,
          existingBookings: 0,
        });

        // Increment by interval
        currentM += interval;
        if (currentM >= 60) {
          currentH += Math.floor(currentM / 60);
          currentM = currentM % 60;
        }
      }

      // TODO: Fetch existing bookings for this date and update slot availability
      // This would require querying booking_slots table

      return slots;
    },
    enabled: !!config && !!date,
  });
}

// ============================================================================
// Pricing Tiers
// ============================================================================

import type { AttractionPricingTier, PricingTierConditions } from '@/types/verticals';

export function usePricingTiers(attractionId: string) {
  return useQuery({
    queryKey: ['pricingTiers', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_pricing_tiers')
        .select('*')
        .eq('attraction_id', attractionId)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as AttractionPricingTier[];
    },
    enabled: !!attractionId,
  });
}

export function useCreatePricingTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tier: Omit<AttractionPricingTier, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('attraction_pricing_tiers')
        .insert(tier)
        .select()
        .single();

      if (error) throw error;
      return data as AttractionPricingTier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pricingTiers', data.attraction_id] });
    },
  });
}

export function useUpdatePricingTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttractionPricingTier> & { id: string }) => {
      const { data, error } = await supabase
        .from('attraction_pricing_tiers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AttractionPricingTier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pricingTiers', data.attraction_id] });
    },
  });
}

export function useDeletePricingTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tierId, attractionId }: { tierId: string; attractionId: string }) => {
      const { error } = await supabase
        .from('attraction_pricing_tiers')
        .delete()
        .eq('id', tierId);

      if (error) throw error;
      return { tierId, attractionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pricingTiers', data.attractionId] });
    },
  });
}

// ============================================================================
// Price Calculation
// ============================================================================

interface CalculatePriceInput {
  attractionId: string;
  basePrice: number;
  partySize: number;
  clientEmail?: string;
  bookingDate?: string;
  startTime?: string;
}

interface CalculatePriceResult {
  finalPrice: number;
  tierId?: string;
  tierName: string;
  discountAmount: number;
  discountDescription?: string;
}

export function useCalculateBookingPrice() {
  return useMutation({
    mutationFn: async ({
      attractionId,
      basePrice,
      partySize,
      clientEmail,
      bookingDate,
      startTime,
    }: CalculatePriceInput): Promise<CalculatePriceResult> => {
      // Call the database function
      const { data, error } = await supabase.rpc('calculate_booking_price', {
        p_attraction_id: attractionId,
        p_base_price: basePrice,
        p_party_size: partySize,
        p_client_id: null, // Would need to look up from email
        p_booking_date: bookingDate || new Date().toISOString().split('T')[0],
        p_start_time: startTime || '12:00',
      });

      if (error) throw error;

      const result = data?.[0];
      return {
        finalPrice: result?.final_price ?? basePrice * partySize,
        tierId: result?.tier_id,
        tierName: result?.tier_name ?? 'Standard',
        discountAmount: result?.discount_amount ?? 0,
        discountDescription: result?.discount_description,
      };
    },
  });
}

// ============================================================================
// Convenience Alias
// ============================================================================

// Wrapper for TeeTimeSelector component
export function useGolfTeeTimeSlots(attractionId: string, date: Date) {
  const dateStr = date.toISOString().split('T')[0];
  const { data: config } = useGolfConfig(attractionId);

  return useQuery({
    queryKey: ['golfTeeTimeSlots', attractionId, dateStr],
    queryFn: async () => {
      if (!config) return [];

      const interval = config.tee_time_interval || 10;
      const firstTee = config.first_tee_time || '06:00';
      const lastTee = config.last_tee_time || '18:00';
      const maxPlayers = config.max_players_per_tee || 4;

      const [firstH, firstM] = firstTee.split(':').map(Number);
      const [lastH, lastM] = lastTee.split(':').map(Number);

      const slots: { time: string; available_spots: number; price: number; existing_booking_id?: string }[] = [];
      let currentH = firstH;
      let currentM = firstM;

      while (currentH < lastH || (currentH === lastH && currentM <= lastM)) {
        const timeStr = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;

        slots.push({
          time: timeStr,
          available_spots: maxPlayers,
          price: 75, // Default price, would come from attraction base_price
        });

        currentM += interval;
        if (currentM >= 60) {
          currentH += Math.floor(currentM / 60);
          currentM = currentM % 60;
        }
      }

      return slots;
    },
    enabled: !!config && !!attractionId,
  });
}
