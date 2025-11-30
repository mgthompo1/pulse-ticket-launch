// CRM Adapter Types - Abstract interface for multiple CRM integrations

export type CRMType = 'hubspot' | 'pipedrive' | 'salesforce' | 'none';

// Generic contact representation that works across all CRMs
export interface CRMContact {
  id: string;                    // CRM-specific ID
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;

  // CRM-specific context (deal stage, lifecycle, etc.)
  context?: {
    dealStage?: string;
    dealValue?: number;
    lifecycleStage?: string;
    owner?: string;
    ownerEmail?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
  };

  // Raw CRM data for reference
  rawData?: Record<string, unknown>;
}

// Generic list/segment representation
export interface CRMList {
  id: string;
  name: string;
  contactCount: number;
  type?: 'static' | 'dynamic' | 'smart';
  lastUpdated?: string;
}

// Timeline event to push to CRM
export interface CRMTimelineEvent {
  contactId: string;
  eventType: 'event_invited' | 'event_registered' | 'event_attended' | 'event_note' | 'event_outcome';
  title: string;
  body?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

// Contact update to push to CRM
export interface CRMContactUpdate {
  contactId: string;
  properties: Record<string, string | number | boolean | null>;
}

// Sync result
export interface CRMSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors?: Array<{
    contactId?: string;
    error: string;
  }>;
}

// Connection status
export interface CRMConnectionStatus {
  connected: boolean;
  crmType: CRMType;
  accountName?: string;
  accountId?: string;
  connectedBy?: string;
  lastSyncAt?: string;
  error?: string;
}

// CRM Adapter Interface - All CRM integrations implement this
export interface ICRMAdapter {
  // Connection
  getConnectionStatus(): Promise<CRMConnectionStatus>;
  disconnect(): Promise<void>;

  // Lists/Segments
  getLists(): Promise<CRMList[]>;
  getListContacts(listId: string, limit?: number, offset?: number): Promise<CRMContact[]>;

  // Contacts
  searchContacts(query: string, limit?: number): Promise<CRMContact[]>;
  getContact(contactId: string): Promise<CRMContact | null>;
  updateContact(update: CRMContactUpdate): Promise<boolean>;
  updateContacts(updates: CRMContactUpdate[]): Promise<CRMSyncResult>;

  // Timeline/Activity
  createTimelineEvent(event: CRMTimelineEvent): Promise<boolean>;
  createTimelineEvents(events: CRMTimelineEvent[]): Promise<CRMSyncResult>;

  // Lists Management
  addContactsToList(listId: string, contactIds: string[]): Promise<CRMSyncResult>;
  createList(name: string, contactIds?: string[]): Promise<CRMList | null>;
}

// Null/Standalone adapter - for when no CRM is connected
export class NullCRMAdapter implements ICRMAdapter {
  async getConnectionStatus(): Promise<CRMConnectionStatus> {
    return { connected: false, crmType: 'none' };
  }

  async disconnect(): Promise<void> {}

  async getLists(): Promise<CRMList[]> {
    return [];
  }

  async getListContacts(): Promise<CRMContact[]> {
    return [];
  }

  async searchContacts(): Promise<CRMContact[]> {
    return [];
  }

  async getContact(): Promise<CRMContact | null> {
    return null;
  }

  async updateContact(): Promise<boolean> {
    return true; // No-op succeeds
  }

  async updateContacts(): Promise<CRMSyncResult> {
    return { success: true, syncedCount: 0, failedCount: 0 };
  }

  async createTimelineEvent(): Promise<boolean> {
    return true; // No-op succeeds
  }

  async createTimelineEvents(): Promise<CRMSyncResult> {
    return { success: true, syncedCount: 0, failedCount: 0 };
  }

  async addContactsToList(): Promise<CRMSyncResult> {
    return { success: true, syncedCount: 0, failedCount: 0 };
  }

  async createList(): Promise<CRMList | null> {
    return null;
  }
}
