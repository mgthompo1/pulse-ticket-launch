// TypeScript interfaces for better type safety

export interface Order {
  id: string;
  customer_email: string;
  status: string;
  stripe_session_id?: string;
  total_amount: number;
  events: {
    id: string;
    name: string;
    event_date: string;
    venue: string;
    description: string;
    logo_url?: string;
    ticket_delivery_method: string;
    email_customization?: any;
    organizations: {
      id: string;
      name: string;
      email: string;
      logo_url?: string;
    };
  };
  order_items: OrderItem[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  item_type: string;
  ticket_types?: {
    name: string;
    description: string;
  };
  merchandise?: {
    name: string;
  };
}

export interface Ticket {
  id?: string;
  code: string;
  type: string;
  price: number;
  order_item_id?: string;
  status?: string;
}

export interface PaymentInfo {
  brand: string;
  last4: string;
  type: string;
}

export interface Theme {
  headerColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  accentColor: string;
  borderColor: string;
  fontFamily: string;
}

export interface QrUrls {
  [ticketCode: string]: string;
}

export interface EmailBlock {
  type: string;
  [key: string]: any;
}

export interface EmailCustomization {
  theme: string;
  template: string;
  branding?: any;
  blocks: EmailBlock[];
}

export interface PdfAttachment {
  filename: string;
  content: string;
  type: string;
}
