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
  | "next_steps";

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
  | NextStepsBlock;

export interface EmailTheme {
  headerColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  accentColor?: string;
  borderColor?: string;
  fontFamily?: string;
}

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
  };
}

export const createDefaultTemplate = (): EmailTemplate => ({
  version: 1,
  subject: "🎟️ Your tickets for @EventName - Order @OrderNumber",
  theme: {
    headerColor: "#1f2937",
    backgroundColor: "#ffffff",
    textColor: "#374151",
    buttonColor: "#1f2937",
    accentColor: "#f9fafb",
    borderColor: "#e5e7eb",
    fontFamily: "Arial, sans-serif",
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
    description: "Comprehensive ticket confirmation with personalization and action items"
  }
});

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;


