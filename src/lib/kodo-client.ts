/**
 * Kodo Status Page API Client
 * Client-side integration for TicketFlo admin dashboard
 */

const KODO_URL = 'https://kodostatus.com';
const KODO_API_KEY = import.meta.env.VITE_KODO_API_KEY || '';
const KODO_STATUS_PAGE_URL = 'https://kodostatus.com/status/ticketflo';

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
  if (!KODO_API_KEY) {
    console.warn('Kodo API key not configured');
    return [];
  }

  try {
    const response = await fetch(`${KODO_URL}/api/v1/services`, {
      headers: {
        'X-API-Key': KODO_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.status}`);
    }

    const data = await response.json();
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
  if (!KODO_API_KEY) {
    console.warn('Kodo API key not configured');
    return [];
  }

  try {
    const url = activeOnly
      ? `${KODO_URL}/api/v1/incidents?active=true`
      : `${KODO_URL}/api/v1/incidents`;

    const response = await fetch(url, {
      headers: {
        'X-API-Key': KODO_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch incidents: ${response.status}`);
    }

    const data = await response.json();
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
  if (!KODO_API_KEY) {
    console.warn('Kodo API key not configured');
    return null;
  }

  try {
    const response = await fetch(`${KODO_URL}/api/v1/incidents`, {
      method: 'POST',
      headers: {
        'X-API-Key': KODO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to create incident: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create Kodo incident:', error);
    return null;
  }
}

/**
 * Update an existing incident
 */
export async function updateIncident(id: string, params: UpdateIncidentParams): Promise<boolean> {
  if (!KODO_API_KEY) {
    console.warn('Kodo API key not configured');
    return false;
  }

  try {
    const response = await fetch(`${KODO_URL}/api/v1/incidents/${id}`, {
      method: 'PATCH',
      headers: {
        'X-API-Key': KODO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to update incident: ${response.status}`);
    }

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
  if (!KODO_API_KEY) {
    console.warn('Kodo API key not configured');
    return false;
  }

  try {
    const response = await fetch(`${KODO_URL}/api/v1/services/${serviceId}`, {
      method: 'PATCH',
      headers: {
        'X-API-Key': KODO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update service status: ${response.status}`);
    }

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
      return 'text-red-600 bg-red-50 border-red-200';
    case 'major':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'minor':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'operational':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'degraded':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'partial_outage':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'major_outage':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'maintenance':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
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
