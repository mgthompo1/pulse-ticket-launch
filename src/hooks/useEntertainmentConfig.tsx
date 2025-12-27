/**
 * Entertainment Configuration Hooks
 * CRUD operations for entertainment venue-specific settings (bowling, karaoke, VR, etc.)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EntertainmentConfig } from '@/types/verticals';

// ============================================================================
// Entertainment Config
// ============================================================================

export function useEntertainmentConfig(attractionId: string) {
  return useQuery({
    queryKey: ['entertainmentConfig', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entertainment_config')
        .select('*')
        .eq('attraction_id', attractionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data as EntertainmentConfig | null;
    },
    enabled: !!attractionId,
  });
}

interface CreateEntertainmentConfigInput {
  attraction_id: string;
  resource_label?: string;
  total_resources?: number;
  duration_options?: number[];
  default_duration?: number;
  buffer_between?: number;
  min_per_resource?: number;
  max_per_resource?: number;
  price_per_duration?: boolean;
  equipment_included?: boolean;
  equipment_fee?: number | null;
  party_packages_enabled?: boolean;
  min_party_size?: number;
  party_deposit_percent?: number;
  fnb_enabled?: boolean;
  fnb_required_for_parties?: boolean;
}

export function useCreateEntertainmentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEntertainmentConfigInput) => {
      const { data, error } = await supabase
        .from('entertainment_config')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as EntertainmentConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['entertainmentConfig', data.attraction_id] });
    },
  });
}

export function useUpdateEntertainmentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attraction_id, ...updates }: Partial<EntertainmentConfig> & { attraction_id: string }) => {
      const { data, error } = await supabase
        .from('entertainment_config')
        .update(updates)
        .eq('attraction_id', attraction_id)
        .select()
        .single();

      if (error) throw error;
      return data as EntertainmentConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['entertainmentConfig', data.attraction_id] });
    },
  });
}

/**
 * Upsert entertainment config - creates if doesn't exist, updates if it does
 * USE THIS for config editors to avoid the update-on-nonexistent-row bug
 */
export function useUpsertEntertainmentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: CreateEntertainmentConfigInput) => {
      const { data, error } = await supabase
        .from('entertainment_config')
        .upsert(config, { onConflict: 'attraction_id' })
        .select()
        .single();

      if (error) throw error;
      return data as EntertainmentConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['entertainmentConfig', data.attraction_id] });
    },
  });
}

// ============================================================================
// Resource/Duration Slot Generation
// ============================================================================

interface ResourceSlot {
  time: string;
  displayTime: string;
  resourceId: number;
  resourceName: string;
  available: boolean;
  duration: number;
  price: number;
}

interface GenerateResourceSlotsInput {
  attractionId: string;
  date: string;
  duration?: number;
}

/**
 * Generate available resource slots for a given date based on entertainment config
 */
export function useResourceSlots({ attractionId, date, duration }: GenerateResourceSlotsInput) {
  const { data: config } = useEntertainmentConfig(attractionId);

  return useQuery({
    queryKey: ['resourceSlots', attractionId, date, duration],
    queryFn: async () => {
      if (!config) return [];

      const totalResources = config.total_resources || 4;
      const defaultDuration = duration || config.default_duration || 60;
      const bufferBetween = config.buffer_between || 10;
      const resourceLabel = config.resource_label || 'Lane';

      // Generate time slots from 10am to 10pm
      const slots: ResourceSlot[] = [];
      const startHour = 10;
      const endHour = 22;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;

          // Generate slot for each resource
          for (let resourceNum = 1; resourceNum <= totalResources; resourceNum++) {
            slots.push({
              time: timeStr,
              displayTime,
              resourceId: resourceNum,
              resourceName: `${resourceLabel} ${resourceNum}`,
              available: true, // TODO: Check against existing bookings
              duration: defaultDuration,
              price: 0, // TODO: Calculate from attraction base price
            });
          }
        }
      }

      // TODO: Fetch existing bookings for this date and update slot availability

      return slots;
    },
    enabled: !!config && !!date,
  });
}

// ============================================================================
// Party Packages
// ============================================================================

import type { PartyPackage } from '@/types/verticals';

export function usePartyPackages(attractionId: string) {
  return useQuery({
    queryKey: ['partyPackages', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('party_packages')
        .select('*')
        .eq('attraction_id', attractionId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as PartyPackage[];
    },
    enabled: !!attractionId,
  });
}

export function useCreatePartyPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pkg: Omit<PartyPackage, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('party_packages')
        .insert(pkg)
        .select()
        .single();

      if (error) throw error;
      return data as PartyPackage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partyPackages', data.attraction_id] });
    },
  });
}

export function useUpdatePartyPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PartyPackage> & { id: string }) => {
      const { data, error } = await supabase
        .from('party_packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PartyPackage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partyPackages', data.attraction_id] });
    },
  });
}

export function useDeletePartyPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId, attractionId }: { packageId: string; attractionId: string }) => {
      const { error } = await supabase
        .from('party_packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;
      return { packageId, attractionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partyPackages', data.attractionId] });
    },
  });
}
