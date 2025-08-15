export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          name: string;
          event_date: string;
          venue?: string;
          description?: string;
          created_at: string;
          updated_at: string;
          organization_id: string;
          is_published: boolean;
          theme_customization?: ThemeCustomization;
        };
        Insert: {
          id?: string;
          name: string;
          event_date: string;
          venue?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
          organization_id: string;
          is_published?: boolean;
          theme_customization?: ThemeCustomization;
        };
        Update: {
          id?: string;
          name?: string;
          event_date?: string;
          venue?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
          organization_id?: string;
          is_published?: boolean;
          theme_customization?: ThemeCustomization;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
          stripe_account_id?: string;
          windcave_endpoint?: string;
          apple_pay_merchant_id?: string;
          currency?: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          stripe_account_id?: string;
          windcave_endpoint?: string;
          apple_pay_merchant_id?: string;
          currency?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
          stripe_account_id?: string;
          windcave_endpoint?: string;
          apple_pay_merchant_id?: string;
          currency?: string;
        };
      };
      ticket_types: {
        Row: {
          id: string;
          name: string;
          price: number;
          quantity: number;
          event_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          quantity: number;
          event_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          quantity?: number;
          event_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      merchandise: {
        Row: {
          id: string;
          name: string;
          price: number;
          description?: string;
          event_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          description?: string;
          event_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          description?: string;
          event_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      custom_questions: {
        Row: {
          id: string;
          question: string;
          required: boolean;
          event_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          required: boolean;
          event_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          required?: boolean;
          event_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export interface ThemeCustomization {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_available?: number;
  quantity_sold?: number;
  description?: string;
  event_id?: string;
  type?: string;
  selectedSeats?: string[];
}

export interface MerchandiseCartItem {
  merchandise: {
    id: string;
    name: string;
    price: number;
    description?: string;
  };
  quantity: number;
}

export interface WindcaveLink {
  href: string;
  rel: string;
  method: string;
}

export interface WindcaveSession {
  id: string;
  status: string;
  links: WindcaveLink[];
}

export interface PaymentResult {
  success: boolean;
  message: string;
  orderId?: string;
  error?: string;
}

export interface EventData {
  id: string;
  name: string;
  event_date: string;
  venue?: string;
  description?: string;
  theme_customization?: ThemeCustomization;
  widget_customization?: any;
  organizations: {
    id: string;
    name: string;
    stripe_account_id?: string;
    windcave_endpoint?: string;
    apple_pay_merchant_id?: string;
    currency?: string;
  };
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_available: number;
  quantity_sold: number;
  description?: string;
  event_id: string;
  type?: string;
}

export interface MerchandiseItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  selectedSize?: string;
  selectedColor?: string;
}

export interface CustomQuestion {
  id: string;
  question: string;
  required: boolean;
  label?: string;
  type?: string;
}

export interface OrderData {
  id: string;
  customer_info: CustomerInfo;
  cart: CartItem[];
  merchandise_cart: MerchandiseCartItem[];
  total_amount: number;
  status: string;
  created_at: string;
}

export interface AnalyticsData {
  totalTickets: number;
  totalRevenue: number;
  ticketsSold: number;
  averageOrderValue: number;
}

export interface BillingData {
  id: string;
  organization_id: string;
  stripe_account_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
}

export interface InvoiceData {
  id: string;
  organization_id: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface XeroConnection {
  id: string;
  organization_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
}

export interface MailchimpConnection {
  id: string;
  organization_id: string;
  api_key: string;
  list_id: string;
  created_at: string;
}
