/**
 * Salon Services & Staff Schedules Hooks
 * CRUD operations for service-based businesses
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  SalonService,
  StaffService,
  StaffSchedule,
  StaffTimeOff,
  RecurringAppointment,
  SkillLevel,
  TimeOffStatus,
} from '@/types/verticals';

// ============================================================================
// Salon Services
// ============================================================================

interface UseSalonServicesOptions {
  attractionId: string;
  includeInactive?: boolean;
  category?: string;
}

export function useSalonServices({ attractionId, includeInactive = false, category }: UseSalonServicesOptions) {
  return useQuery({
    queryKey: ['salonServices', attractionId, includeInactive, category],
    queryFn: async () => {
      let query = supabase
        .from('salon_services')
        .select('*')
        .eq('attraction_id', attractionId)
        .order('category')
        .order('display_order');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalonService[];
    },
    enabled: !!attractionId,
  });
}

export function useSalonService(serviceId: string) {
  return useQuery({
    queryKey: ['salonService', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (error) throw error;
      return data as SalonService;
    },
    enabled: !!serviceId,
  });
}

export function useCreateSalonService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (service: Omit<SalonService, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('salon_services')
        .insert(service)
        .select()
        .single();

      if (error) throw error;
      return data as SalonService;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salonServices', data.attraction_id] });
    },
  });
}

export function useUpdateSalonService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalonService> & { id: string }) => {
      const { data, error } = await supabase
        .from('salon_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SalonService;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salonServices', data.attraction_id] });
      queryClient.invalidateQueries({ queryKey: ['salonService', data.id] });
    },
  });
}

export function useDeleteSalonService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, attractionId }: { serviceId: string; attractionId: string }) => {
      const { error } = await supabase
        .from('salon_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      return { serviceId, attractionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salonServices', data.attractionId] });
    },
  });
}

// ============================================================================
// Service Categories
// ============================================================================

export function useServiceCategories(attractionId: string) {
  return useQuery({
    queryKey: ['serviceCategories', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_services')
        .select('category')
        .eq('attraction_id', attractionId)
        .eq('is_active', true)
        .not('category', 'is', null);

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data?.map(s => s.category).filter(Boolean))] as string[];
      return categories.sort();
    },
    enabled: !!attractionId,
  });
}

// ============================================================================
// Staff-Service Mapping
// ============================================================================

export function useStaffServices(resourceId: string) {
  return useQuery({
    queryKey: ['staffServices', resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_services')
        .select(`
          *,
          service:salon_services(*)
        `)
        .eq('resource_id', resourceId)
        .eq('is_active', true);

      if (error) throw error;
      return data as (StaffService & { service: SalonService })[];
    },
    enabled: !!resourceId,
  });
}

export function useServicesForStaff(resourceId: string) {
  return useQuery({
    queryKey: ['servicesForStaff', resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_services')
        .select(`
          service:salon_services(*)
        `)
        .eq('resource_id', resourceId)
        .eq('is_active', true);

      if (error) throw error;
      return data?.map(d => d.service).filter(Boolean) as SalonService[];
    },
    enabled: !!resourceId,
  });
}

export function useStaffForService(serviceId: string) {
  return useQuery({
    queryKey: ['staffForService', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_services')
        .select(`
          *,
          resource:attraction_resources(*)
        `)
        .eq('service_id', serviceId)
        .eq('is_active', true);

      if (error) throw error;
      return data as StaffService[];
    },
    enabled: !!serviceId,
  });
}

export function useUpsertStaffService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staffService: Omit<StaffService, 'id'>) => {
      const { data, error } = await supabase
        .from('staff_services')
        .upsert(staffService, { onConflict: 'resource_id,service_id' })
        .select()
        .single();

      if (error) throw error;
      return data as StaffService;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staffServices', data.resource_id] });
      queryClient.invalidateQueries({ queryKey: ['staffForService', data.service_id] });
    },
  });
}

export function useRemoveStaffService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resourceId, serviceId }: { resourceId: string; serviceId: string }) => {
      const { error } = await supabase
        .from('staff_services')
        .delete()
        .eq('resource_id', resourceId)
        .eq('service_id', serviceId);

      if (error) throw error;
      return { resourceId, serviceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staffServices', data.resourceId] });
      queryClient.invalidateQueries({ queryKey: ['staffForService', data.serviceId] });
    },
  });
}

// ============================================================================
// Staff Schedules
// ============================================================================

export function useStaffSchedule(resourceId: string) {
  return useQuery({
    queryKey: ['staffSchedule', resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('resource_id', resourceId)
        .order('day_of_week');

      if (error) throw error;
      return data as StaffSchedule[];
    },
    enabled: !!resourceId,
  });
}

export function useUpsertStaffSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedules: Omit<StaffSchedule, 'id' | 'created_at' | 'updated_at'>[]) => {
      const resourceId = schedules[0]?.resource_id;

      // Delete existing schedules for this resource
      await supabase
        .from('staff_schedules')
        .delete()
        .eq('resource_id', resourceId);

      // Insert new schedules
      const { data, error } = await supabase
        .from('staff_schedules')
        .insert(schedules)
        .select();

      if (error) throw error;
      return data as StaffSchedule[];
    },
    onSuccess: (data) => {
      if (data[0]) {
        queryClient.invalidateQueries({ queryKey: ['staffSchedule', data[0].resource_id] });
      }
    },
  });
}

// ============================================================================
// Staff Time Off
// ============================================================================

interface UseStaffTimeOffOptions {
  resourceId?: string;
  attractionId?: string;
  status?: TimeOffStatus;
  startDate?: string;
  endDate?: string;
}

export function useStaffTimeOff({ resourceId, attractionId, status, startDate, endDate }: UseStaffTimeOffOptions = {}) {
  return useQuery({
    queryKey: ['staffTimeOff', resourceId, attractionId, status, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('staff_time_off')
        .select(`
          *,
          resource:attraction_resources(name)
        `)
        .order('start_date', { ascending: true });

      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (startDate) {
        query = query.gte('end_date', startDate);
      }

      if (endDate) {
        query = query.lte('start_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (StaffTimeOff & { resource: { name: string } })[];
    },
    enabled: !!(resourceId || attractionId),
  });
}

export function useCreateTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeOff: Omit<StaffTimeOff, 'id' | 'created_at' | 'status' | 'bookings_affected' | 'bookings_rescheduled'>) => {
      const { data, error } = await supabase
        .from('staff_time_off')
        .insert(timeOff)
        .select()
        .single();

      if (error) throw error;
      return data as StaffTimeOff;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staffTimeOff'] });
    },
  });
}

export function useUpdateTimeOffStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      rejection_reason,
    }: {
      id: string;
      status: TimeOffStatus;
      rejection_reason?: string;
    }) => {
      const updates: Partial<StaffTimeOff> = {
        status,
        approved_at: status === 'approved' ? new Date().toISOString() : undefined,
        rejection_reason: status === 'rejected' ? rejection_reason : undefined,
      };

      const { data, error } = await supabase
        .from('staff_time_off')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as StaffTimeOff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffTimeOff'] });
    },
  });
}

export function useDeleteTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff_time_off')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffTimeOff'] });
    },
  });
}

// ============================================================================
// Recurring Appointments
// ============================================================================

interface UseRecurringAppointmentsOptions {
  attractionId?: string;
  clientId?: string;
  resourceId?: string;
  isActive?: boolean;
}

export function useRecurringAppointments({
  attractionId,
  clientId,
  resourceId,
  isActive = true,
}: UseRecurringAppointmentsOptions = {}) {
  return useQuery({
    queryKey: ['recurringAppointments', attractionId, clientId, resourceId, isActive],
    queryFn: async () => {
      let query = supabase
        .from('recurring_appointments')
        .select(`
          *,
          client:client_profiles(*),
          resource:attraction_resources(name, photo_url),
          service:salon_services(name, base_duration, base_price)
        `)
        .order('next_booking_date');

      if (attractionId) {
        query = query.eq('attraction_id', attractionId);
      }

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }

      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RecurringAppointment[];
    },
    enabled: !!(attractionId || clientId || resourceId),
  });
}

export function useCreateRecurringAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointment: Omit<RecurringAppointment, 'id' | 'created_at' | 'updated_at' | 'last_scheduled_at' | 'next_booking_date'>) => {
      const { data, error } = await supabase
        .from('recurring_appointments')
        .insert(appointment)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringAppointments'] });
    },
  });
}

export function useUpdateRecurringAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringAppointment> & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringAppointments'] });
    },
  });
}

export function useDeleteRecurringAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringAppointments'] });
    },
  });
}

// ============================================================================
// Staff Availability Check
// ============================================================================

export function useCheckStaffAvailability() {
  return useMutation({
    mutationFn: async ({
      resourceId,
      date,
      startTime,
      endTime,
    }: {
      resourceId: string;
      date: string;
      startTime: string;
      endTime: string;
    }) => {
      const { data, error } = await supabase.rpc('is_staff_available', {
        p_resource_id: resourceId,
        p_date: date,
        p_start_time: startTime,
        p_end_time: endTime,
      });

      if (error) throw error;
      return data as boolean;
    },
  });
}

// ============================================================================
// Convenience Aliases
// ============================================================================

export const useCreateService = useCreateSalonService;
export const useUpdateService = useUpdateSalonService;
export const useDeleteService = useDeleteSalonService;
export const useStaffSchedules = (attractionId: string, staffId: string) => useStaffSchedule(staffId);
export const useUpdateStaffSchedule = useUpsertStaffSchedule;
