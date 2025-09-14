// Email template block-based schema to support drag/drop editing and rendering

export type EmailBlockType =
  | "header"
  | "text"
  | "event_details"
  | "ticket_list"
  | "registration_details"
  | "payment_summary"
  | "button"
  | "divider"
  | "image"
  | "footer"
  | "calendar_button"
  | "qr_tickets"
  | "order_management"
  | "social_links"
  | "custom_message"
  | "next_steps"
  // Reminder email specific blocks
  | "event_countdown"
  | "attendance_info"
  | "important_updates"
  | "venue_directions"
  | "check_in_info"
  | "weather_info"
  | "recommended_items";

export interface EmailBlockBase {
  id: string;
  type: EmailBlockType;
  hidden?: boolean;
}

export interface HeaderBlock extends EmailBlockBase {
  type: "header";
  title: string;
  subtitle?: string;
  includeLogo?: boolean;
  align?: "left" | "center" | "right";
}

export interface TextBlock extends EmailBlockBase {
  type: "text";
  html?: string; // sanitized HTML snippet
  markdown?: string; // optional authoring format
}

export interface EventDetailsBlock extends EmailBlockBase {
  type: "event_details";
  showDate?: boolean;
  showTime?: boolean;
  showVenue?: boolean;
  showCustomer?: boolean;
}

export interface TicketListBlock extends EmailBlockBase {
  type: "ticket_list";
  showPrice?: boolean;
  showCode?: boolean;
}

export interface RegistrationDetailsBlock extends EmailBlockBase {
  type: "registration_details";
  showTotal?: boolean;
  showQuantity?: boolean;
}

export interface PaymentSummaryBlock extends EmailBlockBase {
  type: "payment_summary";
  showPaymentMethod?: boolean;
  showLast4?: boolean;
  showTotal?: boolean;
}

export interface ButtonBlock extends EmailBlockBase {
  type: "button";
  label: string;
  url: string;
  align?: "left" | "center" | "right";
}

export interface DividerBlock extends EmailBlockBase {
  type: "divider";
}

export interface ImageBlock extends EmailBlockBase {
  type: "image";
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  align?: "left" | "center" | "right";
}

export interface FooterBlock extends EmailBlockBase {
  type: "footer";
  text?: string;
}

export interface CalendarButtonBlock extends EmailBlockBase {
  type: "calendar_button";
  label?: string;
  align?: "left" | "center" | "right";
  showIcon?: boolean;
}

export interface QRTicketsBlock extends EmailBlockBase {
  type: "qr_tickets";
  showInline?: boolean;
  layout?: "grid" | "list";
  includeBarcode?: boolean;
}

export interface OrderManagementBlock extends EmailBlockBase {
  type: "order_management";
  showViewOrder?: boolean;
  showModifyOrder?: boolean;
  showCancelOrder?: boolean;
  customText?: string;
}

export interface SocialLinksBlock extends EmailBlockBase {
  type: "social_links";
  platforms?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
  align?: "left" | "center" | "right";
  style?: "icons" | "buttons";
}

export interface CustomMessageBlock extends EmailBlockBase {
  type: "custom_message";
  message?: string;
  ticketTypeSpecific?: boolean;
  supportVariables?: boolean;
  markdown?: string;
}

export interface NextStepsBlock extends EmailBlockBase {
  type: "next_steps";
  steps?: string[];
  title?: string;
  showIcons?: boolean;
}

// Reminder email specific blocks
export interface EventCountdownBlock extends EmailBlockBase {
  type: "event_countdown";
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  customText?: string;
  urgencyThreshold?: number; // Days - when to show urgency styling
  align?: "left" | "center" | "right";
}

export interface AttendanceInfoBlock extends EmailBlockBase {
  type: "attendance_info";
  showTicketCount?: boolean;
  showAttendeeNames?: boolean;
  showTicketTypes?: boolean;
  customMessage?: string;
}

export interface ImportantUpdatesBlock extends EmailBlockBase {
  type: "important_updates";
  updates?: string[];
  title?: string;
  highlightNew?: boolean;
  showTimestamp?: boolean;
}

export interface VenueDirectionsBlock extends EmailBlockBase {
  type: "venue_directions";
  showAddress?: boolean;
  showMapLink?: boolean;
  showParkingInfo?: boolean;
  showPublicTransport?: boolean;
  customDirections?: string;
}

export interface CheckInInfoBlock extends EmailBlockBase {
  type: "check_in_info";
  showQRCodes?: boolean;
  showArrivalTime?: boolean;
  showCheckInProcess?: string[];
  customInstructions?: string;
}

export interface WeatherInfoBlock extends EmailBlockBase {
  type: "weather_info";
  showForecast?: boolean;
  showRecommendations?: boolean;
  customMessage?: string;
  autoUpdate?: boolean; // Whether to fetch live weather data
}

export interface RecommendedItemsBlock extends EmailBlockBase {
  type: "recommended_items";
  items?: string[];
  title?: string;
  showIcons?: boolean;
  categories?: {
    bring?: string[];
    wear?: string[];
    avoid?: string[];
  };
}

export type EmailBlock =
  | HeaderBlock
  | TextBlock
  | EventDetailsBlock
  | TicketListBlock
  | RegistrationDetailsBlock
  | PaymentSummaryBlock
  | ButtonBlock
  | DividerBlock
  | ImageBlock
  | FooterBlock
  | CalendarButtonBlock
  | QRTicketsBlock
  | OrderManagementBlock
  | SocialLinksBlock
  | CustomMessageBlock
  | NextStepsBlock
  // Reminder email blocks
  | EventCountdownBlock
  | AttendanceInfoBlock
  | ImportantUpdatesBlock
  | VenueDirectionsBlock
  | CheckInInfoBlock
  | WeatherInfoBlock
  | RecommendedItemsBlock;

export interface EmailTheme {
  headerColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  accentColor?: string;
  borderColor?: string;
  fontFamily?: string;
}

// Template types for different email purposes
export type EmailTemplateType =
  | 'ticket_confirmation'
  | 'booking_confirmation'
  | 'reminder_email'
  | 'event_update'
  | 'cancellation_notice';

// Personalization variable system (inspired by Humanitix @shortcuts)
export interface PersonalizationVariables {
  "@FirstName": string;
  "@LastName": string;
  "@FullName": string;
  "@EventName": string;
  "@EventDate": string;
  "@EventTime": string;
  "@EventVenue": string;
  "@OrderNumber": string;
  "@TotalAmount": string;
  "@TicketCount": string;
  "@OrganizerName": string;
  "@ContactEmail": string;
  "@EventDescription": string;
  "@SpecialInstructions": string;

  // Reminder email specific variables
  "@DaysUntilEvent": string;
  "@HoursUntilEvent": string;
  "@EventCountdown": string;
  "@VenueAddress": string;
  "@VenueParkingInfo": string;
  "@CheckInTime": string;
  "@DoorOpenTime": string;
  "@WeatherForecast": string;
  "@ImportantUpdates": string;
  "@DirectionsUrl": string;
  "@EventWebsite": string;
  "@AttendeeCount": string;
  "@TicketTypes": string;
}

export interface TicketTypeCustomization {
  ticketTypeId: string;
  customMessage?: string;
  additionalInstructions?: string;
  specialRequirements?: string;
}

export interface EmailTemplate {
  version: 1;
  subject: string;
  theme: EmailTheme;
  blocks: EmailBlock[];
  templateType?: EmailTemplateType; // New field for template categorization
  personalization?: {
    enableVariables?: boolean;
    customVariables?: Record<string, string>;
    ticketTypeMessages?: TicketTypeCustomization[];
  };
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    templateName?: string;
    description?: string;
    templateType?: EmailTemplateType;
  };
}

export const createDefaultTemplate = (): EmailTemplate => ({
  version: 1,
  subject: "🎟️ Your tickets for @EventName - Order @OrderNumber",
  templateType: 'ticket_confirmation',
  theme: {
    headerColor: "#1f2937",
    backgroundColor: "#ffffff",
    textColor: "#374151",
    buttonColor: "#1f2937",
    accentColor: "#f9fafb",
    borderColor: "#e5e7eb",
    fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  },
  blocks: [
    { id: "hdr", type: "header", title: "Thank you for your purchase, @FirstName!", align: "center", includeLogo: true },
    {
      id: "custom_msg",
      type: "custom_message",
      message: "Thanks for choosing @EventName! We're excited to see you there.",
      supportVariables: true
    },
    { id: "evt", type: "event_details", showDate: true, showTime: true, showVenue: true, showCustomer: true },
    { id: "tks", type: "ticket_list", showPrice: true, showCode: true },
    { id: "qr", type: "qr_tickets", showInline: true, layout: "grid", includeBarcode: false },
    { id: "div1", type: "divider" },
    {
      id: "next_steps",
      type: "next_steps",
      title: "What to expect next:",
      steps: [
        "Save this email - you'll need it at the event",
        "Add the event to your calendar",
        "Arrive 15 minutes early for check-in",
        "Bring a valid ID if required"
      ],
      showIcons: true
    },
    { id: "cal_btn", type: "calendar_button", label: "Add to Calendar", align: "center", showIcon: true },
    { id: "order_mgmt", type: "order_management", showViewOrder: true, showModifyOrder: true, customText: "Need to make changes?" },
    { id: "div2", type: "divider" },
    { id: "social", type: "social_links", align: "center", style: "icons" },
    { id: "ftr", type: "footer", text: "Questions? Contact us at @ContactEmail" },
  ],
  personalization: {
    enableVariables: true,
    customVariables: {},
    ticketTypeMessages: []
  },
  metadata: {
    templateName: "Enhanced Confirmation Template",
    description: "Comprehensive ticket confirmation with personalization and action items",
    templateType: 'ticket_confirmation'
  }
});

// Create default reminder email template
export const createDefaultReminderTemplate = (): EmailTemplate => ({
  version: 1,
  subject: "⏰ @EventName is coming up in @DaysUntilEvent days!",
  templateType: 'reminder_email',
  theme: {
    headerColor: "#1f2937",
    backgroundColor: "#ffffff",
    textColor: "#374151",
    buttonColor: "#1f2937",
    accentColor: "#f9fafb",
    borderColor: "#e5e7eb",
    fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  },
  blocks: [
    {
      id: "hdr",
      type: "header",
      title: "Get ready for @EventName!",
      subtitle: "@FirstName, your event is coming up soon!",
      align: "center",
      includeLogo: true
    },
    {
      id: "countdown",
      type: "event_countdown",
      showDays: true,
      showHours: true,
      customText: "Don't miss out!",
      urgencyThreshold: 3,
      align: "center"
    },
    { id: "div1", type: "divider" },
    {
      id: "evt_details",
      type: "event_details",
      showDate: true,
      showTime: true,
      showVenue: true,
      showCustomer: false
    },
    {
      id: "attendance_info",
      type: "attendance_info",
      showTicketCount: true,
      showTicketTypes: true,
      customMessage: "Here's a reminder of your attendance details:"
    },
    {
      id: "check_in",
      type: "check_in_info",
      showQRCodes: true,
      showArrivalTime: true,
      showCheckInProcess: [
        "Arrive at least 15 minutes early",
        "Have your ticket ready (digital or printed)",
        "Bring a valid ID if required",
        "Follow signs to the main entrance"
      ],
      customInstructions: "Check-in opens @CheckInTime"
    },
    { id: "div2", type: "divider" },
    {
      id: "directions",
      type: "venue_directions",
      showAddress: true,
      showMapLink: true,
      showParkingInfo: true,
      showPublicTransport: true
    },
    {
      id: "recommended",
      type: "recommended_items",
      title: "What to bring:",
      categories: {
        bring: ["Valid ID", "Your ticket", "Comfortable shoes"],
        wear: ["Weather-appropriate clothing"],
        avoid: ["Large bags (check venue policy)"]
      },
      showIcons: true
    },
    {
      id: "updates",
      type: "important_updates",
      title: "Important updates:",
      updates: [],
      highlightNew: true,
      showTimestamp: true
    },
    { id: "div3", type: "divider" },
    {
      id: "weather",
      type: "weather_info",
      showForecast: true,
      showRecommendations: true,
      customMessage: "Check the weather and dress accordingly!",
      autoUpdate: true
    },
    { id: "cal_btn", type: "calendar_button", label: "Add to Calendar", align: "center", showIcon: true },
    { id: "qr_reminder", type: "qr_tickets", showInline: true, layout: "grid", includeBarcode: true },
    {
      id: "custom_msg",
      type: "custom_message",
      message: "We can't wait to see you at @EventName! If you have any questions, don't hesitate to reach out.",
      supportVariables: true
    },
    { id: "social", type: "social_links", align: "center", style: "icons" },
    { id: "ftr", type: "footer", text: "Questions? Contact us at @ContactEmail or visit @EventWebsite" },
  ],
  personalization: {
    enableVariables: true,
    customVariables: {},
    ticketTypeMessages: []
  },
  metadata: {
    templateName: "Event Reminder Template",
    description: "Comprehensive event reminder with countdown, directions, and preparation info",
    templateType: 'reminder_email'
  }
});

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;


