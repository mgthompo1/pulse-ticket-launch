/**
 * AddOnsSectionWrapper - Self-contained add-ons management with Supabase
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
import { Loader2, Plus, Trash2, Package, DollarSign, GripVertical, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Addon {
  id: string;
  attraction_id: string;
  name: string;
  description: string | null;
  price: number;
  pricing_type: 'flat' | 'per_person' | 'percentage';
  is_required: boolean;
  is_active: boolean;
  max_quantity: number | null;
  category: string | null;
  display_order: number;
}

interface AddOnsSectionWrapperProps {
  attractionId: string;
}

export const AddOnsSectionWrapper: React.FC<AddOnsSectionWrapperProps> = ({ attractionId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch add-ons
  const { data: addons = [], isLoading } = useQuery({
    queryKey: ['attraction-addons-admin', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_addons')
        .select('*')
        .eq('attraction_id', attractionId)
        .order('display_order');

      if (error) throw error;
      return data as Addon[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('attraction_addons')
        .insert({
          attraction_id: attractionId,
          name: 'New Add-on',
          price: 0,
          pricing_type: 'flat',
          is_required: false,
          is_active: true,
          display_order: addons.length,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attraction-addons-admin', attractionId] });
      setEditingId(data.id);
      toast({ title: 'Add-on created' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Addon> }) => {
      const { error } = await supabase
        .from('attraction_addons')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-addons-admin', attractionId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attraction_addons')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-addons-admin', attractionId] });
      toast({ title: 'Add-on deleted' });
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
              <Package className="w-5 h-5" />
              Add-ons
            </CardTitle>
            <CardDescription>
              Create upsell options for your customers
            </CardDescription>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {addons.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No add-ons yet. Create your first add-on to upsell to customers.
          </p>
        ) : (
          <div className="space-y-4">
            {addons.map((addon) => (
              <AddonRow
                key={addon.id}
                addon={addon}
                isEditing={editingId === addon.id}
                onEdit={() => setEditingId(addon.id)}
                onSave={() => setEditingId(null)}
                onUpdate={(updates) => updateMutation.mutate({ id: addon.id, updates })}
                onDelete={() => deleteMutation.mutate(addon.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Individual addon row
const AddonRow: React.FC<{
  addon: Addon;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<Addon>) => void;
  onDelete: () => void;
}> = ({ addon, isEditing, onEdit, onSave, onUpdate, onDelete }) => {
  const [localData, setLocalData] = useState(addon);

  useEffect(() => {
    setLocalData(addon);
  }, [addon]);

  const handleSave = () => {
    onUpdate(localData);
    onSave();
  };

  if (isEditing) {
    return (
      <div className="border border-border rounded-lg p-4 space-y-4 bg-muted">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={localData.name}
              onChange={(e) => setLocalData({ ...localData, name: e.target.value })}
              placeholder="Add-on name"
            />
          </div>
          <div className="space-y-2">
            <Label>Price</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={localData.price}
                onChange={(e) => setLocalData({ ...localData, price: parseFloat(e.target.value) || 0 })}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={localData.description || ''}
            onChange={(e) => setLocalData({ ...localData, description: e.target.value })}
            placeholder="Describe this add-on..."
            rows={2}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Pricing Type</Label>
            <Select
              value={localData.pricing_type}
              onValueChange={(value: 'flat' | 'per_person') => setLocalData({ ...localData, pricing_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat rate</SelectItem>
                <SelectItem value="per_person">Per person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              value={localData.category || ''}
              onChange={(e) => setLocalData({ ...localData, category: e.target.value })}
              placeholder="e.g., Equipment, Food"
            />
          </div>

          <div className="space-y-2">
            <Label>Max Quantity</Label>
            <Input
              type="number"
              min={1}
              value={localData.max_quantity || ''}
              onChange={(e) => setLocalData({ ...localData, max_quantity: parseInt(e.target.value) || null })}
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
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
      'border border-border rounded-lg p-4 flex items-center gap-4',
      !addon.is_active && 'opacity-50'
    )}>
      <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{addon.name}</span>
          {addon.is_required && (
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs rounded-full">Required</span>
          )}
          {addon.category && (
            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">{addon.category}</span>
          )}
        </div>
        {addon.description && (
          <p className="text-sm text-muted-foreground truncate">{addon.description}</p>
        )}
      </div>

      <div className="text-right">
        <span className="font-semibold">${addon.price.toFixed(2)}</span>
        {addon.pricing_type === 'per_person' && (
          <span className="text-sm text-muted-foreground"> /person</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AddOnsSectionWrapper;
