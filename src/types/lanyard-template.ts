export type LanyardBlockType =
  | 'attendee_name'
  | 'event_title'
  | 'organization_logo'
  | 'event_date'
  | 'event_time'
  | 'ticket_type'
  | 'qr_code'
  | 'special_access'
  | 'custom_text'
  | 'divider_line'
  | 'event_logo';

export interface BaseLanyardBlock {
  id: string;
  type: LanyardBlockType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | 'light';
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
  };
}

export interface AttendeeNameBlock extends BaseLanyardBlock {
  type: 'attendee_name';
  showFirstName?: boolean;
  showLastName?: boolean;
  customFormat?: string;
}

export interface EventTitleBlock extends BaseLanyardBlock {
  type: 'event_title';
  customText?: string;
}

export interface OrganizationLogoBlock extends BaseLanyardBlock {
  type: 'organization_logo';
  logoUrl?: string;
  fallbackText?: string;
}

export interface EventDateBlock extends BaseLanyardBlock {
  type: 'event_date';
  dateFormat?: string;
}

export interface EventTimeBlock extends BaseLanyardBlock {
  type: 'event_time';
  timeFormat?: '12h' | '24h';
  showTimeZone?: boolean;
}

export interface TicketTypeBlock extends BaseLanyardBlock {
  type: 'ticket_type';
  customPrefix?: string;
}

export interface QrCodeBlock extends BaseLanyardBlock {
  type: 'qr_code';
  qrSize?: number;
  includeTicketCode?: boolean;
}

export interface SpecialAccessBlock extends BaseLanyardBlock {
  type: 'special_access';
  accessText?: string;
  showOnlyForVIP?: boolean;
}

export interface CustomTextBlock extends BaseLanyardBlock {
  type: 'custom_text';
  text: string;
}

export interface DividerLineBlock extends BaseLanyardBlock {
  type: 'divider_line';
  lineColor?: string;
  lineThickness?: number;
}

export interface EventLogoBlock extends BaseLanyardBlock {
  type: 'event_logo';
  logoUrl?: string;
  fallbackText?: string;
}

export type LanyardBlock =
  | AttendeeNameBlock
  | EventTitleBlock
  | OrganizationLogoBlock
  | EventDateBlock
  | EventTimeBlock
  | TicketTypeBlock
  | QrCodeBlock
  | SpecialAccessBlock
  | CustomTextBlock
  | DividerLineBlock
  | EventLogoBlock;

export interface LanyardTemplate {
  id: string;
  name: string;
  organization_id: string;
  dimensions: {
    width: number;
    height: number;
    unit: 'mm' | 'inch';
  };
  background: {
    color?: string;
    imageUrl?: string;
    pattern?: 'none' | 'dots' | 'lines' | 'grid';
  };
  blocks: LanyardBlock[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LanyardPreviewData {
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  ticketType: string;
  ticketCode: string;
  organizationLogo?: string;
  eventLogo?: string;
  specialAccess?: string;
}

export const createDefaultLanyardTemplate = (): Partial<LanyardTemplate> => ({
  name: "Default Lanyard",
  dimensions: {
    width: 85,
    height: 120,
    unit: 'mm'
  },
  background: {
    color: '#ffffff',
    pattern: 'none'
  },
  blocks: [
    {
      id: 'org-logo',
      type: 'organization_logo',
      position: { x: 10, y: 10 },
      size: { width: 65, height: 20 },
      style: {
        textAlign: 'center',
        backgroundColor: 'transparent'
      }
    } as OrganizationLogoBlock,
    {
      id: 'event-title',
      type: 'event_title',
      position: { x: 10, y: 35 },
      size: { width: 65, height: 15 },
      style: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#000000'
      }
    } as EventTitleBlock,
    {
      id: 'attendee-name',
      type: 'attendee_name',
      position: { x: 10, y: 55 },
      size: { width: 65, height: 20 },
      style: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#2563eb',
        backgroundColor: '#f1f5f9',
        borderRadius: 4,
        padding: 8
      }
    } as AttendeeNameBlock,
    {
      id: 'ticket-type',
      type: 'ticket_type',
      position: { x: 10, y: 80 },
      size: { width: 35, height: 12 },
      style: {
        fontSize: 12,
        textAlign: 'center',
        color: '#64748b'
      }
    } as TicketTypeBlock,
    {
      id: 'qr-code',
      type: 'qr_code',
      position: { x: 50, y: 75 },
      size: { width: 25, height: 25 },
      style: {
        backgroundColor: 'transparent'
      },
      qrSize: 100,
      includeTicketCode: true
    } as QrCodeBlock,
    {
      id: 'event-date',
      type: 'event_date',
      position: { x: 10, y: 105 },
      size: { width: 65, height: 10 },
      style: {
        fontSize: 10,
        textAlign: 'center',
        color: '#64748b'
      },
      dateFormat: 'MMM dd, yyyy'
    } as EventDateBlock
  ]
});