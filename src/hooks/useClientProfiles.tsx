/**
 * Client Profiles Hooks
 * CRUD operations for customer/client management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ClientProfile,
  ClientAttractionStats,
  ClientWithStats,
} from '@/types/verticals';

// ============================================================================
// Client Profiles
// ============================================================================

interface UseClientProfilesOptions {
  organizationId: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export function useClientProfiles({
  organizationId,
  search,
  tags,
  limit = 50,
  offset = 0,
}: UseClientProfilesOptions) {
  return useQuery({
    queryKey: ['clientProfiles', organizationId, search, tags, limit, offset],
    queryFn: async () => {
      let query = supabase
        .from('client_profiles')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('last_name')
        .order('first_name')
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        clients: data as ClientProfile[],
        total: count || 0,
      };
    },
    enabled: !!organizationId,
  });
}

export function useClientProfile(clientId: string) {
  return useQuery({
    queryKey: ['clientProfile', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      return data as ClientProfile;
    },
    enabled: !!clientId,
  });
}

export function useClientProfileByEmail(email: string, organizationId: string) {
  return useQuery({
    queryKey: ['clientProfileByEmail', email, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('email', email.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ClientProfile | null;
    },
    enabled: !!email && !!organizationId,
  });
}

export function useClientWithStats(clientId: string) {
  return useQuery({
    queryKey: ['clientWithStats', clientId],
    queryFn: async () => {
      const { data: client, error: clientError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      const { data: stats, error: statsError } = await supabase
        .from('client_attraction_stats')
        .select(`
          *,
          attraction:attractions(name)
        `)
        .eq('client_id', clientId);

      if (statsError) throw statsError;

      return {
        ...client,
        stats: stats || [],
      } as ClientWithStats;
    },
    enabled: !!clientId,
  });
}

interface CreateClientInput {
  organization_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  notes?: string;
  tags?: string[];
  preferences?: Record<string, unknown>;
  marketing_opt_in?: boolean;
}

export function useCreateClientProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      const { data, error } = await supabase
        .from('client_profiles')
        .insert({
          ...input,
          email: input.email.toLowerCase(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClientProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientProfiles', data.organization_id] });
    },
  });
}

export function useUpdateClientProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClientProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from('client_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ClientProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientProfiles', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['clientProfile', data.id] });
      queryClient.invalidateQueries({ queryKey: ['clientWithStats', data.id] });
    },
  });
}

export function useDeleteClientProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, organizationId }: { clientId: string; organizationId: string }) => {
      const { error } = await supabase
        .from('client_profiles')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      return { clientId, organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientProfiles', data.organizationId] });
    },
  });
}

// ============================================================================
// Client Tags
// ============================================================================

export function useClientTags(organizationId: string) {
  return useQuery({
    queryKey: ['clientTags', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('tags')
        .eq('organization_id', organizationId);

      if (error) throw error;

      // Flatten and dedupe tags
      const allTags = data?.flatMap(c => c.tags || []) || [];
      const uniqueTags = [...new Set(allTags)].sort();

      return uniqueTags;
    },
    enabled: !!organizationId,
  });
}

export function useAddClientTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, tag }: { clientId: string; tag: string }) => {
      // Get current tags
      const { data: client } = await supabase
        .from('client_profiles')
        .select('tags, organization_id')
        .eq('id', clientId)
        .single();

      const currentTags = client?.tags || [];
      if (currentTags.includes(tag)) {
        return client as ClientProfile;
      }

      const { data, error } = await supabase
        .from('client_profiles')
        .update({ tags: [...currentTags, tag] })
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;
      return data as ClientProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientProfile', data.id] });
      queryClient.invalidateQueries({ queryKey: ['clientTags', data.organization_id] });
    },
  });
}

export function useRemoveClientTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, tag }: { clientId: string; tag: string }) => {
      // Get current tags
      const { data: client } = await supabase
        .from('client_profiles')
        .select('tags, organization_id')
        .eq('id', clientId)
        .single();

      const currentTags = client?.tags || [];
      const newTags = currentTags.filter((t: string) => t !== tag);

      const { data, error } = await supabase
        .from('client_profiles')
        .update({ tags: newTags })
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;
      return data as ClientProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientProfile', data.id] });
    },
  });
}

// ============================================================================
// Client Attraction Stats
// ============================================================================

export function useClientStatsForAttraction(attractionId: string, options?: { sortBy?: 'total_spent' | 'total_bookings' | 'last_visit_at'; limit?: number }) {
  const { sortBy = 'total_spent', limit = 50 } = options || {};

  return useQuery({
    queryKey: ['clientStatsForAttraction', attractionId, sortBy, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_attraction_stats')
        .select(`
          *,
          client:client_profiles(*)
        `)
        .eq('attraction_id', attractionId)
        .order(sortBy, { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as (ClientAttractionStats & { client: ClientProfile })[];
    },
    enabled: !!attractionId,
  });
}

// ============================================================================
// Client Search (for booking lookups)
// ============================================================================

export function useSearchClients(organizationId: string, searchTerm: string) {
  return useQuery({
    queryKey: ['searchClients', organizationId, searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('client_profiles')
        .select('id, email, first_name, last_name, phone')
        .eq('organization_id', organizationId)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data as Pick<ClientProfile, 'id' | 'email' | 'first_name' | 'last_name' | 'phone'>[];
    },
    enabled: !!organizationId && !!searchTerm && searchTerm.length >= 2,
  });
}

// ============================================================================
// Client Booking History
// ============================================================================

export function useClientBookingHistory(clientId: string, attractionId?: string) {
  return useQuery({
    queryKey: ['clientBookingHistory', clientId, attractionId],
    queryFn: async () => {
      let query = supabase
        .from('attraction_bookings')
        .select(`
          *,
          attraction:attractions(name),
          slot:booking_slots(start_time, end_time)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (attractionId) {
        query = query.eq('attraction_id', attractionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

// ============================================================================
// VIP / Top Clients
// ============================================================================

export function useTopClients(attractionId: string, metric: 'spent' | 'bookings' | 'visits' = 'spent', limit = 10) {
  return useQuery({
    queryKey: ['topClients', attractionId, metric, limit],
    queryFn: async () => {
      const orderColumn = metric === 'spent' ? 'total_spent' :
                         metric === 'bookings' ? 'total_bookings' :
                         'total_bookings';

      const { data, error } = await supabase
        .from('client_attraction_stats')
        .select(`
          *,
          client:client_profiles(*)
        `)
        .eq('attraction_id', attractionId)
        .gt(orderColumn, 0)
        .order(orderColumn, { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as (ClientAttractionStats & { client: ClientProfile })[];
    },
    enabled: !!attractionId,
  });
}
