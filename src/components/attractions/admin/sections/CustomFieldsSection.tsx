/**
 * CustomFieldsSection - Custom booking form field builder
 * Drag-drop field ordering with various field types
 */

import React, { useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Trash2,
  GripVertical,
  Type,
  Mail,
  Phone,
  Hash,
  Calendar,
  CheckSquare,
  List,
  AlignLeft,
  X,
  Check,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomFormField } from '@/types/attraction-v3';

interface CustomFieldsSectionProps {
  fields: CustomFormField[];
  onFieldsChange: (fields: CustomFormField[]) => void;
  className?: string;
}

const FIELD_TYPES = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'select', label: 'Dropdown', icon: List },
  { type: 'textarea', label: 'Long Text', icon: AlignLeft },
] as const;

export const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  fields,
  onFieldsChange,
  className,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // Add new field
  const addField = (type: CustomFormField['field_type']) => {
    const newField: CustomFormField = {
      id: crypto.randomUUID(),
      attraction_id: '',
      field_type: type,
      label: '',
      placeholder: '',
      is_required: false,
      display_order: fields.length,
      is_active: true,
      options: type === 'select' ? [{ value: '', label: '' }] : undefined,
    };
    onFieldsChange([...fields, newField]);
    setEditingId(newField.id);
    setShowTypeSelector(false);
  };

  // Update field
  const updateField = (id: string, updates: Partial<CustomFormField>) => {
    onFieldsChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  // Remove field
  const removeField = (id: string) => {
    onFieldsChange(fields.filter((f) => f.id !== id));
  };

  // Handle reorder
  const handleReorder = (newOrder: CustomFormField[]) => {
    onFieldsChange(newOrder.map((f, idx) => ({ ...f, display_order: idx })));
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Section Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          Custom Booking Fields
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add custom questions to collect information from customers
        </p>
      </div>

      {/* Fields List */}
      {fields.length > 0 && (
        <Reorder.Group
          axis="y"
          values={fields}
          onReorder={handleReorder}
          className="space-y-3"
        >
          {fields.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              isEditing={editingId === field.id}
              onEdit={() => setEditingId(field.id)}
              onSave={() => setEditingId(null)}
              onUpdate={(updates) => updateField(field.id, updates)}
              onRemove={() => removeField(field.id)}
            />
          ))}
        </Reorder.Group>
      )}

      {/* Add Field Button */}
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowTypeSelector(!showTypeSelector)}
          className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Custom Field
        </motion.button>

        {/* Type Selector Dropdown */}
        <AnimatePresence>
          {showTypeSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 p-2 bg-card border border-border rounded-xl shadow-lg z-10"
            >
              <div className="grid grid-cols-4 gap-2">
                {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => addField(type)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {fields.length === 0 && !showTypeSelector && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No custom fields added yet. Click the button above to add one.
        </div>
      )}
    </div>
  );
};

// Field Card Component
const FieldCard: React.FC<{
  field: CustomFormField;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<CustomFormField>) => void;
  onRemove: () => void;
}> = ({ field, isEditing, onEdit, onSave, onUpdate, onRemove }) => {
  const fieldTypeInfo = FIELD_TYPES.find((t) => t.type === field.field_type);
  const Icon = fieldTypeInfo?.icon || Type;

  // Add option for select fields
  const addOption = () => {
    const currentOptions = field.options || [];
    onUpdate({
      options: [...currentOptions, { value: '', label: '' }],
    });
  };

  // Update option
  const updateOption = (index: number, updates: { value?: string; label?: string }) => {
    const currentOptions = [...(field.options || [])];
    currentOptions[index] = { ...currentOptions[index], ...updates };
    // Auto-generate value from label if not set
    if (updates.label && !currentOptions[index].value) {
      currentOptions[index].value = updates.label.toLowerCase().replace(/\s+/g, '_');
    }
    onUpdate({ options: currentOptions });
  };

  // Remove option
  const removeOption = (index: number) => {
    const currentOptions = [...(field.options || [])];
    currentOptions.splice(index, 1);
    onUpdate({ options: currentOptions });
  };

  return (
    <Reorder.Item
      value={field}
      className={cn(
        'bg-card border border-border rounded-xl overflow-hidden',
        !field.is_active && 'opacity-60'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <div className="pt-2 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                {/* Label */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Field Label
                  </label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => onUpdate({ label: e.target.value })}
                    placeholder="e.g., Dietary Requirements"
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
                    autoFocus
                  />
                </div>

                {/* Placeholder (for text-based fields) */}
                {['text', 'email', 'phone', 'number', 'textarea'].includes(field.field_type) && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Placeholder Text
                    </label>
                    <input
                      type="text"
                      value={field.placeholder || ''}
                      onChange={(e) => onUpdate({ placeholder: e.target.value })}
                      placeholder="e.g., Enter your dietary requirements..."
                      className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
                    />
                  </div>
                )}

                {/* Options (for select fields) */}
                {field.field_type === 'select' && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Options
                    </label>
                    <div className="space-y-2 mt-2">
                      {(field.options || []).map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => updateOption(idx, { label: e.target.value })}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
                          />
                          {(field.options?.length || 0) > 1 && (
                            <button
                              onClick={() => removeOption(idx)}
                              className="p-2 text-destructive/70 hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addOption}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Plus className="w-4 h-4" />
                        Add Option
                      </button>
                    </div>
                  </div>
                )}

                {/* Required Toggle */}
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.is_required}
                      onChange={(e) => onUpdate({ is_required: e.target.checked })}
                      className="rounded"
                    />
                    Required field
                  </label>

                  <button
                    onClick={onSave}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg ml-auto"
                  >
                    <Check className="w-4 h-4" />
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">
                    {field.label || 'Untitled Field'}
                  </h4>
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                    {fieldTypeInfo?.label}
                  </span>
                  {field.is_required && (
                    <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-xs rounded-full">
                      Required
                    </span>
                  )}
                </div>
                {field.placeholder && (
                  <p className="text-sm text-muted-foreground mt-1">"{field.placeholder}"</p>
                )}
                {field.field_type === 'select' && field.options && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {field.options.length} option{field.options.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdate({ is_active: !field.is_active })}
                className={cn(
                  'w-10 h-6 rounded-full transition-colors relative',
                  field.is_active ? 'bg-green-500' : 'bg-muted-foreground/30'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow',
                    field.is_active ? 'left-5' : 'left-1'
                  )}
                />
              </button>
              <button
                onClick={onEdit}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={onRemove}
                className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
};

// Preview of how the field would look
export const CustomFieldPreview: React.FC<{
  field: CustomFormField;
}> = ({ field }) => {
  switch (field.field_type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.is_required && <span className="text-red-500">*</span>}
          </label>
          <input
            type={field.field_type}
            placeholder={field.placeholder}
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
          />
        </div>
      );
    case 'textarea':
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.is_required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            placeholder={field.placeholder}
            disabled
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 resize-none"
          />
        </div>
      );
    case 'select':
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.is_required && <span className="text-red-500">*</span>}
          </label>
          <select
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
          >
            <option value="">{field.placeholder || 'Select...'}</option>
            {(field.options || []).map((opt, i) => (
              <option key={i} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    case 'checkbox':
      return (
        <label className="flex items-center gap-2">
          <input type="checkbox" disabled className="rounded" />
          <span className="text-sm text-gray-700">{field.label}</span>
          {field.is_required && <span className="text-red-500">*</span>}
        </label>
      );
    case 'date':
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.is_required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="date"
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
          />
        </div>
      );
    default:
      return null;
  }
};

export default CustomFieldsSection;
