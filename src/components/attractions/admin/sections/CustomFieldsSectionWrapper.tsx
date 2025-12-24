/**
 * CustomFieldsSectionWrapper - Self-contained custom form fields management with Supabase
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, FormInput, GripVertical, Save, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomField {
  id: string;
  attraction_id: string;
  field_type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'time' | 'textarea' | 'file';
  label: string;
  placeholder: string | null;
  help_text: string | null;
  options: { value: string; label: string }[] | null;
  validation_rules: Record<string, any>;
  default_value: string | null;
  is_required: boolean;
  is_active: boolean;
  show_on_confirmation: boolean;
  show_on_email: boolean;
  display_order: number;
}

interface CustomFieldsSectionWrapperProps {
  attractionId: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
];

export const CustomFieldsSectionWrapper: React.FC<CustomFieldsSectionWrapperProps> = ({ attractionId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch custom fields
  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['attraction-custom-fields', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_custom_fields')
        .select('*')
        .eq('attraction_id', attractionId)
        .order('display_order');

      if (error) throw error;
      return data as CustomField[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('attraction_custom_fields')
        .insert({
          attraction_id: attractionId,
          field_type: 'text',
          label: 'New Field',
          is_required: false,
          is_active: true,
          show_on_confirmation: true,
          show_on_email: true,
          display_order: fields.length,
          validation_rules: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attraction-custom-fields', attractionId] });
      setEditingId(data.id);
      toast({ title: 'Field created' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CustomField> }) => {
      const { error } = await supabase
        .from('attraction_custom_fields')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-custom-fields', attractionId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attraction_custom_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-custom-fields', attractionId] });
      toast({ title: 'Field deleted' });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FormInput className="w-5 h-5" />
              Custom Form Fields
            </CardTitle>
            <CardDescription>
              Add custom fields to collect additional information from customers
            </CardDescription>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No custom fields yet. Add fields to collect additional information during booking.
          </p>
        ) : (
          <div className="space-y-4">
            {fields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                isEditing={editingId === field.id}
                onEdit={() => setEditingId(field.id)}
                onSave={() => setEditingId(null)}
                onUpdate={(updates) => updateMutation.mutate({ id: field.id, updates })}
                onDelete={() => deleteMutation.mutate(field.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Individual field row
const FieldRow: React.FC<{
  field: CustomField;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<CustomField>) => void;
  onDelete: () => void;
}> = ({ field, isEditing, onEdit, onSave, onUpdate, onDelete }) => {
  const [localData, setLocalData] = useState(field);
  const [optionsText, setOptionsText] = useState(
    field.options?.map(o => `${o.value}:${o.label}`).join('\n') || ''
  );

  useEffect(() => {
    setLocalData(field);
    setOptionsText(field.options?.map(o => `${o.value}:${o.label}`).join('\n') || '');
  }, [field]);

  const handleSave = () => {
    // Parse options if it's a select/multiselect
    let options = null;
    if (['select', 'multiselect'].includes(localData.field_type) && optionsText.trim()) {
      options = optionsText.split('\n').filter(Boolean).map(line => {
        const [value, label] = line.split(':');
        return { value: value?.trim() || '', label: label?.trim() || value?.trim() || '' };
      });
    }

    onUpdate({ ...localData, options });
    onSave();
  };

  const needsOptions = ['select', 'multiselect'].includes(localData.field_type);

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={localData.label}
              onChange={(e) => setLocalData({ ...localData, label: e.target.value })}
              placeholder="Field label"
            />
          </div>
          <div className="space-y-2">
            <Label>Field Type</Label>
            <Select
              value={localData.field_type}
              onValueChange={(value: CustomField['field_type']) => setLocalData({ ...localData, field_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={localData.placeholder || ''}
              onChange={(e) => setLocalData({ ...localData, placeholder: e.target.value })}
              placeholder="Placeholder text"
            />
          </div>
          <div className="space-y-2">
            <Label>Default Value</Label>
            <Input
              value={localData.default_value || ''}
              onChange={(e) => setLocalData({ ...localData, default_value: e.target.value })}
              placeholder="Default value (optional)"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Help Text</Label>
          <Input
            value={localData.help_text || ''}
            onChange={(e) => setLocalData({ ...localData, help_text: e.target.value })}
            placeholder="Additional instructions for the customer"
          />
        </div>

        {needsOptions && (
          <div className="space-y-2">
            <Label>Options (one per line, format: value:label)</Label>
            <Textarea
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder="option1:Option 1&#10;option2:Option 2&#10;option3:Option 3"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Enter each option on a new line. Format: value:label (e.g., "sm:Small")
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={localData.is_required}
              onCheckedChange={(checked) => setLocalData({ ...localData, is_required: checked })}
            />
            <Label>Required</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={localData.is_active}
              onCheckedChange={(checked) => setLocalData({ ...localData, is_active: checked })}
            />
            <Label>Active</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={localData.show_on_confirmation}
              onCheckedChange={(checked) => setLocalData({ ...localData, show_on_confirmation: checked })}
            />
            <Label>Show on Confirmation</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={localData.show_on_email}
              onCheckedChange={(checked) => setLocalData({ ...localData, show_on_email: checked })}
            />
            <Label>Show in Email</Label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onSave}>Cancel</Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'border rounded-lg p-4 flex items-center gap-4',
      !field.is_active && 'opacity-50'
    )}>
      <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{field.label}</span>
          {field.is_required && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Required</span>
          )}
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}
          </span>
        </div>
        {field.help_text && (
          <p className="text-sm text-muted-foreground truncate">{field.help_text}</p>
        )}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        {field.show_on_confirmation ? (
          <Eye className="w-4 h-4" title="Shown on confirmation" />
        ) : (
          <EyeOff className="w-4 h-4" title="Hidden on confirmation" />
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CustomFieldsSectionWrapper;
