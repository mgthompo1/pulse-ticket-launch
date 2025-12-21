export interface WidgetCustomization {
  enabled?: boolean;
  seatMaps?: Record<string, unknown>;
  checkoutMode?: 'onepage' | 'multistep' | 'beta' | 'modal';
  customerAccountsEnabled?: boolean; // Enable sign in/sign up flow
  customQuestions?: CustomQuestion[];
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
    textColor?: string;
    fontFamily?: string;
  };
  branding?: {
    showOrgLogo?: boolean;
    customHeaderText?: string;
    buttonText?: string;
    buttonTextType?: 'default' | 'register' | 'buy' | 'donate' | 'buynow' | 'rsvp' | 'custom';
  };
  resourceSelection?: {
    label?: string;
    placeholder?: string;
    anyOption?: string;
  };
  textCustomization?: {
    // Event step
    eventDescriptionTitle?: string;
    // Tickets step
    ticketSelectionTitle?: string;
    ticketSelectionSubtitle?: string;
    // Details step
    attendeeInfoTitle?: string;
    attendeeInfoDescription?: string;
    primaryTicketLabel?: string;
    ticketLabelPrefix?: string;
    // Ticket-specific labels (e.g., "Parent", "Child")
    ticketLabels?: Record<number, string>; // { 0: "Parent", 1: "Child" }
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
  buttonText?: string;
  buttonTextType?: 'default' | 'register' | 'buy' | 'donate' | 'buynow' | 'rsvp' | 'custom';
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
  pricing_type?: 'paid' | 'free' | 'donation' | null;
  widget_customization?: WidgetCustomization;
  ticket_customization?: Record<string, unknown>;
  email_customization?: Record<string, unknown>;
  donations_enabled?: boolean | null;
  donation_title?: string | null;
  donation_suggested_amounts?: number[];
  donation_description?: string | null;
  // Membership settings (per-event)
  membership_enabled?: boolean | null;
  membership_signup_enabled?: boolean | null;
  membership_discount_display?: boolean | null;

  organizations?: {
    id?: string;
    name: string;
    payment_provider?: string | null;
    currency?: string | null;
    logo_url?: string | null;
    credit_card_processing_fee_percentage?: number | null;
    apple_pay_merchant_id?: string | null;
    windcave_endpoint?: string | null;
    stripe_booking_fee_enabled?: boolean | null;
    stripe_test_mode?: boolean | null;
    crm_enabled?: boolean | null;
    membership_enabled?: boolean | null;
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
  use_assigned_seating?: boolean;
  attendees_per_ticket?: number; // Number of attendees per ticket (default: 1)
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
  donationAmount?: number;
}

export interface WindcaveLink {
  href: string;
  rel: string;
  method: string;
}

export interface ConditionalDisplay {
  dependsOn: string;                           // ID of the question this depends on
  showWhen: string | string[];                 // Value(s) that trigger display
  operator?: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'isEmpty' | 'isNotEmpty';
}

export interface CustomQuestion {
  id: string;
  question: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'email' | 'phone';
  required: boolean;
  options?: string[] | string;
  conditionalDisplay?: ConditionalDisplay;     // Show/hide based on other question answers
}