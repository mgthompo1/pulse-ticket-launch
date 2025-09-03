// Configuration constants for PDF generation
export const PDF_CONFIG = {
  // Timeouts and limits
  TIMEOUTS: {
    IMAGE_FETCH: 5000,        // 5 seconds for image fetching
    QR_GENERATION: 3000,      // 3 seconds for QR code generation
    PDF_GENERATION: 30000,    // 30 seconds for entire PDF generation
  },
  
  // Resource limits
  LIMITS: {
    MAX_TICKETS_PER_PDF: 50,  // Maximum tickets in single PDF
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB max image size
    MAX_IMAGE_DIMENSION: 2048, // Max width/height in pixels
  },
  
  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_MS: 1000,
  },
  
  // Layout configuration
  LAYOUT: {
    PAGE: {
      MARGIN: 20,
      WIDTH: 210, // A4 width in mm
      HEIGHT: 297, // A4 height in mm
    },
    TICKET: {
      BORDER_RADIUS: 12,
      HEADER_HEIGHT: 60,
      CONTENT_PADDING: 30,
    },
    LOGO: {
      MAX_HEIGHT: 30,
      MAX_WIDTH: 80,
      FALLBACK_HEIGHT: 24,
    },
    QR_CODE: {
      SIZE: 60,
      MARGIN: 2,
      BORDER_WIDTH: 2,
    },
  },
  
  // Color scheme
  COLORS: {
    PRIMARY: [99, 102, 241],      // Indigo
    SECONDARY: [15, 23, 42],      // Dark slate
    SUCCESS: [34, 197, 94],       // Green
    WARNING: [236, 72, 153],      // Pink
    MUTED: [100, 116, 139],       // Slate
    BACKGROUND: [248, 250, 252],  // Light gray
    WHITE: [255, 255, 255],
    BORDER: [226, 232, 240],      // Light border
  },
  
  // Font configuration
  FONTS: {
    PRIMARY: "helvetica",
    MONOSPACE: "courier",
    SIZES: {
      TITLE: 24,
      HEADING: 14,
      BODY: 12,
      SMALL: 10,
      TINY: 8,
    },
    WEIGHTS: {
      NORMAL: "normal",
      BOLD: "bold",
    },
  },
  
  // QR Code configuration
  QR_CODE: {
    WIDTH: 128,
    MARGIN: 2,
    ERROR_CORRECTION: 'M' as const,
    COLOR: {
      DARK: '#000000',
      LIGHT: '#FFFFFF',
    },
    FALLBACK_DATA_URL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  },
  
  // Security settings
  SECURITY: {
    ALLOWED_IMAGE_DOMAINS: [
      'ticketflo.org',
      'supabase.co',
      'amazonaws.com',
      'cloudinary.com',
      'imgur.com',
    ],
    ALLOWED_PROTOCOLS: ['https:', 'data:'],
    MAX_URL_LENGTH: 2048,
  },
  
  // Date formatting
  DATE_FORMAT: {
    DATE_OPTIONS: {
      weekday: 'long' as const,
      year: 'numeric' as const,
      month: 'long' as const,
      day: 'numeric' as const,
    },
    TIME_OPTIONS: {
      hour: 'numeric' as const,
      minute: '2-digit' as const,
      hour12: true as const,
    },
    LOCALE: 'en-US',
  },
  
  // Error messages
  ERROR_MESSAGES: {
    INVALID_ORDER_ID: 'Invalid or missing order ID',
    ORDER_NOT_FOUND: 'Order not found',
    NO_TICKETS_FOUND: 'No tickets found for this order',
    IMAGE_FETCH_FAILED: 'Failed to fetch image',
    QR_GENERATION_FAILED: 'Failed to generate QR code',
    PDF_GENERATION_FAILED: 'Failed to generate PDF',
    TIMEOUT_EXCEEDED: 'Operation timed out',
    RESOURCE_LIMIT_EXCEEDED: 'Resource limit exceeded',
  },
} as const;

// Environment-specific overrides
export function getEnvironmentConfig() {
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';
  
  return {
    ...PDF_CONFIG,
    TIMEOUTS: {
      ...PDF_CONFIG.TIMEOUTS,
      // Longer timeouts in development
      PDF_GENERATION: isDevelopment ? 60000 : PDF_CONFIG.TIMEOUTS.PDF_GENERATION,
    },
    LIMITS: {
      ...PDF_CONFIG.LIMITS,
      // More generous limits in development
      MAX_TICKETS_PER_PDF: isDevelopment ? 100 : PDF_CONFIG.LIMITS.MAX_TICKETS_PER_PDF,
    },
  };
}
