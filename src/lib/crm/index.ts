// CRM Adapter Factory - Returns the appropriate adapter based on org's CRM connection

import { supabase } from '@/integrations/supabase/client';
import type { ICRMAdapter, CRMType, CRMConnectionStatus } from './types';
import { NullCRMAdapter } from './types';
import { HubSpotAdapter } from './hubspot-adapter';

// Export types
export * from './types';
export { HubSpotAdapter } from './hubspot-adapter';

// Cache adapters per organization to avoid recreating
const adapterCache = new Map<string, ICRMAdapter>();

/**
 * Get the CRM adapter for an organization
 * Returns the appropriate adapter based on which CRM is connected
 * Falls back to NullCRMAdapter if no CRM is connected
 */
export async function getCRMAdapter(organizationId: string): Promise<ICRMAdapter> {
  // Check cache first
  const cached = adapterCache.get(organizationId);
  if (cached) {
    return cached;
  }

  // Check which CRM is connected
  const crmType = await getConnectedCRMType(organizationId);

  let adapter: ICRMAdapter;

  switch (crmType) {
    case 'hubspot':
      adapter = new HubSpotAdapter(organizationId);
      break;
    // Future: Add other CRM adapters here
    // case 'pipedrive':
    //   adapter = new PipedriveAdapter(organizationId);
    //   break;
    // case 'salesforce':
    //   adapter = new SalesforceAdapter(organizationId);
    //   break;
    default:
      adapter = new NullCRMAdapter();
  }

  adapterCache.set(organizationId, adapter);
  return adapter;
}

/**
 * Get all CRM connection statuses for an organization
 */
export async function getAllCRMConnectionStatuses(organizationId: string): Promise<CRMConnectionStatus[]> {
  const statuses: CRMConnectionStatus[] = [];

  // Check HubSpot
  const { data: hubspotConn } = await supabase
    .from('hubspot_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (hubspotConn) {
    statuses.push({
      connected: hubspotConn.connection_status === 'connected',
      crmType: 'hubspot',
      accountName: hubspotConn.hub_domain,
      accountId: hubspotConn.hub_id,
      connectedBy: hubspotConn.user_email,
      lastSyncAt: hubspotConn.last_sync_at,
      error: hubspotConn.connection_status === 'error' ? hubspotConn.last_error : undefined,
    });
  }

  // Future: Check other CRMs
  // const { data: pipedriveConn } = await supabase...
  // const { data: salesforceConn } = await supabase...

  return statuses;
}

/**
 * Get the primary connected CRM type for an organization
 */
export async function getConnectedCRMType(organizationId: string): Promise<CRMType> {
  // Check HubSpot first (current implementation)
  const { data: hubspotConn } = await supabase
    .from('hubspot_connections')
    .select('connection_status')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (hubspotConn?.connection_status === 'connected') {
    return 'hubspot';
  }

  // Future: Check other CRMs in order of preference
  // if (pipedriveConnected) return 'pipedrive';
  // if (salesforceConnected) return 'salesforce';

  return 'none';
}

/**
 * Clear the adapter cache for an organization
 * Call this when CRM connection changes
 */
export function clearCRMAdapterCache(organizationId: string): void {
  adapterCache.delete(organizationId);
}

/**
 * Check if any CRM is connected for an organization
 */
export async function hasCRMConnection(organizationId: string): Promise<boolean> {
  const crmType = await getConnectedCRMType(organizationId);
  return crmType !== 'none';
}
