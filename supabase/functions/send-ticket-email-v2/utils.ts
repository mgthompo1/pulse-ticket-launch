// Utility functions for the email service
export const logStep = (step: string, details?: any): void => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TICKET-EMAIL] ${step}${detailsStr}`);
};
// Input validation functions
export const validateOrderId = (orderId: string): string => {
  if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
    throw new Error('Invalid order ID provided');
  }
  return orderId.trim();
};
export const validateEmailAddress = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
// URL validation and sanitization
export const validateAndSanitizeUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    // Only allow http and https protocols
    if (![
      'http:',
      'https:'
    ].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol');
    }
    return parsedUrl.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
};
// Sanitize HTML content to prevent XSS
export const sanitizeHtml = (html: string): string => {
  // Basic HTML sanitization - in production, consider using a proper HTML sanitizer
  return html.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<iframe[^>]*>.*?<\/iframe>/gi, '').replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '');
};
// Error handling utilities
export class EmailServiceError extends Error {
  code;
  recoverable;
  constructor(message: string, code: string, recoverable = false) {
    super(message);
    this.code = code;
    this.recoverable = recoverable;
    this.name = 'EmailServiceError';
  }
}
export const handleError = (error: any, context: string): EmailServiceError => {
  logStep(`ERROR in ${context}`, {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  if (error instanceof EmailServiceError) {
    return error;
  }
  if (error instanceof Error) {
    return new EmailServiceError(error.message, 'UNKNOWN_ERROR');
  }
  return new EmailServiceError(String(error), 'UNKNOWN_ERROR');
};
// Retry utility for async operations
export const withRetry = async <T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
  let lastError;
  for(let attempt = 1; attempt <= maxRetries; attempt++){
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) {
        throw lastError;
      }
      logStep(`Retry attempt ${attempt}/${maxRetries}`, {
        error: lastError.message
      });
      await new Promise((resolve)=>setTimeout(resolve, delay * attempt));
    }
  }
  throw lastError;
};
