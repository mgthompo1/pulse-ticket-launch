import { useMemo } from 'react';
import {
  getPasswordStrength,
  calculatePasswordScore,
  getStrengthDescription,
  getStrengthColor,
  getStrengthBgColor,
  type PasswordStrength,
} from '@/lib/validation';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrengthIndicator = ({
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) => {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const score = useMemo(() => calculatePasswordScore(password), [password]);
  const description = useMemo(() => getStrengthDescription(strength), [strength]);

  // Calculate requirements
  const requirements = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    };
  }, [password]);

  const allRequirementsMet = Object.values(requirements).every(Boolean);

  // Don't show anything if no password
  if (!password) {
    return null;
  }

  // Calculate bar width based on score
  const barWidth = `${score}%`;

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStrengthBgColor(strength)}`}
            style={{ width: barWidth }}
          />
        </div>
        <p className={`text-xs font-medium ${getStrengthColor(strength)}`}>
          {description}
        </p>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Password must contain:</p>
          <div className="grid grid-cols-2 gap-2">
            <Requirement met={requirements.length} text="At least 8 characters" />
            <Requirement met={requirements.uppercase} text="Uppercase letter" />
            <Requirement met={requirements.lowercase} text="Lowercase letter" />
            <Requirement met={requirements.number} text="Number" />
          </div>
        </div>
      )}
    </div>
  );
};

interface RequirementProps {
  met: boolean;
  text: string;
}

const Requirement = ({ met, text }: RequirementProps) => {
  return (
    <div className="flex items-start gap-1.5">
      {met ? (
        <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
      )}
      <span
        className={`text-xs ${
          met ? 'text-green-700 font-medium' : 'text-gray-600'
        }`}
      >
        {text}
      </span>
    </div>
  );
};
