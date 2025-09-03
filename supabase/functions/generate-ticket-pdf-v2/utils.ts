import { PDF_CONFIG } from './config.ts';
import { ValidationResult, ImageData } from './types.ts';

// Input validation utilities
export class ValidationUtils {
  static validateOrderId(orderId: unknown): ValidationResult {
    if (!orderId || typeof orderId !== 'string') {
      return { isValid: false, error: PDF_CONFIG.ERROR_MESSAGES.INVALID_ORDER_ID };
    }
    
    const sanitized = orderId.trim();
    if (sanitized.length === 0 || sanitized.length > 100) {
      return { isValid: false, error: 'Order ID must be between 1 and 100 characters' };
    }
    
    // Check for valid UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sanitized)) {
      return { isValid: false, error: 'Order ID must be a valid UUID' };
    }
    
    return { isValid: true, sanitizedValue: sanitized };
  }

  static validateImageUrl(url: unknown): ValidationResult {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL must be a string' };
    }

    const sanitized = url.trim();
    if (sanitized.length === 0) {
      return { isValid: false, error: 'URL cannot be empty' };
    }

    if (sanitized.length > PDF_CONFIG.SECURITY.MAX_URL_LENGTH) {
      return { isValid: false, error: 'URL too long' };
    }

    // Data URLs are allowed for base64 images
    if (sanitized.startsWith('data:')) {
      const dataUrlRegex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i;
      if (!dataUrlRegex.test(sanitized)) {
        return { isValid: false, error: 'Invalid data URL format' };
      }
      return { isValid: true, sanitizedValue: sanitized };
    }

    // Validate HTTP/HTTPS URLs
    try {
      const urlObj = new URL(sanitized);
      
      if (!PDF_CONFIG.SECURITY.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
        return { isValid: false, error: 'Protocol not allowed' };
      }

      // Check if domain is in allowed list (optional whitelist)
      const hostname = urlObj.hostname.toLowerCase();
      const isAllowedDomain = PDF_CONFIG.SECURITY.ALLOWED_IMAGE_DOMAINS.some(
        domain => hostname.endsWith(domain.toLowerCase())
      );
      
      if (!isAllowedDomain) {
        console.warn(`Image domain not in whitelist: ${hostname}`);
        // Still allow but log warning - you may want to make this stricter
      }

      return { isValid: true, sanitizedValue: sanitized };
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  static sanitizeText(text: unknown, fallback: string = 'N/A'): string {
    if (!text || typeof text !== 'string') return fallback;
    
    // Remove control characters, null bytes, and excessive whitespace
    const sanitized = text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return sanitized || fallback;
  }

  static validateDate(dateString: unknown): ValidationResult {
    if (!dateString || typeof dateString !== 'string') {
      return { isValid: false, error: 'Date must be a string' };
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return { isValid: false, error: 'Invalid date format' };
      }
      return { isValid: true, sanitizedValue: date.toISOString() };
    } catch {
      return { isValid: false, error: 'Date parsing failed' };
    }
  }
}

// Security utilities
export class SecurityUtils {
  static async fetchImageWithSecurity(url: string): Promise<ImageData | null> {
    const validation = ValidationUtils.validateImageUrl(url);
    if (!validation.isValid) {
      console.warn(`Invalid image URL: ${validation.error}`);
      return null;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, PDF_CONFIG.TIMEOUTS.IMAGE_FETCH);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TicketFlo-PDF-Generator/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > PDF_CONFIG.LIMITS.MAX_IMAGE_SIZE) {
        throw new Error('Image too large');
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > PDF_CONFIG.LIMITS.MAX_IMAGE_SIZE) {
        throw new Error('Image size exceeds limit');
      }

      return SecurityUtils.processImageData(arrayBuffer, contentType);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Image fetch timed out:', url);
      } else {
        console.warn('Image fetch failed:', error.message);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static processImageData(arrayBuffer: ArrayBuffer, contentType: string): ImageData {
    // Use Uint8Array for better performance than string concatenation
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...bytes));
    
    const isJpeg = contentType.includes('jpeg') || contentType.includes('jpg');
    const format: 'PNG' | 'JPEG' = isJpeg ? 'JPEG' : 'PNG';
    const dataUrl = `data:${contentType};base64,${base64}`;
    
    return { dataUrl, format };
  }
}

// Date formatting utilities
export class DateUtils {
  static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      return date.toLocaleDateString(
        PDF_CONFIG.DATE_FORMAT.LOCALE,
        PDF_CONFIG.DATE_FORMAT.DATE_OPTIONS
      );
    } catch {
      return dateString;
    }
  }

  static formatTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString(
        PDF_CONFIG.DATE_FORMAT.LOCALE,
        PDF_CONFIG.DATE_FORMAT.TIME_OPTIONS
      );
    } catch {
      return '';
    }
  }
}

// Error handling utilities
export class ErrorUtils {
  static createError(message: string, code?: string, details?: any): Error {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    if (details) {
      (error as any).details = details;
    }
    return error;
  }

  static logError(context: string, error: unknown, additionalData?: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[PDF-GEN-ERROR] ${context}:`, {
      message: errorMessage,
      stack: errorStack,
      ...additionalData,
    });
  }

  static isTimeoutError(error: unknown): boolean {
    return error instanceof Error && 
           (error.name === 'AbortError' || error.message.includes('timeout'));
  }
}

// Performance utilities
export class PerformanceUtils {
  private static timers = new Map<string, number>();

  static startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  static endTimer(label: string): number {
    const start = this.timers.get(label);
    if (!start) return 0;
    
    const duration = Date.now() - start;
    this.timers.delete(label);
    console.log(`[PERF] ${label}: ${duration}ms`);
    return duration;
  }

  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string = 'Operation timed out'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = PDF_CONFIG.RETRY.MAX_ATTEMPTS,
    backoffMs: number = PDF_CONFIG.RETRY.BACKOFF_MS
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Exponential backoff
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Retry attempt ${attempt}/${maxAttempts} failed:`, lastError.message);
      }
    }
    
    throw lastError;
  }
}

// Memory management utilities
export class MemoryUtils {
  static cleanup(...objects: any[]): void {
    // Explicitly null out references to help GC
    objects.forEach(obj => {
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          try {
            obj[key] = null;
          } catch {
            // Ignore errors for read-only properties
          }
        });
      }
    });
  }

  static getMemoryUsage(): { used: number; total: number } {
    // Deno-specific memory information
    try {
      const memInfo = Deno.memoryUsage();
      return {
        used: memInfo.rss / 1024 / 1024, // Convert to MB
        total: memInfo.heapTotal / 1024 / 1024,
      };
    } catch {
      return { used: 0, total: 0 };
    }
  }

  static logMemoryUsage(context: string): void {
    const memory = this.getMemoryUsage();
    console.log(`[MEMORY] ${context}: ${memory.used.toFixed(1)}MB used, ${memory.total.toFixed(1)}MB total`);
  }
}
