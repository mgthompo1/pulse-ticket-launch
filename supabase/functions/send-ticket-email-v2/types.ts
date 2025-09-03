// TypeScript interfaces for better type safety
export interface Order {
  id: string;
  customer_email: string;
  customer_name: string;
  total_amount: number;
  status: string;
  stripe_session_id?: string;
  custom_answers?: Record<string, any>;
  events: Event;
  order_items: OrderItem[];
}

export interface Event {
  name: string;
  event_date: string;
  venue: string;
  description?: string;
  logo_url?: string;
  email_customization?: EmailCustomization;
  organizations: Organization;
}

export interface Organization {
  id: string;
  name: string;
  email: string;
  logo_url?: string;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  item_type: string;
  ticket_types?: {
    name: string;
    description?: string;
  };
  merchandise?: {
    name: string;
  };
}

export interface EmailCustomization {
  blocks?: EmailBlock[];
  template?: EmailTemplate;
  branding?: EmailBranding;
  notifications?: {
    organiserNotifications: boolean;
  };
}

export interface EmailBlock {
  type: string;
  title?: string;
  html?: string;
  label?: string;
  url?: string;
  align?: string;
  hidden?: boolean;
}

export interface EmailTemplate {
  theme?: string;
  headerColor?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
  accentColor?: string;
  borderColor?: string;
  fontFamily?: string;
}

export interface EmailBranding {
  showLogo: boolean;
  logoSource: 'event' | 'organization' | 'custom';
  logoPosition: 'header' | 'footer';
  logoSize: 'small' | 'medium' | 'large';
  customLogoUrl?: string;
}

export interface PaymentMethodInfo {
  brand: string;
  last4: string;
  type: string;
}

export interface Ticket {
  code: string;
  type: string;
  price: number;
}

export interface EmailContent {
  to: string;
  subject: string;
  html: string;
}

export interface PdfAttachment {
  filename: string;
  content: string;
  content_type: string;
}

export interface ThemeStyles {
  headerColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  accentColor: string;
  borderColor: string;
  fontFamily: string;
  borderRadius?: string;
  boxShadow?: string;
  border?: string;
  background?: string;
}
