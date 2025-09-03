// TypeScript interfaces for PDF generation
export interface TicketData {
  ticket_code: string;
  ticket_type_name: string;
  customer_name: string;
  event_name: string;
  event_date: string;
  venue?: string;
  price: number;
  order_id: string;
  status: string;
}

export interface OrderData {
  id: string;
  customer_name: string;
  customer_email: string;
  events: {
    name: string;
    event_date: string;
    venue?: string;
    logo_url?: string;
    ticket_customization?: any;
    organizations: {
      name: string;
      logo_url?: string;
    };
  };
}

export interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  item_type: string;
  ticket_types: {
    name: string;
  };
  tickets: Array<{
    id: string;
    ticket_code: string;
    status: string;
  }>;
}

export interface ProcessedTicket {
  id: string;
  ticket_code: string;
  status: string;
  order_item: OrderItem;
  ticket_type_name: string;
  unit_price: number;
}

export interface ImageData {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  width?: number;
  height?: number;
}

export interface PdfGenerationResult {
  pdf: string; // base64 encoded
  filename: string;
  ticketCount: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

export interface QRCodeOptions {
  width: number;
  margin: number;
  color: {
    dark: string;
    light: string;
  };
}

export interface LayoutConfig {
  card: {
    width: number;
    height: number;
    borderRadius: number;
  };
  logo: {
    maxHeight: number;
    maxWidth: number;
  };
  spacing: {
    section: number;
    item: number;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    muted: string;
    background: string;
  };
}
