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
  name: "Professional Lanyard",
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
    // QR Code at the top (professional standard)
    {
      id: 'qr-code',
      type: 'qr_code',
      position: { x: 32.5, y: 8 },
      size: { width: 20, height: 20 },
      style: {
        backgroundColor: 'transparent'
      },
      qrSize: 120,
      includeTicketCode: true
    } as QrCodeBlock,

    // Header divider line under QR
    {
      id: 'header-divider',
      type: 'divider_line',
      position: { x: 15, y: 32 },
      size: { width: 55, height: 1 },
      style: {
        backgroundColor: '#e2e8f0',
        borderRadius: 0
      },
      lineThickness: 1,
      lineColor: '#d1d5db'
    } as DividerLineBlock,

    // Attendee name (prominent)
    {
      id: 'attendee-name',
      type: 'attendee_name',
      position: { x: 8, y: 38 },
      size: { width: 69, height: 18 },
      style: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1f2937',
        backgroundColor: 'transparent',
        padding: 4
      }
    } as AttendeeNameBlock,

    // Ticket type/title (professional subtitle)
    {
      id: 'ticket-type',
      type: 'ticket_type',
      position: { x: 8, y: 58 },
      size: { width: 69, height: 12 },
      style: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: 2,
        padding: 3
      },
      customPrefix: ''
    } as TicketTypeBlock,

    // Event title
    {
      id: 'event-title',
      type: 'event_title',
      position: { x: 8, y: 75 },
      size: { width: 69, height: 16 },
      style: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        color: '#111827'
      }
    } as EventTitleBlock,

    // Event date and time
    {
      id: 'event-date',
      type: 'event_date',
      position: { x: 8, y: 94 },
      size: { width: 69, height: 10 },
      style: {
        fontSize: 9,
        textAlign: 'center',
        color: '#6b7280'
      },
      dateFormat: 'MMM dd, yyyy'
    } as EventDateBlock,

    // Organization logo at bottom
    {
      id: 'org-logo',
      type: 'organization_logo',
      position: { x: 25, y: 106 },
      size: { width: 35, height: 12 },
      style: {
        textAlign: 'center',
        backgroundColor: 'transparent'
      },
      fallbackText: ''
    } as OrganizationLogoBlock
  ]
});