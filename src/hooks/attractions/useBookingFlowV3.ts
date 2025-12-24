/**
 * useBookingFlowV3 - State machine for multi-step booking flow
 * Manages step progression, validation, and booking state
 */

import { useState, useCallback, useMemo } from 'react';
import {
  BookingFlowState,
  BookingStep,
  CustomerInfo,
  AttractionAddon,
  AttractionPackage,
  calculateBookingTotal,
} from '@/types/attraction-v3';

interface UseBookingFlowV3Props {
  attractionId: string;
  basePrice: number;
  currency?: string;
  addons?: AttractionAddon[];
  packages?: AttractionPackage[];
  requiresStaff?: boolean;
  hasAddons?: boolean;
  hasPackages?: boolean;
  hasRequirements?: boolean;
}

interface UseBookingFlowV3Return {
  state: BookingFlowState;
  currentStep: BookingStep;
  stepIndex: number;
  steps: BookingStep[];
  canProceed: boolean;
  canGoBack: boolean;
  isComplete: boolean;

  // Navigation
  goToStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Date & Time
  selectDate: (date: string) => void;
  selectSlot: (slotId: string, time: string) => void;

  // Staff
  selectStaff: (staffId: string | null) => void;

  // Party Size
  setPartySize: (size: number) => void;

  // Add-ons & Packages
  updateAddon: (addonId: string, quantity: number) => void;
  removeAddon: (addonId: string) => void;
  clearAddons: () => void;
  selectPackage: (packageId: string | null) => void;

  // Customer Info
  updateCustomerInfo: (info: Partial<CustomerInfo>) => void;
  updateCustomField: (fieldId: string, value: any) => void;

  // Requirements
  acknowledgeRequirement: (requirementId: string) => void;

  // Calculations
  calculateTotal: () => number;
  getAddonTotal: () => number;

  // Reset
  reset: () => void;
}

const DEFAULT_CUSTOMER_INFO: CustomerInfo = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  special_requests: '',
  marketing_opt_in: false,
};

const DEFAULT_STATE: BookingFlowState = {
  step: 'date',
  selectedDate: '',
  selectedSlotId: null,
  selectedTime: '',
  selectedStaffId: null,
  selectedAddons: new Map(),
  selectedPackageId: null,
  partySize: 1,
  customerInfo: DEFAULT_CUSTOMER_INFO,
  customFieldResponses: new Map(),
  acknowledgedRequirements: new Set(),
};

export function useBookingFlowV3({
  attractionId,
  basePrice,
  currency = 'USD',
  addons = [],
  packages = [],
  requiresStaff = false,
  hasAddons = false,
  hasPackages = false,
  hasRequirements = false,
}: UseBookingFlowV3Props): UseBookingFlowV3Return {
  const [state, setState] = useState<BookingFlowState>(DEFAULT_STATE);

  // Determine which steps are needed
  const steps = useMemo<BookingStep[]>(() => {
    const baseSteps: BookingStep[] = ['date', 'time'];

    if (requiresStaff) baseSteps.push('staff');
    if (hasAddons || hasPackages) baseSteps.push('addons');
    if (hasRequirements) baseSteps.push('requirements');

    baseSteps.push('details', 'payment', 'confirmation');

    return baseSteps;
  }, [requiresStaff, hasAddons, hasPackages, hasRequirements]);

  const currentStepIndex = steps.indexOf(state.step);

  // Validation for each step
  const validateStep = useCallback((step: BookingStep): boolean => {
    switch (step) {
      case 'date':
        return !!state.selectedDate;
      case 'time':
        return !!state.selectedSlotId;
      case 'staff':
        // Staff selection is optional (null means "any")
        return true;
      case 'addons':
        // Add-ons are optional
        return true;
      case 'requirements':
        // All required acknowledgements must be made
        // This would need to check against actual requirements
        return true;
      case 'details':
        return !!(
          state.customerInfo.first_name &&
          state.customerInfo.last_name &&
          state.customerInfo.email &&
          isValidEmail(state.customerInfo.email)
        );
      case 'payment':
        // Payment validation handled by payment component
        return true;
      case 'confirmation':
        return true;
      default:
        return false;
    }
  }, [state]);

  const canProceed = useMemo(() => {
    return validateStep(state.step);
  }, [state.step, validateStep]);

  const canGoBack = currentStepIndex > 0 && state.step !== 'confirmation';
  const isComplete = state.step === 'confirmation';

  // Navigation
  const goToStep = useCallback((step: BookingStep) => {
    if (steps.includes(step)) {
      setState((prev) => ({ ...prev, step }));
    }
  }, [steps]);

  const nextStep = useCallback(() => {
    if (canProceed && currentStepIndex < steps.length - 1) {
      setState((prev) => ({ ...prev, step: steps[currentStepIndex + 1] }));
    }
  }, [canProceed, currentStepIndex, steps]);

  const prevStep = useCallback(() => {
    if (canGoBack) {
      setState((prev) => ({ ...prev, step: steps[currentStepIndex - 1] }));
    }
  }, [canGoBack, currentStepIndex, steps]);

  // Date & Time
  const selectDate = useCallback((date: string) => {
    setState((prev) => ({
      ...prev,
      selectedDate: date,
      selectedSlotId: null, // Reset slot when date changes
      selectedTime: '',
    }));
  }, []);

  const selectSlot = useCallback((slotId: string, time: string) => {
    setState((prev) => ({
      ...prev,
      selectedSlotId: slotId,
      selectedTime: time,
    }));
  }, []);

  // Staff
  const selectStaff = useCallback((staffId: string | null) => {
    setState((prev) => ({ ...prev, selectedStaffId: staffId }));
  }, []);

  // Party Size
  const setPartySize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, partySize: Math.max(1, size) }));
  }, []);

  // Add-ons
  const updateAddon = useCallback((addonId: string, quantity: number) => {
    setState((prev) => {
      const newAddons = new Map(prev.selectedAddons);
      if (quantity <= 0) {
        newAddons.delete(addonId);
      } else {
        newAddons.set(addonId, quantity);
      }
      return { ...prev, selectedAddons: newAddons };
    });
  }, []);

  const removeAddon = useCallback((addonId: string) => {
    setState((prev) => {
      const newAddons = new Map(prev.selectedAddons);
      newAddons.delete(addonId);
      return { ...prev, selectedAddons: newAddons };
    });
  }, []);

  const clearAddons = useCallback(() => {
    setState((prev) => ({ ...prev, selectedAddons: new Map() }));
  }, []);

  const selectPackage = useCallback((packageId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedPackageId: packageId,
      // Clear individual addons when selecting a package
      selectedAddons: packageId ? new Map() : prev.selectedAddons,
    }));
  }, []);

  // Customer Info
  const updateCustomerInfo = useCallback((info: Partial<CustomerInfo>) => {
    setState((prev) => ({
      ...prev,
      customerInfo: { ...prev.customerInfo, ...info },
    }));
  }, []);

  const updateCustomField = useCallback((fieldId: string, value: any) => {
    setState((prev) => {
      const newResponses = new Map(prev.customFieldResponses);
      newResponses.set(fieldId, value);
      return { ...prev, customFieldResponses: newResponses };
    });
  }, []);

  // Requirements
  const acknowledgeRequirement = useCallback((requirementId: string) => {
    setState((prev) => {
      const newAck = new Set(prev.acknowledgedRequirements);
      if (newAck.has(requirementId)) {
        newAck.delete(requirementId);
      } else {
        newAck.add(requirementId);
      }
      return { ...prev, acknowledgedRequirements: newAck };
    });
  }, []);

  // Calculations
  const getAddonTotal = useCallback(() => {
    let total = 0;
    state.selectedAddons.forEach((quantity, addonId) => {
      const addon = addons.find((a) => a.id === addonId);
      if (addon) {
        if (addon.pricing_type === 'per_person') {
          total += addon.price * quantity * state.partySize;
        } else {
          total += addon.price * quantity;
        }
      }
    });
    return total;
  }, [state.selectedAddons, state.partySize, addons]);

  const calculateTotal = useCallback(() => {
    // If a package is selected, use package price
    if (state.selectedPackageId) {
      const pkg = packages.find((p) => p.id === state.selectedPackageId);
      if (pkg) {
        return pkg.price + getAddonTotal();
      }
    }

    // Otherwise, base price + addons
    return (basePrice * state.partySize) + getAddonTotal();
  }, [state.selectedPackageId, state.partySize, basePrice, packages, getAddonTotal]);

  // Reset
  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return {
    state,
    currentStep: state.step,
    stepIndex: currentStepIndex,
    steps,
    canProceed,
    canGoBack,
    isComplete,
    goToStep,
    nextStep,
    prevStep,
    selectDate,
    selectSlot,
    selectStaff,
    setPartySize,
    updateAddon,
    removeAddon,
    clearAddons,
    selectPackage,
    updateCustomerInfo,
    updateCustomField,
    acknowledgeRequirement,
    calculateTotal,
    getAddonTotal,
    reset,
  };
}

// Helper function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default useBookingFlowV3;
