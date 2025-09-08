export interface WidgetCustomization {
  enabled?: boolean;
  seatMaps?: any;
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
  };
  resourceSelection?: {
    label?: string;
    placeholder?: string;
    anyOption?: string;
  };
  // Legacy flat structure for backwards compatibility
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
  showOrgLogo?: boolean;
  customHeaderText?: string;
  label?: string;
  placeholder?: string;
  anyOption?: string;
}

export interface AttractionData {
  id: string;
  name: string;
  description?: string | null;
  venue?: string | null;
  logo_url?: string | null;
  featured_image_url?: string | null;
  organization_id: string;
  widget_customization?: WidgetCustomization;
  organizations?: {
    name: string;
    payment_provider?: string | null;
    currency?: string | null;
    logo_url?: string | null;
    credit_card_processing_fee_percentage?: number | null;
  };
}

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
  widget_customization?: WidgetCustomization;
  ticket_customization?: Record<string, unknown>;
  email_customization?: Record<string, unknown>;
  
  organizations?: {
    name: string;
    payment_provider?: string | null;
    currency?: string | null;
    logo_url?: string | null;
    credit_card_processing_fee_percentage?: number | null;
    apple_pay_merchant_id?: string | null;
    windcave_endpoint?: string | null;
    stripe_booking_fee_enabled?: boolean | null;
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