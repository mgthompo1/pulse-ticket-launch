/**
 * CustomerForm - Modern form with floating labels and custom fields
 * Material-style inputs with inline validation
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  ChevronDown,
  Check,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerInfo, CustomFormField } from '@/types/attraction-v3';
import { staggerContainer, staggerItem, fieldFocus, floatingLabel, inputShake } from '@/lib/animations';

interface CustomerFormProps {
  customerInfo: CustomerInfo;
  customFields?: CustomFormField[];
  customFieldValues: Map<string, any>;
  onCustomerInfoChange: (info: Partial<CustomerInfo>) => void;
  onCustomFieldChange: (fieldId: string, value: any) => void;
  errors?: Record<string, string>;
  className?: string;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  customerInfo,
  customFields = [],
  customFieldValues,
  onCustomerInfoChange,
  onCustomFieldChange,
  errors = {},
  className,
}) => {
  const activeCustomFields = customFields
    .filter((f) => f.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn('space-y-6', className)}
    >
      {/* Header */}
      <motion.div variants={staggerItem}>
        <h3 className="text-lg font-semibold text-foreground">Your Details</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We'll send your confirmation to this email
        </p>
      </motion.div>

      {/* Core Fields */}
      <motion.div variants={staggerItem} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <FloatingInput
            id="first_name"
            label="First Name"
            value={customerInfo.first_name}
            onChange={(v) => onCustomerInfoChange({ first_name: v })}
            error={errors.first_name}
            required
            icon={<User className="w-4 h-4" />}
          />
          <FloatingInput
            id="last_name"
            label="Last Name"
            value={customerInfo.last_name}
            onChange={(v) => onCustomerInfoChange({ last_name: v })}
            error={errors.last_name}
            required
          />
        </div>

        {/* Email */}
        <FloatingInput
          id="email"
          label="Email Address"
          type="email"
          value={customerInfo.email}
          onChange={(v) => onCustomerInfoChange({ email: v })}
          error={errors.email}
          required
          icon={<Mail className="w-4 h-4" />}
          hint="Confirmation will be sent here"
        />

        {/* Phone */}
        <FloatingInput
          id="phone"
          label="Phone Number"
          type="tel"
          value={customerInfo.phone || ''}
          onChange={(v) => onCustomerInfoChange({ phone: v })}
          error={errors.phone}
          icon={<Phone className="w-4 h-4" />}
          hint="For booking updates (optional)"
        />
      </motion.div>

      {/* Custom Fields */}
      {activeCustomFields.length > 0 && (
        <motion.div variants={staggerItem} className="space-y-4">
          <div className="flex items-center gap-2 pt-4 border-t border-border">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground">Additional Information</h4>
          </div>

          {activeCustomFields.map((field) => (
            <CustomFieldInput
              key={field.id}
              field={field}
              value={customFieldValues.get(field.id)}
              onChange={(value) => onCustomFieldChange(field.id, value)}
              error={errors[`custom_${field.id}`]}
            />
          ))}
        </motion.div>
      )}

      {/* Special Requests */}
      <motion.div variants={staggerItem}>
        <FloatingTextarea
          id="special_requests"
          label="Special Requests (Optional)"
          value={customerInfo.special_requests || ''}
          onChange={(v) => onCustomerInfoChange({ special_requests: v })}
          rows={3}
          hint="Dietary requirements, accessibility needs, etc."
        />
      </motion.div>

      {/* Marketing Opt-in */}
      <motion.div variants={staggerItem}>
        <Checkbox
          id="marketing_opt_in"
          checked={customerInfo.marketing_opt_in || false}
          onChange={(checked) => onCustomerInfoChange({ marketing_opt_in: checked })}
          label="Send me exclusive offers and updates"
          description="You can unsubscribe at any time"
        />
      </motion.div>
    </motion.div>
  );
};

// Floating label input component
interface FloatingInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  hint?: string;
  className?: string;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  required,
  disabled,
  icon,
  hint,
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const shouldFloat = isFocused || hasValue;

  return (
    <motion.div
      animate={error ? inputShake.animate : undefined}
      className={cn('relative', className)}
    >
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 bg-background text-foreground transition-all',
            'focus:outline-none peer',
            icon && 'pl-10',
            error
              ? 'border-red-300 focus:border-red-500'
              : 'border-border focus:border-primary',
            disabled && 'bg-muted cursor-not-allowed'
          )}
          placeholder=" "
        />

        {/* Floating Label */}
        <motion.label
          htmlFor={id}
          initial={false}
          animate={{
            y: shouldFloat ? -24 : 0,
            scale: shouldFloat ? 0.85 : 1,
            x: shouldFloat ? (icon ? -20 : 0) : 0,
          }}
          className={cn(
            'absolute left-4 top-3 text-muted-foreground pointer-events-none origin-left transition-colors',
            icon && 'left-10',
            shouldFloat && 'text-xs',
            isFocused && !error && 'text-primary',
            error && 'text-red-500'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </motion.label>

        {/* Success Check */}
        {hasValue && !error && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <Check className="w-4 h-4 text-green-500" />
          </motion.div>
        )}
      </div>

      {/* Error or Hint */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-1 text-xs text-red-500 flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 text-xs text-muted-foreground"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};

// Floating label textarea
const FloatingTextarea: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  error?: string;
  hint?: string;
  className?: string;
}> = ({ id, label, value, onChange, rows = 3, error, hint, className }) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const shouldFloat = isFocused || hasValue;

  return (
    <div className={cn('relative', className)}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={rows}
        className={cn(
          'w-full px-4 py-3 rounded-xl border-2 bg-background text-foreground transition-all resize-none',
          'focus:outline-none',
          error
            ? 'border-red-300 focus:border-red-500'
            : 'border-border focus:border-primary'
        )}
        placeholder=" "
      />

      <motion.label
        htmlFor={id}
        animate={{
          y: shouldFloat ? -24 : 0,
          scale: shouldFloat ? 0.85 : 1,
        }}
        className={cn(
          'absolute left-4 top-3 text-muted-foreground pointer-events-none origin-left',
          shouldFloat && 'text-xs',
          isFocused && 'text-primary'
        )}
      >
        {label}
      </motion.label>

      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
};

// Custom field input renderer
const CustomFieldInput: React.FC<{
  field: CustomFormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}> = ({ field, value, onChange, error }) => {
  switch (field.field_type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <FloatingInput
          id={field.id}
          label={field.label}
          type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
          value={value || ''}
          onChange={onChange}
          error={error}
          required={field.is_required}
          hint={field.placeholder}
        />
      );

    case 'number':
      return (
        <FloatingInput
          id={field.id}
          label={field.label}
          type="number"
          value={value?.toString() || ''}
          onChange={(v) => onChange(v ? Number(v) : null)}
          error={error}
          required={field.is_required}
        />
      );

    case 'textarea':
      return (
        <FloatingTextarea
          id={field.id}
          label={field.label}
          value={value || ''}
          onChange={onChange}
          error={error}
          hint={field.placeholder}
        />
      );

    case 'select':
      return (
        <SelectInput
          id={field.id}
          label={field.label}
          value={value || ''}
          onChange={onChange}
          options={field.options || []}
          error={error}
          required={field.is_required}
          placeholder={field.placeholder}
        />
      );

    case 'checkbox':
      return (
        <Checkbox
          id={field.id}
          checked={!!value}
          onChange={onChange}
          label={field.label}
          error={error}
        />
      );

    case 'date':
      return (
        <FloatingInput
          id={field.id}
          label={field.label}
          type="date"
          value={value || ''}
          onChange={onChange}
          error={error}
          required={field.is_required}
          icon={<Calendar className="w-4 h-4" />}
        />
      );

    default:
      return null;
  }
};

// Select input with floating label
const SelectInput: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
  placeholder?: string;
}> = ({ id, label, value, onChange, options, error, required, placeholder }) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const shouldFloat = isFocused || hasValue;

  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          'w-full px-4 py-3 rounded-xl border-2 bg-background text-foreground transition-all appearance-none',
          'focus:outline-none',
          error
            ? 'border-red-300 focus:border-red-500'
            : 'border-border focus:border-primary'
        )}
      >
        <option value="">{placeholder || 'Select...'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <motion.label
        htmlFor={id}
        animate={{
          y: shouldFloat ? -24 : 0,
          scale: shouldFloat ? 0.85 : 1,
        }}
        className={cn(
          'absolute left-4 top-3 text-muted-foreground pointer-events-none origin-left bg-background px-1',
          shouldFloat && 'text-xs',
          isFocused && 'text-primary'
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </motion.label>

      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />

      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

// Checkbox component
const Checkbox: React.FC<{
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  error?: string;
}> = ({ id, checked, onChange, label, description, error }) => {
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5',
          checked
            ? 'bg-primary border-primary'
            : 'border-border hover:border-muted-foreground',
          error && 'border-red-500'
        )}
      >
        {checked && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>
      <div>
        <label
          htmlFor={id}
          className="text-sm text-foreground cursor-pointer"
          onClick={() => onChange(!checked)}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
        {error && (
          <p className="text-xs text-red-500 mt-0.5">{error}</p>
        )}
      </div>
    </div>
  );
};

// Party size selector
export const PartySizeSelector: React.FC<{
  value: number;
  min?: number;
  max?: number;
  maxSize?: number; // Alias for max to support golf config
  onChange: (size: number) => void;
  pricePerPerson?: number;
  currency?: string;
  label?: string;
  className?: string;
}> = ({ value, min = 1, max = 20, maxSize, onChange, pricePerPerson, currency = 'USD', label, className }) => {
  const effectiveMax = maxSize || max;
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-muted-foreground">{label || 'Number of Guests'}</label>
      <div className="flex items-center gap-4">
        <div className="flex items-center border-2 border-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => onChange(Math.max(min, value - 1))}
            disabled={value <= min}
            className="px-4 py-2 text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            -
          </button>
          <span className="w-12 text-center font-semibold text-foreground">{value}</span>
          <button
            type="button"
            onClick={() => onChange(Math.min(effectiveMax, value + 1))}
            disabled={value >= effectiveMax}
            className="px-4 py-2 text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
        {pricePerPerson && (
          <span className="text-sm text-muted-foreground">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(pricePerPerson)} per person
          </span>
        )}
      </div>
    </div>
  );
};

export default CustomerForm;
