/**
 * ProgressStepper - Multi-step booking progress indicator
 * Premium design with animations inspired by Linear/Stripe
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Calendar, Clock, User, ShoppingBag, FileText, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingStep } from '@/types/attraction-v3';

interface Step {
  id: BookingStep;
  label: string;
  icon: React.ReactNode;
}

interface ProgressStepperProps {
  steps: { id: BookingStep; label: string }[] | BookingStep[];
  currentStep: BookingStep;
  completedSteps?: BookingStep[];
  onStepClick?: (step: BookingStep) => void;
  className?: string;
  compact?: boolean;
}

const stepIcons: Record<BookingStep, React.ReactNode> = {
  date: <Calendar className="w-4 h-4" />,
  time: <Clock className="w-4 h-4" />,
  staff: <User className="w-4 h-4" />,
  addons: <ShoppingBag className="w-4 h-4" />,
  details: <FileText className="w-4 h-4" />,
  payment: <CreditCard className="w-4 h-4" />,
  confirmation: <Check className="w-4 h-4" />,
};

const stepLabels: Record<BookingStep, string> = {
  date: 'Date',
  time: 'Time',
  staff: 'Staff',
  addons: 'Add-ons',
  details: 'Details',
  payment: 'Payment',
  confirmation: 'Done',
};

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  steps: stepsInput,
  currentStep,
  completedSteps = [],
  onStepClick,
  className,
  compact = false,
}) => {
  // Normalize steps to BookingStep array
  const steps: BookingStep[] = stepsInput.map((s) =>
    typeof s === 'string' ? s : s.id
  );

  // Build custom labels map from input
  const customLabels: Partial<Record<BookingStep, string>> = {};
  stepsInput.forEach((s) => {
    if (typeof s !== 'string' && s.label) {
      customLabels[s.id] = s.label;
    }
  });

  // Get label for a step (prefer custom, fallback to default)
  const getLabel = (step: BookingStep): string => {
    return customLabels[step] || stepLabels[step];
  };

  const currentIndex = steps.indexOf(currentStep);

  const getStepStatus = (step: BookingStep): 'completed' | 'active' | 'pending' => {
    // Auto-calculate completed steps based on current position
    const stepIndex = steps.indexOf(step);
    if (stepIndex < currentIndex) return 'completed';
    if (completedSteps.includes(step)) return 'completed';
    if (step === currentStep) return 'active';
    return 'pending';
  };

  const isClickable = (step: BookingStep): boolean => {
    if (!onStepClick) return false;
    const stepIndex = steps.indexOf(step);
    return stepIndex <= currentIndex || completedSteps.includes(step);
  };

  if (compact) {
    return (
      <div className={cn('flex items-center justify-center gap-2', className)}>
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          return (
            <React.Fragment key={step}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-all duration-300',
                  status === 'completed' && 'bg-green-500',
                  status === 'active' && 'bg-primary w-6 rounded-full',
                  status === 'pending' && 'bg-muted'
                )}
              />
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <nav className={cn('w-full', className)} aria-label="Booking progress">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const isLast = index === steps.length - 1;
          const clickable = isClickable(step);

          return (
            <li
              key={step}
              className={cn('flex items-center', !isLast && 'flex-1')}
            >
              {/* Step Circle */}
              <motion.button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(step)}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
                className={cn(
                  'relative flex items-center justify-center w-10 h-10 rounded-full',
                  'transition-all duration-300 focus:outline-none',
                  clickable && 'cursor-pointer hover:scale-105',
                  !clickable && 'cursor-default',
                  // Status-based styles
                  status === 'pending' && 'bg-muted text-muted-foreground border-2 border-border',
                  status === 'active' && 'bg-primary text-primary-foreground border-2 border-primary shadow-lg',
                  status === 'completed' && 'bg-green-500 text-white border-2 border-green-500'
                )}
                aria-current={status === 'active' ? 'step' : undefined}
              >
                {/* Pulse animation for active step */}
                {status === 'active' && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-primary"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}

                {/* Icon or checkmark */}
                <span className="relative z-10">
                  {status === 'completed' ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <Check className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    stepIcons[step]
                  )}
                </span>
              </motion.button>

              {/* Step Label (hidden on mobile) */}
              <span
                className={cn(
                  'hidden sm:block ml-3 text-sm font-medium transition-colors',
                  status === 'active' && 'text-primary',
                  status === 'completed' && 'text-green-600',
                  status === 'pending' && 'text-muted-foreground'
                )}
              >
                {getLabel(step)}
              </span>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 mx-4">
                  <div className="relative h-0.5 bg-border rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-green-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: status === 'completed' || steps.indexOf(step) < currentIndex
                          ? '100%'
                          : '0%',
                      }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile Step Counter */}
      <div className="sm:hidden mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          Step {currentIndex + 1} of {steps.length}:{' '}
          <span className="font-medium text-foreground">{getLabel(currentStep)}</span>
        </p>
      </div>
    </nav>
  );
};

// Minimal version for embedding in cards
export const ProgressDots: React.FC<{
  total: number;
  current: number;
  className?: string;
}> = ({ total, current, className }) => {
  return (
    <div className={cn('flex items-center justify-center gap-1.5', className)}>
      {Array.from({ length: total }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            index === current
              ? 'w-6 bg-primary'
              : index < current
              ? 'w-1.5 bg-green-500'
              : 'w-1.5 bg-muted'
          )}
        />
      ))}
    </div>
  );
};

export default ProgressStepper;
