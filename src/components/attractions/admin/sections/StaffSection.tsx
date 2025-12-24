/**
 * StaffSection - Staff/Resource profile management
 * Photo upload, bio editing, specialties, and drag-drop reordering
 */

import React, { useState, useCallback } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import {
  User,
  Plus,
  Trash2,
  GripVertical,
  Camera,
  Star,
  Eye,
  EyeOff,
  X,
  Check,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StaffProfile } from '@/types/attraction-v3';

interface StaffSectionProps {
  staff: StaffProfile[];
  resourceLabel?: string;
  onStaffChange: (staff: StaffProfile[]) => void;
  onPhotoUpload?: (staffId: string, file: File) => Promise<string>;
  className?: string;
}

export const StaffSection: React.FC<StaffSectionProps> = ({
  staff,
  resourceLabel = 'Staff Member',
  onStaffChange,
  onPhotoUpload,
  className,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add new staff member
  const addStaffMember = () => {
    const newMember: StaffProfile = {
      id: crypto.randomUUID(),
      name: '',
      capacity: 1,
      is_active: true,
      show_on_widget: true,
      display_order: staff.length,
      specialties: [],
    };
    onStaffChange([...staff, newMember]);
    setEditingId(newMember.id);
  };

  // Update staff member
  const updateStaffMember = (id: string, updates: Partial<StaffProfile>) => {
    onStaffChange(
      staff.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // Remove staff member
  const removeStaffMember = (id: string) => {
    onStaffChange(staff.filter((s) => s.id !== id));
  };

  // Handle reorder
  const handleReorder = (newOrder: StaffProfile[]) => {
    onStaffChange(
      newOrder.map((s, idx) => ({ ...s, display_order: idx }))
    );
  };

  // Handle photo upload
  const handlePhotoChange = async (
    staffId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !onPhotoUpload) return;

    try {
      const url = await onPhotoUpload(staffId, file);
      updateStaffMember(staffId, { photo_url: url });
    } catch (error) {
      console.error('Failed to upload photo:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
            {resourceLabel} Profiles
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add profiles that customers can choose from when booking
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={addStaffMember}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {resourceLabel}
        </motion.button>
      </div>

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-xl border-2 border-dashed border-border">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No {resourceLabel.toLowerCase()}s added yet</p>
          <button
            onClick={addStaffMember}
            className="mt-3 text-primary text-sm font-medium hover:underline"
          >
            Add your first {resourceLabel.toLowerCase()}
          </button>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={staff}
          onReorder={handleReorder}
          className="space-y-3"
        >
          {staff.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              isEditing={editingId === member.id}
              onEdit={() => setEditingId(member.id)}
              onSave={() => setEditingId(null)}
              onUpdate={(updates) => updateStaffMember(member.id, updates)}
              onRemove={() => removeStaffMember(member.id)}
              onPhotoChange={(e) => handlePhotoChange(member.id, e)}
              hasPhotoUpload={!!onPhotoUpload}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
};

// Individual staff card
const StaffCard: React.FC<{
  member: StaffProfile;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<StaffProfile>) => void;
  onRemove: () => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasPhotoUpload: boolean;
}> = ({
  member,
  isEditing,
  onEdit,
  onSave,
  onUpdate,
  onRemove,
  onPhotoChange,
  hasPhotoUpload,
}) => {
  const [newSpecialty, setNewSpecialty] = useState('');

  const addSpecialty = () => {
    if (newSpecialty.trim()) {
      onUpdate({
        specialties: [...(member.specialties || []), newSpecialty.trim()],
      });
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (index: number) => {
    const newSpecialties = [...(member.specialties || [])];
    newSpecialties.splice(index, 1);
    onUpdate({ specialties: newSpecialties });
  };

  return (
    <Reorder.Item
      value={member}
      className={cn(
        'bg-card border border-border rounded-xl overflow-hidden',
        !member.is_active && 'opacity-60'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <div className="pt-2 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Photo */}
          <div className="relative group">
            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={member.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            )}

            {hasPhotoUpload && isEditing && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={onPhotoChange}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-4">
                {/* Name */}
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="Name"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />

                {/* Bio */}
                <textarea
                  value={member.bio || ''}
                  onChange={(e) => onUpdate({ bio: e.target.value })}
                  placeholder="Short bio (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />

                {/* Specialties */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Specialties
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(member.specialties || []).map((specialty, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {specialty}
                        <button onClick={() => removeSpecialty(idx)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSpecialty()}
                        placeholder="Add..."
                        className="w-20 px-2 py-1 text-xs border border-border rounded-full bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                      {newSpecialty && (
                        <button
                          onClick={addSpecialty}
                          className="p-1 text-primary hover:bg-primary/10 rounded-full"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Capacity */}
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Capacity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={member.capacity}
                      onChange={(e) =>
                        onUpdate({ capacity: parseInt(e.target.value) || 1 })
                      }
                      className="w-20 mt-1 px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={onSave}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg"
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
                    {member.name || 'Unnamed'}
                  </h4>
                  {member.rating_average && (
                    <span className="flex items-center gap-0.5 text-sm text-yellow-600">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {member.rating_average.toFixed(1)}
                    </span>
                  )}
                </div>

                {member.bio && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {member.bio}
                  </p>
                )}

                {(member.specialties?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {member.specialties?.slice(0, 3).map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                    {(member.specialties?.length ?? 0) > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{(member.specialties?.length ?? 0) - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions */}
          {!isEditing && (
            <div className="flex items-center gap-2">
              {/* Show on Widget Toggle */}
              <button
                onClick={() => onUpdate({ show_on_widget: !member.show_on_widget })}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  member.show_on_widget
                    ? 'text-primary hover:bg-primary/10'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                title={member.show_on_widget ? 'Visible on widget' : 'Hidden from widget'}
              >
                {member.show_on_widget ? (
                  <Eye className="w-5 h-5" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </button>

              {/* Active Toggle */}
              <button
                onClick={() => onUpdate({ is_active: !member.is_active })}
                className={cn(
                  'w-10 h-6 rounded-full transition-colors relative',
                  member.is_active ? 'bg-green-500' : 'bg-muted-foreground/30'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow',
                    member.is_active ? 'left-5' : 'left-1'
                  )}
                />
              </button>

              {/* Edit */}
              <button
                onClick={onEdit}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* Remove */}
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

export default StaffSection;
