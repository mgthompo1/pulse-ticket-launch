/**
 * RequirementsCard - Display requirements and restrictions
 * Shows age, height, health, and equipment requirements with acknowledgement
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Info,
  Check,
  User,
  Ruler,
  Heart,
  Wrench,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttractionRequirement, RequirementType } from '@/types/attraction-v3';
import { staggerContainer, staggerItem, buttonTap } from '@/lib/animations';

interface RequirementsCardProps {
  requirements: AttractionRequirement[];
  acknowledgedIds: Set<string>;
  onAcknowledge: (requirementId: string) => void;
  className?: string;
}

const requirementIcons: Record<RequirementType, React.ReactNode> = {
  age_minimum: <User className="w-5 h-5" />,
  age_maximum: <User className="w-5 h-5" />,
  height_minimum: <Ruler className="w-5 h-5" />,
  height_maximum: <Ruler className="w-5 h-5" />,
  health: <Heart className="w-5 h-5" />,
  equipment: <Wrench className="w-5 h-5" />,
  skill_level: <AlertCircle className="w-5 h-5" />,
  waiver: <FileText className="w-5 h-5" />,
  custom: <Info className="w-5 h-5" />,
};

const getRequirementColor = (type: RequirementType, isBlocking: boolean): string => {
  if (isBlocking) return 'text-red-500 bg-red-50 border-red-200';

  switch (type) {
    case 'age_minimum':
    case 'age_maximum':
      return 'text-blue-500 bg-blue-50 border-blue-200';
    case 'height_minimum':
    case 'height_maximum':
      return 'text-purple-500 bg-purple-50 border-purple-200';
    case 'health':
      return 'text-red-500 bg-red-50 border-red-200';
    case 'waiver':
      return 'text-orange-500 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-500 bg-gray-50 border-gray-200';
  }
};

export const RequirementsCard: React.FC<RequirementsCardProps> = ({
  requirements,
  acknowledgedIds,
  onAcknowledge,
  className,
}) => {
  const sortedRequirements = [...(requirements || [])].sort((a, b) => {
    // Blocking first, then by display_order
    if (a.is_blocking !== b.is_blocking) return a.is_blocking ? -1 : 1;
    return a.display_order - b.display_order;
  });

  const blockingRequirements = sortedRequirements.filter((r) => r.is_blocking);
  const infoRequirements = sortedRequirements.filter((r) => !r.is_blocking);

  const allAcknowledged = sortedRequirements
    .filter((r) => r.acknowledgement_required)
    .every((r) => acknowledgedIds.has(r.id));

  if (requirements.length === 0) {
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
      <motion.div variants={staggerItem} className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900">Important Information</h3>
      </motion.div>

      {/* Blocking Requirements */}
      {blockingRequirements.length > 0 && (
        <motion.div variants={staggerItem} className="space-y-3">
          <p className="text-sm font-medium text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Requirements (must be met to book)
          </p>

          {blockingRequirements.map((req) => (
            <RequirementItem
              key={req.id}
              requirement={req}
              isAcknowledged={acknowledgedIds.has(req.id)}
              onAcknowledge={() => onAcknowledge(req.id)}
            />
          ))}
        </motion.div>
      )}

      {/* Info Requirements */}
      {infoRequirements.length > 0 && (
        <motion.div variants={staggerItem} className="space-y-3">
          {blockingRequirements.length > 0 && (
            <p className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Info className="w-4 h-4" />
              Good to know
            </p>
          )}

          {infoRequirements.map((req) => (
            <RequirementItem
              key={req.id}
              requirement={req}
              isAcknowledged={acknowledgedIds.has(req.id)}
              onAcknowledge={() => onAcknowledge(req.id)}
            />
          ))}
        </motion.div>
      )}

      {/* Summary */}
      {!allAcknowledged && (
        <motion.p
          variants={staggerItem}
          className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg"
        >
          Please acknowledge all requirements to continue with your booking.
        </motion.p>
      )}
    </motion.div>
  );
};

// Individual Requirement Item
const RequirementItem: React.FC<{
  requirement: AttractionRequirement;
  isAcknowledged: boolean;
  onAcknowledge: () => void;
}> = ({ requirement, isAcknowledged, onAcknowledge }) => {
  const colorClass = getRequirementColor(requirement.requirement_type, requirement.is_blocking);
  const icon = requirementIcons[requirement.requirement_type];

  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        'p-4 rounded-xl border transition-all',
        colorClass,
        isAcknowledged && 'opacity-75'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('p-2 rounded-lg', colorClass)}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{requirement.title}</h4>
            {requirement.value && (
              <span className="px-2 py-0.5 bg-white/50 rounded text-sm font-medium">
                {requirement.value}
                {requirement.unit && ` ${requirement.unit}`}
              </span>
            )}
          </div>

          {requirement.description && (
            <p className="text-sm text-gray-600 mt-1">{requirement.description}</p>
          )}

          {/* Acknowledgement Checkbox */}
          {requirement.acknowledgement_required && (
            <motion.button
              whileTap={buttonTap}
              onClick={onAcknowledge}
              className={cn(
                'mt-3 flex items-center gap-2 text-sm font-medium transition-colors',
                isAcknowledged ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  isAcknowledged
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                {isAcknowledged && <Check className="w-3 h-3 text-white" />}
              </div>
              <span>
                {isAcknowledged ? 'Acknowledged' : 'I understand and acknowledge'}
              </span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Compact inline version
export const RequirementsBadges: React.FC<{
  requirements: AttractionRequirement[];
  className?: string;
}> = ({ requirements, className }) => {
  const blockingReqs = (requirements || []).filter((r) => r.is_blocking);

  if (blockingReqs.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {blockingReqs.map((req) => (
        <span
          key={req.id}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"
        >
          {requirementIcons[req.requirement_type]}
          {req.title}
          {req.value && `: ${req.value}${req.unit || ''}`}
        </span>
      ))}
    </div>
  );
};

export default RequirementsCard;
