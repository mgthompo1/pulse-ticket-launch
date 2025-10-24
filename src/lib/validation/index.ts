/**
 * Validation utilities barrel export
 */

export {
  validateEmail,
  normalizeEmail,
  getEmailDomain,
  isDisposableEmail,
  validateEmailWithErrors,
  type EmailValidationResult,
} from './email';

export {
  validatePassword,
  getPasswordStrength,
  calculatePasswordScore,
  getStrengthDescription,
  getStrengthColor,
  getStrengthBgColor,
  validatePasswordMatch,
  generateStrongPassword,
  type PasswordStrength,
  type PasswordValidationResult,
  type PasswordRequirements,
} from './password';

export {
  type ValidationResult,
  type DetailedValidationResult,
} from './types';
