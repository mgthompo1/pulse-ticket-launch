/**
 * Passes & Membership Hooks
 * CRUD operations for attraction passes and client passes
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AttractionPass,
  ClientPass,
  PassUsage,
  PassType,
  PassStatus,
} from '@/types/verticals';

// ============================================================================
// Attraction Passes (Templates)
// ============================================================================

interface UseAttractionPassesOptions {
  attractionId: string;
  includeInactive?: boolean;
}

export function useAttractionPasses({ attractionId, includeInactive = false }: UseAttractionPassesOptions) {
  return useQuery({
    queryKey: ['attractionPasses', attractionId, includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('attraction_passes')
        .select('*')
        .eq('attraction_id', attractionId)
        .order('display_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AttractionPass[];
    },
    enabled: !!attractionId,
  });
}

export function useAttractionPass(passId: string) {
  return useQuery({
    queryKey: ['attractionPass', passId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_passes')
        .select('*')
        .eq('id', passId)
        .single();

      if (error) throw error;
      return data as AttractionPass;
    },
    enabled: !!passId,
  });
}

export function useCreateAttractionPass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pass: Omit<AttractionPass, 'id' | 'created_at' | 'updated_at' | 'current_holders'>) => {
      const { data, error } = await supabase
        .from('attraction_passes')
        .insert(pass)
        .select()
        .single();

      if (error) throw error;
      return data as AttractionPass;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attractionPasses', data.attraction_id] });
    },
  });
}

export function useUpdateAttractionPass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttractionPass> & { id: string }) => {
      const { data, error } = await supabase
        .from('attraction_passes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AttractionPass;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attractionPasses', data.attraction_id] });
      queryClient.invalidateQueries({ queryKey: ['attractionPass', data.id] });
    },
  });
}

export function useDeleteAttractionPass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ passId, attractionId }: { passId: string; attractionId: string }) => {
      const { error } = await supabase
        .from('attraction_passes')
        .delete()
        .eq('id', passId);

      if (error) throw error;
      return { passId, attractionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attractionPasses', data.attractionId] });
    },
  });
}

// ============================================================================
// Client Passes (Customer-owned)
// ============================================================================

interface UseClientPassesOptions {
  clientId?: string;
  attractionId?: string;
  status?: PassStatus | PassStatus[];
}

export function useClientPasses({ clientId, attractionId, status }: UseClientPassesOptions = {}) {
  return useQuery({
    queryKey: ['clientPasses', clientId, attractionId, status],
    queryFn: async () => {
      let query = supabase
        .from('client_passes')
        .select(`
          *,
          pass:attraction_passes(*),
          client:client_profiles(*)
        `)
        .order('purchased_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (attractionId) {
        query = query.eq('pass.attraction_id', attractionId);
      }

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClientPass[];
    },
    enabled: !!(clientId || attractionId),
  });
}

export function useClientPass(clientPassId: string) {
  return useQuery({
    queryKey: ['clientPass', clientPassId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_passes')
        .select(`
          *,
          pass:attraction_passes(*),
          client:client_profiles(*)
        `)
        .eq('id', clientPassId)
        .single();

      if (error) throw error;
      return data as ClientPass;
    },
    enabled: !!clientPassId,
  });
}

interface CreateClientPassInput {
  pass_id: string;
  client_id: string;
  purchase_price: number;
  purchase_currency?: string;
  starts_at?: string;
  expires_at?: string;
  remaining_uses?: number;
  stripe_payment_intent_id?: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
}

export function useCreateClientPass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClientPassInput) => {
      const { data, error } = await supabase
        .from('client_passes')
        .insert(input)
        .select(`
          *,
          pass:attraction_passes(*)
        `)
        .single();

      if (error) throw error;
      return data as ClientPass;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientPasses'] });
    },
  });
}

export function useUpdateClientPassStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      pause_reason,
    }: {
      id: string;
      status: PassStatus;
      pause_reason?: string;
    }) => {
      const updates: Partial<ClientPass> = { status };

      if (status === 'paused') {
        updates.paused_at = new Date().toISOString();
        updates.pause_reason = pause_reason;
      } else if (status === 'active') {
        updates.paused_at = null;
        updates.pause_reason = null;
      }

      const { data, error } = await supabase
        .from('client_passes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ClientPass;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientPasses'] });
      queryClient.invalidateQueries({ queryKey: ['clientPass', data.id] });
    },
  });
}

// ============================================================================
// Pass Usage
// ============================================================================

export function usePassUsage(clientPassId: string) {
  return useQuery({
    queryKey: ['passUsage', clientPassId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pass_usage')
        .select('*')
        .eq('client_pass_id', clientPassId)
        .order('used_at', { ascending: false });

      if (error) throw error;
      return data as PassUsage[];
    },
    enabled: !!clientPassId,
  });
}

export function useRecordPassUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      client_pass_id,
      booking_id,
      use_type = 'manual',
      uses_consumed = 1,
      notes,
    }: {
      client_pass_id: string;
      booking_id?: string;
      use_type?: 'booking' | 'manual' | 'refund';
      uses_consumed?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('pass_usage')
        .insert({
          client_pass_id,
          booking_id,
          use_type,
          uses_consumed,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PassUsage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['passUsage', data.client_pass_id] });
      queryClient.invalidateQueries({ queryKey: ['clientPass', data.client_pass_id] });
      queryClient.invalidateQueries({ queryKey: ['clientPasses'] });
    },
  });
}

// ============================================================================
// Pass Validation
// ============================================================================

interface ValidatePassResult {
  isValid: boolean;
  reason?: string;
  pass?: ClientPass;
}

export function useValidatePassForBooking() {
  return useMutation({
    mutationFn: async ({
      clientEmail,
      attractionId,
      bookingDate,
      startTime,
    }: {
      clientEmail: string;
      attractionId: string;
      bookingDate: string;
      startTime: string;
    }): Promise<ValidatePassResult> => {
      // First, get the client profile
      const { data: client, error: clientError } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('email', clientEmail.toLowerCase())
        .single();

      if (clientError || !client) {
        return { isValid: false, reason: 'No client profile found' };
      }

      // Get active passes for this client and attraction
      const { data: passes, error: passesError } = await supabase
        .from('client_passes')
        .select(`
          *,
          pass:attraction_passes(*)
        `)
        .eq('client_id', client.id)
        .eq('status', 'active')
        .eq('pass.attraction_id', attractionId);

      if (passesError || !passes || passes.length === 0) {
        return { isValid: false, reason: 'No active passes found' };
      }

      // Check each pass for validity
      for (const clientPass of passes) {
        // Check expiry
        if (clientPass.expires_at && new Date(clientPass.expires_at) < new Date()) {
          continue;
        }

        // Check remaining uses
        if (clientPass.remaining_uses !== null && clientPass.remaining_uses <= 0) {
          continue;
        }

        // Check restrictions
        const restrictions = (clientPass.pass as AttractionPass)?.restrictions;
        if (restrictions) {
          const date = new Date(bookingDate);
          const dayOfWeek = date.getDay();

          // Day of week check
          if (restrictions.daysOfWeek && !restrictions.daysOfWeek.includes(dayOfWeek)) {
            continue;
          }

          // Time check
          if (restrictions.startTime && startTime < restrictions.startTime) {
            continue;
          }
          if (restrictions.endTime && startTime > restrictions.endTime) {
            continue;
          }

          // Blackout date check
          if (restrictions.blackoutDates?.includes(bookingDate)) {
            continue;
          }
        }

        // Pass is valid
        return { isValid: true, pass: clientPass as ClientPass };
      }

      return { isValid: false, reason: 'No valid passes for this booking time' };
    },
  });
}

// ============================================================================
// Active Passes for Client Lookup
// ============================================================================

export function useActivePassesForClient(clientEmail: string, attractionId: string) {
  return useQuery({
    queryKey: ['activePassesForClient', clientEmail, attractionId],
    queryFn: async () => {
      // Get client ID
      const { data: client } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('email', clientEmail.toLowerCase())
        .single();

      if (!client) return [];

      // Get active passes
      const { data: passes, error } = await supabase
        .from('client_passes')
        .select(`
          *,
          pass:attraction_passes!inner(*)
        `)
        .eq('client_id', client.id)
        .eq('status', 'active')
        .eq('pass.attraction_id', attractionId);

      if (error) throw error;
      return passes as ClientPass[];
    },
    enabled: !!clientEmail && !!attractionId,
  });
}

// ============================================================================
// Convenience Aliases
// ============================================================================

// Alias for simpler component usage
export const useCreatePass = useCreateAttractionPass;
export const useUpdatePass = useUpdateAttractionPass;
export const useDeletePass = useDeleteAttractionPass;
export const useValidatePass = useValidatePassForBooking;
