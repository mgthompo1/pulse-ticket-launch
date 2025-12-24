import { Theme } from "./theme";

export interface AttractionData {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  attraction_type: string;
  duration_minutes: number;
  base_price: number;
  logo_url: string | null;
  widget_customization: AttractionWidgetCustomization | null;
  email_customization: AttractionEmailCustomization | null;
  organization_id: string;
  resource_label?: string | null;
  operating_hours?: OperatingHours | null;
  blackout_dates?: string[] | null;
  organizations?: {
    id?: string;
    name: string;
    payment_provider?: string | null;
    currency?: string | null;
    logo_url?: string | null;
  };
}

export interface AttractionWidgetCustomization {
  theme?: {
    enabled?: boolean;
    primaryColor?: string;
    buttonTextColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    cardBackgroundColor?: string;
    inputBackgroundColor?: string;
    borderEnabled?: boolean;
    borderColor?: string;
    headerTextColor?: string;
    bodyTextColor?: string;
    fontFamily?: string;
  };
  branding?: {
    showOrgLogo?: boolean;
    customHeaderText?: string;
    showPoweredBy?: boolean;
  };
  layout?: {
    bookingStyle?: 'calendar' | 'list' | 'grid';
    showDescription?: boolean;
    showDuration?: boolean;
    showPrice?: boolean;
  };
  booking?: {
    title?: string;
    description?: string;
    buttonText?: string;
  };
  expectations?: {
    title?: string;
    items?: string[];
  };
  resourceSelection?: {
    label?: string;
    placeholder?: string;
    anyOption?: string;
  };
}

export interface AttractionEmailCustomization {
  template?: {
    subject?: string;
    blocks?: EmailBlock[];
    theme?: {
      primaryColor?: string;
      headerBgColor?: string;
      footerBgColor?: string;
    };
  };
}

export interface EmailBlock {
  type: 'header' | 'text' | 'event_details' | 'footer' | 'button' | 'image';
  title?: string;
  text?: string;
  html?: string;
  showDate?: boolean;
  showTime?: boolean;
  showVenue?: boolean;
  showResource?: boolean;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
}

export interface OperatingHours {
  [day: string]: {
    open: string;  // "09:00"
    close: string; // "17:00"
    closed?: boolean;
  };
}

export interface BookingSlot {
  id: string;
  attraction_id: string;
  resource_id: string | null;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'blocked';
  max_capacity: number;
  current_bookings: number;
  price_override: number | null;
}

export interface AttractionResource {
  id: string;
  attraction_id: string;
  name: string;
  capacity: number;
  description: string | null;
  is_active: boolean;
  resource_data?: Record<string, unknown>;
}

export interface BookingFormData {
  selectedDate: string;
  selectedSlotId: string | null;
  selectedResourceId: string | null;
  partySize: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialRequests: string;
}

export interface AttractionBookingData {
  id: string;
  attraction_id: string;
  booking_slot_id: string;
  organization_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  party_size: number;
  special_requests: string | null;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  booking_status: 'pending' | 'confirmed' | 'cancelled';
  booking_reference: string;
  created_at: string;
  updated_at: string;
}

export type BookingStep = 'booking' | 'payment' | 'confirmation';
export type PaymentProvider = 'stripe' | 'windcave';

export type AttractionTheme = Theme;

// Helper to extract theme from widget customization
export function extractTheme(customization: AttractionWidgetCustomization | null): Theme {
  const themeData = customization?.theme;
  const isEnabled = themeData?.enabled === true;

  if (!isEnabled) {
    return {
      enabled: false,
      primaryColor: '#000000',
      buttonTextColor: '#ffffff',
      secondaryColor: '#ffffff',
      backgroundColor: '#ffffff',
      cardBackgroundColor: '#ffffff',
      inputBackgroundColor: '#ffffff',
      borderEnabled: false,
      borderColor: '#e5e7eb',
      headerTextColor: '#111827',
      bodyTextColor: '#6b7280',
      fontFamily: 'Manrope'
    };
  }

  return {
    enabled: true,
    primaryColor: themeData?.primaryColor || '#000000',
    buttonTextColor: themeData?.buttonTextColor || '#ffffff',
    secondaryColor: themeData?.secondaryColor || '#ffffff',
    backgroundColor: themeData?.backgroundColor || '#ffffff',
    cardBackgroundColor: themeData?.cardBackgroundColor || themeData?.backgroundColor || '#ffffff',
    inputBackgroundColor: themeData?.inputBackgroundColor || '#ffffff',
    borderEnabled: themeData?.borderEnabled ?? false,
    borderColor: themeData?.borderColor || '#e5e7eb',
    headerTextColor: themeData?.headerTextColor || '#111827',
    bodyTextColor: themeData?.bodyTextColor || '#6b7280',
    fontFamily: themeData?.fontFamily || 'Manrope'
  };
}

// Utility functions
export function generateBookingReference(): string {
  return `BK${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(-3).toUpperCase()}`;
}

export function formatTime(dateTimeStr: string): string {
  return new Date(dateTimeStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function calculateTotalPrice(
  slot: BookingSlot | null,
  basePrice: number,
  partySize: number
): number {
  if (!slot) return 0;
  return (slot.price_override ?? basePrice) * partySize;
}
