/**
 * Shared validation types
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface DetailedValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}
