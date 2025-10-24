/**
 * Email validation utilities
 */

/**
 * Regular expression for validating email addresses
 * Follows RFC 5322 standards (simplified version)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * More comprehensive email regex that catches common mistakes
 */
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validates if a string is a valid email address
 *
 * @param email - The email address to validate
 * @param strict - Use strict validation (default: false)
 * @returns true if valid, false otherwise
 *
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid.email') // false
 * validateEmail('user@') // false
 */
export const validateEmail = (email: string, strict = false): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return false;
  }

  // Check length constraints
  if (trimmedEmail.length > 254) {
    return false;
  }

  const regex = strict ? STRICT_EMAIL_REGEX : EMAIL_REGEX;
  return regex.test(trimmedEmail);
};

/**
 * Normalizes an email address
 * - Trims whitespace
 * - Converts to lowercase
 *
 * @param email - The email address to normalize
 * @returns Normalized email address
 *
 * @example
 * normalizeEmail('  User@Example.COM  ') // 'user@example.com'
 */
export const normalizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') {
    return '';
  }

  return email.trim().toLowerCase();
};

/**
 * Gets the domain from an email address
 *
 * @param email - The email address
 * @returns The domain part, or empty string if invalid
 *
 * @example
 * getEmailDomain('user@example.com') // 'example.com'
 */
export const getEmailDomain = (email: string): string => {
  if (!validateEmail(email)) {
    return '';
  }

  const parts = email.split('@');
  return parts[1] || '';
};

/**
 * Common disposable email domains to block
 */
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'trashmail.com',
];

/**
 * Checks if an email uses a disposable email service
 *
 * @param email - The email address to check
 * @returns true if disposable, false otherwise
 */
export const isDisposableEmail = (email: string): boolean => {
  const domain = getEmailDomain(email).toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
};

/**
 * Email validation result with detailed error messages
 */
export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Comprehensive email validation with detailed error messages
 *
 * @param email - The email address to validate
 * @param options - Validation options
 * @returns Validation result with error message if invalid
 *
 * @example
 * validateEmailWithErrors('user@example.com')
 * // { valid: true, normalized: 'user@example.com' }
 *
 * validateEmailWithErrors('invalid')
 * // { valid: false, error: 'Please enter a valid email address' }
 */
export const validateEmailWithErrors = (
  email: string,
  options: {
    strict?: boolean;
    blockDisposable?: boolean;
  } = {}
): EmailValidationResult => {
  const { strict = false, blockDisposable = false } = options;

  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      error: 'Email address is required',
    };
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return {
      valid: false,
      error: 'Email address is required',
    };
  }

  if (trimmedEmail.length > 254) {
    return {
      valid: false,
      error: 'Email address is too long (maximum 254 characters)',
    };
  }

  const regex = strict ? STRICT_EMAIL_REGEX : EMAIL_REGEX;

  if (!regex.test(trimmedEmail)) {
    return {
      valid: false,
      error: 'Please enter a valid email address',
    };
  }

  const normalized = normalizeEmail(trimmedEmail);

  if (blockDisposable && isDisposableEmail(normalized)) {
    return {
      valid: false,
      error: 'Disposable email addresses are not allowed',
    };
  }

  return {
    valid: true,
    normalized,
  };
};
