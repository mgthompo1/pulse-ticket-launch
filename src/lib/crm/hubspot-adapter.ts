// HubSpot CRM Adapter Implementation
import { supabase } from '@/integrations/supabase/client';
import type {
  ICRMAdapter,
  CRMContact,
  CRMList,
  CRMTimelineEvent,
  CRMContactUpdate,
  CRMSyncResult,
  CRMConnectionStatus,
} from './types';

export class HubSpotAdapter implements ICRMAdapter {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async getConnectionStatus(): Promise<CRMConnectionStatus> {
    const { data, error } = await supabase
      .from('hubspot_connections')
      .select('*')
      .eq('organization_id', this.organizationId)
      .maybeSingle();

    if (error || !data) {
      return { connected: false, crmType: 'hubspot' };
    }

    return {
      connected: data.connection_status === 'connected',
      crmType: 'hubspot',
      accountName: data.hub_domain,
      accountId: data.hub_id,
      connectedBy: data.user_email,
      lastSyncAt: data.last_sync_at,
      error: data.connection_status === 'error' ? data.last_error : undefined,
    };
  }

  async disconnect(): Promise<void> {
    await supabase
      .from('hubspot_connections')
      .delete()
      .eq('organization_id', this.organizationId);
  }

  async getLists(): Promise<CRMList[]> {
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: {
        action: 'getLists',
        organizationId: this.organizationId,
      },
    });

    if (error || !data?.lists) {
      console.error('Error fetching HubSpot lists:', error);
      return [];
    }

    return data.lists.map((list: any) => ({
      id: list.listId?.toString() || list.id,
      name: list.name,
      contactCount: list.size || list.contactCount || 0,
      type: list.dynamic ? 'dynamic' : 'static',
      lastUpdated: list.updatedAt,
    }));
  }

  async getListContacts(listId: string, limit = 100, offset = 0): Promise<CRMContact[]> {
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: {
        action: 'getListContacts',
        organizationId: this.organizationId,
        listId,
        limit,
        offset,
      },
    });

    if (error || !data?.contacts) {
      console.error('Error fetching HubSpot list contacts:', error);
      return [];
    }

    return data.contacts.map(this.mapHubSpotContact);
  }

  async searchContacts(query: string, limit = 20): Promise<CRMContact[]> {
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: {
        action: 'searchContacts',
        organizationId: this.organizationId,
        query,
        limit,
      },
    });

    if (error || !data?.contacts) {
      console.error('Error searching HubSpot contacts:', error);
      return [];
    }

    return data.contacts.map(this.mapHubSpotContact);
  }

  async getContact(contactId: string): Promise<CRMContact | null> {
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: {
        action: 'getContact',
        organizationId: this.organizationId,
        contactId,
      },
    });

    if (error || !data?.contact) {
      return null;
    }

    return this.mapHubSpotContact(data.contact);
  }

  async updateContact(update: CRMContactUpdate): Promise<boolean> {
    const { error } = await supabase.functions.invoke('hubspot-sync', {
      body: {
        action: 'updateContact',
        organizationId: this.organizationId,
        contactId: update.contactId,
        properties: update.properties,
      },
    });

    return !error;
  }

  async updateContacts(updates: CRMContactUpdate[]): Promise<CRMSyncResult> {
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: {
        action: 'updateContacts',
        organizationId: this.organizationId,
        updates,
      },
    });

    if (error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: updates.length,
        errors: [{ error: error.message }],
      };
    }

    return {
      success: data?.failed === 0,
      syncedCount: data?.updated || 0,
      failedCount: data?.failed || 0,
      errors: data?.errors,
    };
  }

  async createTimelineEvent(event: CRMTimelineEvent): Promise<boolean> {
    const { error } = await supabase.functions.invoke('hubspot-sync', {
      body: {
        action: 'createTimelineEvent',
        organizationId: this.organizationId,
        event,
      },
    });

    return !error;
  }

  async createTimelineEvents(events: CRMTimelineEvent[]): Promise<CRMSyncResult> {
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: {
        action: 'createTimelineEvents',
        organizationId: this.organizationId,
        events,
      },
    });

    if (error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: events.length,
        errors: [{ error: error.message }],
      };
    }

    return {
      success: data?.failed === 0,
      syncedCount: data?.created || 0,
      failedCount: data?.failed || 0,
      errors: data?.errors,
    };
  }

  async addContactsToList(listId: string, contactIds: string[]): Promise<CRMSyncResult> {
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: {
        action: 'addContactsToList',
        organizationId: this.organizationId,
        listId,
        contactIds,
      },
    });

    if (error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: contactIds.length,
        errors: [{ error: error.message }],
      };
    }

    return {
      success: true,
      syncedCount: data?.added || contactIds.length,
      failedCount: data?.failed || 0,
    };
  }

  async createList(name: string, contactIds?: string[]): Promise<CRMList | null> {
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: {
        action: 'createList',
        organizationId: this.organizationId,
        name,
        contactIds,
      },
    });

    if (error || !data?.list) {
      return null;
    }

    return {
      id: data.list.listId?.toString() || data.list.id,
      name: data.list.name,
      contactCount: contactIds?.length || 0,
      type: 'static',
    };
  }

  // Helper to map HubSpot contact format to generic format
  private mapHubSpotContact(hsContact: any): CRMContact {
    const props = hsContact.properties || hsContact;
    return {
      id: hsContact.id || hsContact.vid?.toString(),
      email: props.email,
      firstName: props.firstname,
      lastName: props.lastname,
      company: props.company,
      jobTitle: props.jobtitle,
      phone: props.phone,
      context: {
        dealStage: props.dealstage,
        lifecycleStage: props.lifecyclestage,
        owner: props.hubspot_owner_id,
        tags: props.hs_tag ? props.hs_tag.split(';') : undefined,
      },
      rawData: hsContact,
    };
  }
}
