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
  | "footer";

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
  | FooterBlock;

export interface EmailTheme {
  headerColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  accentColor?: string;
  borderColor?: string;
  fontFamily?: string;
}

export interface EmailTemplate {
  version: 1;
  subject: string;
  theme: EmailTheme;
  blocks: EmailBlock[];
}

export const createDefaultTemplate = (): EmailTemplate => ({
  version: 1,
  subject: "Your ticket confirmation",
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
    { id: "hdr", type: "header", title: "Thank you for your purchase!", align: "center", includeLogo: true },
    { id: "evt", type: "event_details", showDate: true, showTime: true, showVenue: true, showCustomer: true },
    { id: "txt", type: "text", html: "We look forward to seeing you at the event." },
    { id: "tks", type: "ticket_list", showPrice: true, showCode: true },
    { id: "div", type: "divider" },
    { id: "btn", type: "button", label: "View Order", url: "{{success_url}}", align: "center" },
    { id: "ftr", type: "footer", text: "Questions? Contact us anytime." },
  ],
});

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;


