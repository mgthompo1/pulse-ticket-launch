export interface EventData {
  id: string;
  name: string;
  description?: string | null;
  event_date: string;
  venue?: string | null;
  capacity: number;
  status: string;
  logo_url?: string | null;
  featured_image_url?: string | null;
  organization_id: string;
  widget_customization?: any;
  ticket_customization?: any;
  email_customization?: any;
  
  organizations?: {
    name: string;
    payment_provider?: string | null;
    currency?: string | null;
    logo_url?: string | null;
    credit_card_processing_fee_percentage?: number | null;
    apple_pay_merchant_id?: string | null;
    windcave_endpoint?: string | null;
  };
}

export interface TicketType {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  sale_start_date?: string | null;
  sale_end_date?: string | null;
  event_id: string;
}

export interface CartItem extends TicketType {
  quantity: number;
  type: 'ticket';
  selectedSeats?: string[];
}

export interface MerchandiseCartItem {
  merchandise: {
    id: string;
    name: string;
    price: number;
    description?: string;
    image_url?: string;
    size_options?: string[];
    color_options?: string[];
  };
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
  customAnswers?: Record<string, string>;
}

export interface WindcaveLink {
  href: string;
  rel: string;
  method: string;
}

export interface CustomQuestion {
  id: string;
  question: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'email' | 'phone';
  required: boolean;
  options?: string[] | string;
}