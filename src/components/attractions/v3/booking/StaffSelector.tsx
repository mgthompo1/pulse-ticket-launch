/**
 * StaffSelector - Staff/Resource profile selection cards
 * Airbnb host-style cards with photos, bios, and specialties
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Star, CheckCircle, Users, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StaffProfile } from '@/types/attraction-v3';
import { staggerContainer, staggerItem, cardHover, buttonTap } from '@/lib/animations';

interface StaffSelectorProps {
  staff: StaffProfile[];
  selectedStaffId: string | null;
  resourceLabel?: string;
  showAnyOption?: boolean;
  anyOptionLabel?: string;
  onSelect: (staffId: string | null) => void;
  loading?: boolean;
  className?: string;
}

export const StaffSelector: React.FC<StaffSelectorProps> = ({
  staff,
  selectedStaffId,
  resourceLabel = 'Staff',
  showAnyOption = true,
  anyOptionLabel,
  onSelect,
  loading = false,
  className,
}) => {
  const activeStaff = (staff || []).filter((s) => s.is_active && s.show_on_widget);

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="skeleton-text w-40" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-card h-40" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (activeStaff.length === 0) {
    return null;
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn('space-y-4', className)}
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Choose your {resourceLabel.toLowerCase()}
        </h3>
        <span className="text-sm text-muted-foreground">
          {activeStaff.length} available
        </span>
      </motion.div>

      {/* Staff Cards */}
      <motion.div
        variants={staggerContainer}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {/* Any Available Option */}
        {showAnyOption && (
          <motion.button
            variants={staggerItem}
            whileHover={cardHover}
            whileTap={buttonTap}
            onClick={() => onSelect(null)}
            className={cn(
              'staff-card text-left p-4',
              selectedStaffId === null && 'staff-card-selected'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">
                  {anyOptionLabel || `Any ${resourceLabel}`}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  We'll assign the best available {resourceLabel.toLowerCase()}
                </p>
              </div>
              {selectedStaffId === null && (
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              )}
            </div>
          </motion.button>
        )}

        {/* Individual Staff Cards */}
        <AnimatePresence>
          {activeStaff.map((member, index) => {
            const isSelected = selectedStaffId === member.id;

            return (
              <motion.button
                key={member.id}
                variants={staggerItem}
                whileHover={cardHover}
                whileTap={buttonTap}
                onClick={() => onSelect(member.id)}
                className={cn(
                  'staff-card text-left',
                  isSelected && 'staff-card-selected'
                )}
              >
                {/* Selected Indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3"
                  >
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </motion.div>
                )}

                <div className="flex flex-col items-center text-center p-2">
                  {/* Photo */}
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.name}
                      className="staff-avatar w-20 h-20 mb-3"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-3">
                      <User className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}

                  {/* Name */}
                  <h4 className="font-semibold text-foreground">{member.name}</h4>

                  {/* Rating */}
                  {member.rating_average && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{member.rating_average.toFixed(1)}</span>
                      {member.booking_count && member.booking_count > 0 && (
                        <span className="text-sm text-muted-foreground">
                          ({member.booking_count} bookings)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bio Preview */}
                  {member.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {member.bio}
                    </p>
                  )}

                  {/* Specialties */}
                  {member.specialties && member.specialties.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                      {member.specialties.slice(0, 3).map((specialty, i) => (
                        <span key={i} className="staff-specialty-pill">
                          {specialty}
                        </span>
                      ))}
                      {member.specialties.length > 3 && (
                        <span className="staff-specialty-pill">
                          +{member.specialties.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// Compact horizontal scroll version
export const StaffStrip: React.FC<{
  staff: StaffProfile[];
  selectedStaffId: string | null;
  resourceLabel?: string;
  onSelect: (staffId: string | null) => void;
  className?: string;
}> = ({ staff, selectedStaffId, resourceLabel = 'Staff', onSelect, className }) => {
  const activeStaff = (staff || []).filter((s) => s.is_active && s.show_on_widget);

  return (
    <div className={cn('overflow-x-auto scrollbar-hide', className)}>
      <div className="flex gap-3 pb-2 scroll-snap-x">
        {/* Any Option */}
        <motion.button
          whileTap={buttonTap}
          onClick={() => onSelect(null)}
          className={cn(
            'flex-shrink-0 scroll-snap-item',
            'flex flex-col items-center p-3 rounded-xl border-2 min-w-[100px]',
            selectedStaffId === null
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-muted-foreground/30'
          )}
        >
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground">Any</span>
        </motion.button>

        {/* Staff Members */}
        {activeStaff.map((member) => {
          const isSelected = selectedStaffId === member.id;

          return (
            <motion.button
              key={member.id}
              whileTap={buttonTap}
              onClick={() => onSelect(member.id)}
              className={cn(
                'flex-shrink-0 scroll-snap-item',
                'flex flex-col items-center p-3 rounded-xl border-2 min-w-[100px]',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              )}
            >
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="w-12 h-12 rounded-full object-cover mb-2"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm font-medium text-foreground truncate max-w-[80px]">
                {member.name}
              </span>
              {member.rating_average && (
                <div className="flex items-center gap-0.5 mt-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">
                    {member.rating_average.toFixed(1)}
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default StaffSelector;
