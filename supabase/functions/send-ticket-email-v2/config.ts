// Configuration management for the email service
export const CONFIG = {
  // Application URLs
  DOMAIN: Deno.env.get('PUBLIC_APP_BASE_URL') || 'https://www.ticketflo.org',
  
  // Email configuration
  FROM_EMAIL: 'noreply@ticketflo.org',
  
  // Logo sizes
  LOGO_SIZES: {
    small: '80px',
    medium: '120px',
    large: '150px'
  },
  
  // Theme presets with improved typography and spacing
  THEME_PRESETS: {
    professional: {
      headerColor: "#0f172a",
      backgroundColor: "#ffffff", 
      textColor: "#334155",
      buttonColor: "#0f172a",
      accentColor: "#f8fafc",
      borderColor: "#e2e8f0",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    modern: {
      headerColor: "#1e40af",
      backgroundColor: "#ffffff",
      textColor: "#1e293b", 
      buttonColor: "#2563eb",
      accentColor: "#eff6ff",
      borderColor: "#bfdbfe",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    elegant: {
      headerColor: "#581c87",
      backgroundColor: "#ffffff",
      textColor: "#374151",
      buttonColor: "#7c3aed", 
      accentColor: "#faf5ff",
      borderColor: "#d8b4fe",
      fontFamily: "'Georgia', serif"
    },
    minimal: {
      headerColor: "#18181b",
      backgroundColor: "#ffffff",
      textColor: "#3f3f46",
      buttonColor: "#18181b",
      accentColor: "#fafafa",
      borderColor: "#e4e4e7",
      fontFamily: "'system-ui', -apple-system, sans-serif"
    },
    creative: {
      headerColor: "#be185d",
      backgroundColor: "#ffffff",
      textColor: "#374151",
      buttonColor: "#ec4899",
      accentColor: "#fdf2f8", 
      borderColor: "#f9a8d4",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    corporate: {
      headerColor: "#1e3a8a",
      backgroundColor: "#ffffff",
      textColor: "#1e293b",
      buttonColor: "#1d4ed8",
      accentColor: "#f1f5f9",
      borderColor: "#cbd5e1",
      fontFamily: "'system-ui', -apple-system, sans-serif"
    }
  },
  
  // Default email blocks with Humanitix-inspired features
  DEFAULT_EMAIL_BLOCKS: [
    { type: 'header', title: 'Thank you for your purchase, @FirstName!' },
    { type: 'custom_message', message: 'Thanks for choosing @EventName! We\'re excited to see you there.' },
    { type: 'event_details' },
    { type: 'payment_summary' },
    { type: 'divider' },
    { type: 'next_steps', title: 'What to expect next:', steps: [
      'Save this email - you\'ll need it at the event',
      'Add the event to your calendar',
      'Arrive 15 minutes early for check-in',
      'Bring a valid ID if required'
    ], showIcons: true },
    { type: 'calendar_button', label: 'Add to Calendar', align: 'center', showIcon: true },
    { type: 'button', label: 'View Registration Confirmation', url: 'https://www.ticketflo.org/tickets?orderId={{ORDER_ID}}&email={{CUSTOMER_EMAIL}}', align: 'center' },
    { type: 'order_management', showViewOrder: true, customText: 'Need to make changes?' },
    { type: 'divider' },
    { type: 'social_links', align: 'center', style: 'icons' },
    { type: 'footer', text: 'Questions? Contact us at @ContactEmail' }
  ],
  
  // Professional email-friendly icons
  ICONS: {
    calendar: '📅',      // Calendar emoji
    mapPin: '📍',        // Round pushpin (more widely supported)
    user: '👤',         // Bust in silhouette
    ticket: '🎫',       // Ticket (more widely supported)
    card: '💳'          // Credit card
  },
  
  // PDF generation settings
  PDF_CONFIG: {
    timeout: 30000, // 30 seconds
    maxRetries: 2
  },
  
  // Database query settings
  DB_CONFIG: {
    queryTimeout: 10000 // 10 seconds
  }
};

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
