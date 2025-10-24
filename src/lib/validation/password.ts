/**
 * Password validation utilities
 */

/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength?: PasswordStrength;
  score?: number; // 0-100
}

/**
 * Password requirements configuration
 */
export interface PasswordRequirements {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  maxLength?: number;
}

/**
 * Default password requirements
 */
const DEFAULT_REQUIREMENTS: Required<PasswordRequirements> = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  maxLength: 128,
};

/**
 * Common weak passwords to reject
 */
const COMMON_PASSWORDS = [
  'password',
  'password123',
  '12345678',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'monkey',
  '1234567890',
  'password1',
  'admin',
  'admin123',
];

/**
 * Special characters allowed in passwords
 */
const SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

/**
 * Validates a password against requirements
 *
 * @param password - The password to validate
 * @param requirements - Password requirements (optional, uses defaults)
 * @returns Validation result with errors and strength
 *
 * @example
 * validatePassword('Test123!')
 * // { valid: true, errors: [], strength: 'strong', score: 75 }
 *
 * validatePassword('weak')
 * // { valid: false, errors: ['Password must be at least 8 characters', ...] }
 */
export const validatePassword = (
  password: string,
  requirements: PasswordRequirements = {}
): PasswordValidationResult => {
  const reqs = { ...DEFAULT_REQUIREMENTS, ...requirements };
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password is required'],
    };
  }

  // Length validation
  if (password.length < reqs.minLength) {
    errors.push(`Password must be at least ${reqs.minLength} characters long`);
  }

  if (password.length > reqs.maxLength) {
    errors.push(`Password must not exceed ${reqs.maxLength} characters`);
  }

  // Character type validations
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (reqs.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (reqs.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (reqs.requireSpecialChars && !SPECIAL_CHARS.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  // Check against common passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(lowerPassword)) {
    errors.push('This password is too common. Please choose a more unique password');
  }

  // Check for sequential characters
  if (/012|123|234|345|456|567|678|789|890/.test(password)) {
    errors.push('Password should not contain sequential numbers');
  }

  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    errors.push('Password should not contain sequential letters');
  }

  // Calculate strength
  const strength = getPasswordStrength(password);
  const score = calculatePasswordScore(password);

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
};

/**
 * Gets the strength level of a password
 *
 * @param password - The password to evaluate
 * @returns Password strength level
 */
export const getPasswordStrength = (password: string): PasswordStrength => {
  const score = calculatePasswordScore(password);

  if (score >= 80) return 'very-strong';
  if (score >= 60) return 'strong';
  if (score >= 40) return 'medium';
  return 'weak';
};

/**
 * Calculates a numerical score for password strength (0-100)
 *
 * @param password - The password to score
 * @returns Score from 0 to 100
 */
export const calculatePasswordScore = (password: string): number => {
  if (!password) return 0;

  let score = 0;

  // Length scoring (up to 25 points)
  score += Math.min(password.length * 2, 25);

  // Character variety scoring (up to 60 points)
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = SPECIAL_CHARS.test(password);

  if (hasLower) score += 10;
  if (hasUpper) score += 10;
  if (hasNumber) score += 15;
  if (hasSpecial) score += 25;

  // Entropy scoring (up to 15 points)
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars, 15);

  // Penalties
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    score -= 30;
  }

  if (/(.)\1{2,}/.test(password)) {
    // Repeated characters
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * Gets user-friendly description of password strength
 *
 * @param strength - Password strength level
 * @returns Human-readable description
 */
export const getStrengthDescription = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'very-strong':
      return 'Excellent! Your password is very strong.';
    case 'strong':
      return 'Good! Your password is strong.';
    case 'medium':
      return 'Fair. Consider adding more variety to make it stronger.';
    case 'weak':
      return 'Weak. Please choose a stronger password.';
  }
};

/**
 * Gets color for password strength indicator
 *
 * @param strength - Password strength level
 * @returns CSS color class or value
 */
export const getStrengthColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'very-strong':
      return 'text-green-600';
    case 'strong':
      return 'text-blue-600';
    case 'medium':
      return 'text-yellow-600';
    case 'weak':
      return 'text-red-600';
  }
};

/**
 * Gets background color for password strength bar
 *
 * @param strength - Password strength level
 * @returns CSS color class or value
 */
export const getStrengthBgColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'very-strong':
      return 'bg-green-600';
    case 'strong':
      return 'bg-blue-600';
    case 'medium':
      return 'bg-yellow-600';
    case 'weak':
      return 'bg-red-600';
  }
};

/**
 * Validates that two passwords match
 *
 * @param password - The password
 * @param confirmPassword - The confirmation password
 * @returns Error message if they don't match, undefined if they do
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): string | undefined => {
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return undefined;
};

/**
 * Generates a random strong password
 *
 * @param length - Length of password (default: 16)
 * @returns Generated password
 */
export const generateStrongPassword = (length = 16): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = lowercase + uppercase + numbers + special;

  let password = '';

  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};
