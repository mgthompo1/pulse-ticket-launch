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

// Professional Corporate Template
export const createDefaultLanyardTemplate = (): Partial<LanyardTemplate> => ({
  name: "Professional Corporate",
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
    // Header gradient bar
    {
      id: 'header-bar',
      type: 'custom_text',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 8 },
      style: {
        backgroundColor: '#1e40af',
        borderRadius: 0
      },
      text: ''
    } as CustomTextBlock,

    // Organization logo at top
    {
      id: 'org-logo',
      type: 'organization_logo',
      position: { x: 20, y: 12 },
      size: { width: 60, height: 15 },
      style: {
        textAlign: 'center',
        backgroundColor: 'transparent'
      },
      fallbackText: ''
    } as OrganizationLogoBlock,

    // Attendee name (prominent)
    {
      id: 'attendee-name',
      type: 'attendee_name',
      position: { x: 8, y: 35 },
      size: { width: 84, height: 16 },
      style: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1f2937',
        backgroundColor: 'transparent',
        padding: 4
      }
    } as AttendeeNameBlock,

    // Event title with styling
    {
      id: 'event-title',
      type: 'event_title',
      position: { x: 8, y: 55 },
      size: { width: 84, height: 14 },
      style: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        color: '#1e40af',
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 6
      }
    } as EventTitleBlock,

    // Ticket type badge
    {
      id: 'ticket-type',
      type: 'ticket_type',
      position: { x: 25, y: 73 },
      size: { width: 50, height: 8 },
      style: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#ffffff',
        backgroundColor: '#10b981',
        borderRadius: 12,
        padding: 4
      },
      customPrefix: ''
    } as TicketTypeBlock,

    // QR Code positioned elegantly
    {
      id: 'qr-code',
      type: 'qr_code',
      position: { x: 30, y: 85 },
      size: { width: 40, height: 12 },
      style: {
        backgroundColor: 'transparent'
      },
      qrSize: 120,
      includeTicketCode: true
    } as QrCodeBlock,

    // Footer bar
    {
      id: 'footer-bar',
      type: 'custom_text',
      position: { x: 0, y: 99 },
      size: { width: 100, height: 1 },
      style: {
        backgroundColor: '#e5e7eb',
        borderRadius: 0
      },
      text: ''
    } as CustomTextBlock
  ]
});

// Modern Minimalist Template
export const createMinimalistLanyardTemplate = (): Partial<LanyardTemplate> => ({
  name: "Modern Minimalist",
  dimensions: {
    width: 85,
    height: 120,
    unit: 'mm'
  },
  background: {
    color: '#fafafa',
    pattern: 'none'
  },
  blocks: [
    // Centered logo area
    {
      id: 'org-logo',
      type: 'organization_logo',
      position: { x: 25, y: 8 },
      size: { width: 50, height: 18 },
      style: {
        textAlign: 'center',
        backgroundColor: 'transparent'
      },
      fallbackText: ''
    } as OrganizationLogoBlock,

    // Clean divider
    {
      id: 'divider-1',
      type: 'divider_line',
      position: { x: 20, y: 30 },
      size: { width: 60, height: 1 },
      style: {
        backgroundColor: 'transparent',
        borderRadius: 0
      },
      lineThickness: 2,
      lineColor: '#3b82f6'
    } as DividerLineBlock,

    // Attendee name - clean typography
    {
      id: 'attendee-name',
      type: 'attendee_name',
      position: { x: 10, y: 38 },
      size: { width: 80, height: 20 },
      style: {
        fontSize: 20,
        fontWeight: 'light',
        textAlign: 'center',
        color: '#111827',
        backgroundColor: 'transparent',
        padding: 4
      }
    } as AttendeeNameBlock,

    // Event title - subtle
    {
      id: 'event-title',
      type: 'event_title',
      position: { x: 10, y: 62 },
      size: { width: 80, height: 12 },
      style: {
        fontSize: 12,
        fontWeight: 'normal',
        textAlign: 'center',
        color: '#6b7280',
        backgroundColor: 'transparent'
      }
    } as EventTitleBlock,

    // Clean QR code
    {
      id: 'qr-code',
      type: 'qr_code',
      position: { x: 35, y: 78 },
      size: { width: 30, height: 20 },
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 8
      },
      qrSize: 100,
      includeTicketCode: true
    } as QrCodeBlock
  ]
});

// Conference/Event Template
export const createConferenceLanyardTemplate = (): Partial<LanyardTemplate> => ({
  name: "Conference Style",
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
    // Event logo prominent at top
    {
      id: 'event-logo',
      type: 'event_logo',
      position: { x: 15, y: 5 },
      size: { width: 70, height: 20 },
      style: {
        textAlign: 'center',
        backgroundColor: 'transparent'
      },
      fallbackText: ''
    } as EventLogoBlock,

    // Speaker/Attendee badge
    {
      id: 'special-access',
      type: 'special_access',
      position: { x: 60, y: 28 },
      size: { width: 35, height: 8 },
      style: {
        fontSize: 8,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#ffffff',
        backgroundColor: '#ef4444',
        borderRadius: 4,
        padding: 2
      },
      accessText: 'SPEAKER',
      showOnlyForVIP: false
    } as SpecialAccessBlock,

    // Large attendee name
    {
      id: 'attendee-name',
      type: 'attendee_name',
      position: { x: 8, y: 40 },
      size: { width: 84, height: 22 },
      style: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1f2937',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        padding: 8
      }
    } as AttendeeNameBlock,

    // Event title
    {
      id: 'event-title',
      type: 'event_title',
      position: { x: 8, y: 68 },
      size: { width: 84, height: 12 },
      style: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        color: '#1e40af'
      }
    } as EventTitleBlock,

    // Date and time
    {
      id: 'event-date',
      type: 'event_date',
      position: { x: 8, y: 83 },
      size: { width: 42, height: 8 },
      style: {
        fontSize: 9,
        textAlign: 'center',
        color: '#6b7280'
      },
      dateFormat: 'MMM dd'
    } as EventDateBlock,

    {
      id: 'event-time',
      type: 'event_time',
      position: { x: 50, y: 83 },
      size: { width: 42, height: 8 },
      style: {
        fontSize: 9,
        textAlign: 'center',
        color: '#6b7280'
      },
      timeFormat: '12h',
      showTimeZone: false
    } as EventTimeBlock,

    // QR code
    {
      id: 'qr-code',
      type: 'qr_code',
      position: { x: 35, y: 95 },
      size: { width: 30, height: 20 },
      style: {
        backgroundColor: 'transparent'
      },
      qrSize: 100,
      includeTicketCode: true
    } as QrCodeBlock
  ]
});

// VIP/Premium Template
export const createVIPLanyardTemplate = (): Partial<LanyardTemplate> => ({
  name: "VIP Premium",
  dimensions: {
    width: 85,
    height: 120,
    unit: 'mm'
  },
  background: {
    color: '#111827',
    pattern: 'none'
  },
  blocks: [
    // Premium header
    {
      id: 'vip-header',
      type: 'custom_text',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 12 },
      style: {
        backgroundColor: '#fbbf24',
        borderRadius: 0
      },
      text: ''
    } as CustomTextBlock,

    // VIP text
    {
      id: 'vip-text',
      type: 'custom_text',
      position: { x: 25, y: 16 },
      size: { width: 50, height: 8 },
      style: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#fbbf24',
        backgroundColor: 'transparent'
      },
      text: 'VIP ACCESS'
    } as CustomTextBlock,

    // Organization logo
    {
      id: 'org-logo',
      type: 'organization_logo',
      position: { x: 20, y: 28 },
      size: { width: 60, height: 15 },
      style: {
        textAlign: 'center',
        backgroundColor: 'transparent'
      },
      fallbackText: ''
    } as OrganizationLogoBlock,

    // Attendee name - gold on black
    {
      id: 'attendee-name',
      type: 'attendee_name',
      position: { x: 8, y: 48 },
      size: { width: 84, height: 18 },
      style: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#fbbf24',
        backgroundColor: 'transparent',
        padding: 4
      }
    } as AttendeeNameBlock,

    // Event title
    {
      id: 'event-title',
      type: 'event_title',
      position: { x: 8, y: 70 },
      size: { width: 84, height: 14 },
      style: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        color: '#ffffff'
      }
    } as EventTitleBlock,

    // Premium QR with border
    {
      id: 'qr-code',
      type: 'qr_code',
      position: { x: 30, y: 88 },
      size: { width: 40, height: 20 },
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 6
      },
      qrSize: 120,
      includeTicketCode: true
    } as QrCodeBlock,

    // Premium footer
    {
      id: 'premium-footer',
      type: 'custom_text',
      position: { x: 0, y: 110 },
      size: { width: 100, height: 10 },
      style: {
        backgroundColor: '#fbbf24',
        borderRadius: 0
      },
      text: ''
    } as CustomTextBlock
  ]
});

// Get all available templates
export const getAllLanyardTemplates = (): Partial<LanyardTemplate>[] => [
  createDefaultLanyardTemplate(),
  createMinimalistLanyardTemplate(),
  createConferenceLanyardTemplate(),
  createVIPLanyardTemplate()
];