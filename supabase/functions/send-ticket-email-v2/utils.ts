// Utility functions for the email service
<<<<<<< HEAD
export const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TICKET-EMAIL] ${step}${detailsStr}`);
};

// Input validation functions
export const validateOrderId = (orderId: any): string => {
=======
export const logStep = (step, details)=>{
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TICKET-EMAIL] ${step}${detailsStr}`);
};
// Input validation functions
export const validateOrderId = (orderId)=>{
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
  if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
    throw new Error('Invalid order ID provided');
  }
  return orderId.trim();
};
<<<<<<< HEAD

export const validateEmailAddress = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// URL validation and sanitization
export const validateAndSanitizeUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
=======
export const validateEmailAddress = (email)=>{
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
// URL validation and sanitization
export const validateAndSanitizeUrl = (url)=>{
  try {
    const parsedUrl = new URL(url);
    // Only allow http and https protocols
    if (![
      'http:',
      'https:'
    ].includes(parsedUrl.protocol)) {
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
      throw new Error('Invalid URL protocol');
    }
    return parsedUrl.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
};
<<<<<<< HEAD

// Sanitize HTML content to prevent XSS
export const sanitizeHtml = (html: string): string => {
  // Basic HTML sanitization - in production, consider using a proper HTML sanitizer
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

// Error handling utilities
export class EmailServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

export const handleError = (error: unknown, context: string): EmailServiceError => {
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
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
=======
// Sanitize HTML content to prevent XSS
export const sanitizeHtml = (html)=>{
  // Basic HTML sanitization - in production, consider using a proper HTML sanitizer
  return html.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<iframe[^>]*>.*?<\/iframe>/gi, '').replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '');
};
// Error handling utilities
export class EmailServiceError extends Error {
  code;
  recoverable;
  constructor(message, code, recoverable = false){
    super(message);
    this.code = code;
    this.recoverable = recoverable;
    this.name = 'EmailServiceError';
  }
}
export const handleError = (error, context)=>{
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
export const withRetry = async (operation, maxRetries = 3, delay = 1000)=>{
  let lastError;
  for(let attempt = 1; attempt <= maxRetries; attempt++){
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
<<<<<<< HEAD
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      logStep(`Retry attempt ${attempt}/${maxRetries}`, { error: lastError.message });
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
=======
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
>>>>>>> 379c136 (fix: Apple Wallet button parameter name in send-ticket-email-v2)
};
