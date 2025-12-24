/**
 * StaffSectionWrapper - Self-contained staff management with Supabase
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
import { Loader2, Plus, Trash2, Users, GripVertical, Save, Star, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffMember {
  id: string;
  attraction_id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  specialties: string[];
  capacity: number;
  is_active: boolean;
  show_on_widget: boolean;
  display_order: number;
  rating_average: number | null;
  booking_count: number;
}

interface StaffSectionWrapperProps {
  attractionId: string;
}

export const StaffSectionWrapper: React.FC<StaffSectionWrapperProps> = ({ attractionId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch staff members
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['attraction-staff-admin', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_resources')
        .select('*')
        .eq('attraction_id', attractionId)
        .order('display_order');

      if (error) throw error;
      return data as StaffMember[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('attraction_resources')
        .insert({
          attraction_id: attractionId,
          name: 'New Staff Member',
          capacity: 1,
          is_active: true,
          show_on_widget: true,
          display_order: staff.length,
          specialties: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attraction-staff-admin', attractionId] });
      setEditingId(data.id);
      toast({ title: 'Staff member added' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StaffMember> }) => {
      const { error } = await supabase
        .from('attraction_resources')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-staff-admin', attractionId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attraction_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-staff-admin', attractionId] });
      toast({ title: 'Staff member removed' });
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
              <Users className="w-5 h-5" />
              Staff / Resources
            </CardTitle>
            <CardDescription>
              Manage staff members who can be assigned to bookings
            </CardDescription>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {staff.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No staff members yet. Add your first staff member or resource.
          </p>
        ) : (
          <div className="space-y-4">
            {staff.map((member) => (
              <StaffRow
                key={member.id}
                member={member}
                isEditing={editingId === member.id}
                onEdit={() => setEditingId(member.id)}
                onSave={() => setEditingId(null)}
                onUpdate={(updates) => updateMutation.mutate({ id: member.id, updates })}
                onDelete={() => deleteMutation.mutate(member.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Individual staff row
const StaffRow: React.FC<{
  member: StaffMember;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<StaffMember>) => void;
  onDelete: () => void;
}> = ({ member, isEditing, onEdit, onSave, onUpdate, onDelete }) => {
  const [localData, setLocalData] = useState(member);
  const [specialtyInput, setSpecialtyInput] = useState('');

  useEffect(() => {
    setLocalData(member);
  }, [member]);

  const handleSave = () => {
    onUpdate(localData);
    onSave();
  };

  const addSpecialty = () => {
    if (specialtyInput.trim()) {
      setLocalData({
        ...localData,
        specialties: [...(localData.specialties || []), specialtyInput.trim()],
      });
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (index: number) => {
    setLocalData({
      ...localData,
      specialties: localData.specialties.filter((_, i) => i !== index),
    });
  };

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={localData.name}
              onChange={(e) => setLocalData({ ...localData, name: e.target.value })}
              placeholder="Staff member name"
            />
          </div>
          <div className="space-y-2">
            <Label>Capacity (concurrent bookings)</Label>
            <Input
              type="number"
              min={1}
              value={localData.capacity}
              onChange={(e) => setLocalData({ ...localData, capacity: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Photo URL</Label>
          <div className="flex gap-2">
            <Input
              value={localData.photo_url || ''}
              onChange={(e) => setLocalData({ ...localData, photo_url: e.target.value })}
              placeholder="https://example.com/photo.jpg"
            />
            <Button variant="outline" size="icon" disabled>
              <ImagePlus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            value={localData.bio || ''}
            onChange={(e) => setLocalData({ ...localData, bio: e.target.value })}
            placeholder="Brief description of this staff member..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Specialties</Label>
          <div className="flex gap-2">
            <Input
              value={specialtyInput}
              onChange={(e) => setSpecialtyInput(e.target.value)}
              placeholder="Add a specialty"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
            />
            <Button type="button" variant="outline" onClick={addSpecialty}>
              Add
            </Button>
          </div>
          {localData.specialties && localData.specialties.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {localData.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-1"
                >
                  {specialty}
                  <button
                    onClick={() => removeSpecialty(index)}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={localData.is_active}
              onCheckedChange={(checked) => setLocalData({ ...localData, is_active: checked })}
            />
            <Label>Active</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={localData.show_on_widget}
              onCheckedChange={(checked) => setLocalData({ ...localData, show_on_widget: checked })}
            />
            <Label>Show on Widget</Label>
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
      !member.is_active && 'opacity-50'
    )}>
      <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />

      {member.photo_url ? (
        <img
          src={member.photo_url}
          alt={member.name}
          className="w-12 h-12 rounded-full object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
          <Users className="w-6 h-6 text-gray-400" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{member.name}</span>
          {member.rating_average && (
            <span className="flex items-center gap-1 text-sm text-yellow-600">
              <Star className="w-3 h-3 fill-current" />
              {member.rating_average.toFixed(1)}
            </span>
          )}
          {!member.show_on_widget && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Hidden</span>
          )}
        </div>
        {member.specialties && member.specialties.length > 0 && (
          <div className="flex gap-1 mt-1">
            {member.specialties.slice(0, 3).map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{s}</span>
            ))}
            {member.specialties.length > 3 && (
              <span className="text-xs text-gray-400">+{member.specialties.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="text-right text-sm text-muted-foreground">
        <div>Capacity: {member.capacity}</div>
        {member.booking_count > 0 && <div>{member.booking_count} bookings</div>}
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

export default StaffSectionWrapper;
