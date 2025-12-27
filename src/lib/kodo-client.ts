/**
 * Kodo Status Page API Client
 * Client-side integration for TicketFlo admin dashboard
 * Uses Supabase edge function as proxy to keep API key server-side
 */

import { supabase } from '@/integrations/supabase/client';

const KODO_STATUS_PAGE_URL = 'https://kodostatus.com/status/ticketflo';

async function callKodoProxy(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('kodo-proxy', {
    body: { action, ...params },
  });

  if (error) {
    console.error('Kodo proxy error:', error);
    throw error;
  }

  return data;
}

export interface KodoService {
  id: string;
  name: string;
  description: string | null;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  display_order: number;
  created_at: string;
}

export interface KodoIncident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  message: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  services?: string[];
}

export interface CreateIncidentParams {
  title: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  message: string;
  services?: string[];
}

export interface UpdateIncidentParams {
  status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  message?: string;
}

/**
 * Fetch all services from Kodo
 */
export async function fetchServices(): Promise<KodoService[]> {
  try {
    const data = await callKodoProxy('fetchServices');
    return data.services || [];
  } catch (error) {
    console.error('Failed to fetch Kodo services:', error);
    return [];
  }
}

/**
 * Fetch all incidents from Kodo
 */
export async function fetchIncidents(activeOnly = false): Promise<KodoIncident[]> {
  try {
    const data = await callKodoProxy('fetchIncidents', { activeOnly });
    return data.incidents || [];
  } catch (error) {
    console.error('Failed to fetch Kodo incidents:', error);
    return [];
  }
}

/**
 * Create a new incident in Kodo
 */
export async function createIncident(params: CreateIncidentParams): Promise<KodoIncident | null> {
  try {
    const data = await callKodoProxy('createIncident', params);
    return data;
  } catch (error) {
    console.error('Failed to create Kodo incident:', error);
    return null;
  }
}

/**
 * Update an existing incident
 */
export async function updateIncident(id: string, params: UpdateIncidentParams): Promise<boolean> {
  try {
    await callKodoProxy('updateIncident', { id, ...params });
    return true;
  } catch (error) {
    console.error('Failed to update Kodo incident:', error);
    return false;
  }
}

/**
 * Resolve an incident
 */
export async function resolveIncident(id: string, message?: string): Promise<boolean> {
  return updateIncident(id, {
    status: 'resolved',
    message: message || 'Issue has been resolved.',
  });
}

/**
 * Update a service's status
 */
export async function updateServiceStatus(
  serviceId: string,
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance'
): Promise<boolean> {
  try {
    await callKodoProxy('updateServiceStatus', { serviceId, status });
    return true;
  } catch (error) {
    console.error('Failed to update Kodo service status:', error);
    return false;
  }
}

/**
 * Get the public status page URL
 */
export function getStatusPageUrl(): string {
  return KODO_STATUS_PAGE_URL;
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: 'minor' | 'major' | 'critical'): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/50 dark:border-red-900';
    case 'major':
      return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/50 dark:border-orange-900';
    case 'minor':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/50 dark:border-yellow-900';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'operational':
      return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/50 dark:border-green-900';
    case 'degraded':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/50 dark:border-yellow-900';
    case 'partial_outage':
      return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/50 dark:border-orange-900';
    case 'major_outage':
      return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/50 dark:border-red-900';
    case 'maintenance':
      return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/50 dark:border-blue-900';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
}

/**
 * Format status for display
 */
export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default {
  fetchServices,
  fetchIncidents,
  createIncident,
  updateIncident,
  resolveIncident,
  updateServiceStatus,
  getStatusPageUrl,
  getSeverityColor,
  getStatusColor,
  formatStatus,
};
