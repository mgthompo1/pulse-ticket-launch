/**
 * AttractionBookingWidgetV3 - Main booking widget orchestrator
 * Premium, mobile-first booking experience with Framer Motion animations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Hooks
import { useBookingFlowV3 } from '@/hooks/attractions/useBookingFlowV3';
import { useAvailabilityV3 } from '@/hooks/attractions/useAvailabilityV3';
import { useAddonsV3 } from '@/hooks/attractions/useAddonsV3';
import { useStaffProfilesV3 } from '@/hooks/attractions/useStaffProfilesV3';
import { useReviewsV3 } from '@/hooks/attractions/useReviewsV3';

// Types
import {
  AttractionRequirement,
  CustomFormField,
  HeroSettings,
  formatPrice,
} from '@/types/attraction-v3';

// Components
import {
  ProgressStepper,
  HeroSection,
  AvailabilityCalendar,
  TimeSlotPicker,
  StaffSelector,
  AddOnsSelector,
  PackageSelector,
  RequirementsCard,
  CustomerForm,
  PartySizeSelector,
  BookingSummary,
  MobileBookingFooter,
  Confirmation,
} from './booking';

import {
  TrustSignals,
  ReviewsCarousel,
  UrgencyBadge,
  ViewingNow,
  RecentBookingsTicker,
} from './widgets';

import { staggerContainer, staggerItem, slideInFromBottom } from '@/lib/animations';

interface AttractionBookingWidgetV3Props {
  attractionId: string;
  attraction: {
    id: string;
    name: string;
    description?: string;
    base_price: number;
    currency?: string;
    duration_minutes?: number;
    location?: string;
    image_url?: string;
    gallery_images?: string[];
    resource_label?: string;
    hero_settings?: HeroSettings;
  };
  requirements?: AttractionRequirement[];
  customFields?: CustomFormField[];
  showStaffSelector?: boolean;
  showAddons?: boolean;
  showPackages?: boolean;
  showReviews?: boolean;
  showUrgency?: boolean;
  showSocialProof?: boolean;
  onBookingComplete?: (booking: any) => void;
  onClose?: () => void;
  className?: string;
}

export const AttractionBookingWidgetV3: React.FC<AttractionBookingWidgetV3Props> = ({
  attractionId,
  attraction,
  requirements = [],
  customFields = [],
  showStaffSelector = true,
  showAddons = true,
  showPackages = true,
  showReviews = true,
  showUrgency = true,
  showSocialProof = true,
  onBookingComplete,
  onClose,
  className,
}) => {
  const currency = attraction.currency || 'USD';
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize hooks
  const {
    addons,
    packages,
    availableAddons,
    availablePackages,
    selectedAddons,
    selectedPackageId,
    selectAddon,
    removeAddon,
    selectPackage,
    getAddonTotal,
  } = useAddonsV3({
    attractionId,
    enabled: showAddons || showPackages,
  });

  const bookingFlow = useBookingFlowV3({
    attractionId,
    basePrice: attraction.base_price,
    currency,
    addons,
    packages,
    requiresStaff: showStaffSelector,
    hasAddons: showAddons && availableAddons.length > 0,
    hasPackages: showPackages && availablePackages.length > 0,
    hasRequirements: requirements.length > 0,
  });

  const { state, currentStep, steps, canProceed, canGoBack, nextStep, prevStep, goToStep } = bookingFlow;

  const availability = useAvailabilityV3({
    attractionId,
    resourceId: state.selectedStaffId,
    partySize: state.partySize,
  });

  const { staff, availableStaff } = useStaffProfilesV3({
    attractionId,
    selectedDate: state.selectedDate,
    enabled: showStaffSelector,
  });

  const { reviews, summary: reviewsSummary, featuredReviews } = useReviewsV3({
    attractionId,
    enabled: showReviews,
  });

  // Calculate total
  const totalPrice = useMemo(() => {
    if (selectedPackageId) {
      const pkg = packages.find((p) => p.id === selectedPackageId);
      return (pkg?.price || 0) + getAddonTotal();
    }
    return (attraction.base_price * state.partySize) + getAddonTotal();
  }, [attraction.base_price, state.partySize, selectedPackageId, packages, getAddonTotal]);

  // Get selected slot details
  const selectedSlot = useMemo(() => {
    return availability.slots.find((s) => s.id === state.selectedSlotId);
  }, [availability.slots, state.selectedSlotId]);

  // Get selected staff name
  const selectedStaffName = useMemo(() => {
    if (!state.selectedStaffId) return undefined;
    const member = staff.find((s) => s.id === state.selectedStaffId);
    return member?.name;
  }, [staff, state.selectedStaffId]);

  // Handle booking submission
  const handleSubmitBooking = async () => {
    // This would call your booking API
    console.log('Submitting booking:', {
      attractionId,
      ...state,
      totalPrice,
    });

    // Simulate success
    goToStep('confirmation');

    if (onBookingComplete) {
      onBookingComplete({
        id: 'booking-id',
        reference: 'PLS-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
        ...state,
        total: totalPrice,
      });
    }
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'date':
        return (
          <motion.div
            key="date"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Party Size */}
            <motion.div variants={staggerItem}>
              <PartySizeSelector
                value={state.partySize}
                onChange={bookingFlow.setPartySize}
                pricePerPerson={attraction.base_price}
                currency={currency}
              />
            </motion.div>

            {/* Calendar */}
            <motion.div variants={staggerItem}>
              <AvailabilityCalendar
                availability={availability.availability}
                selectedDate={state.selectedDate}
                onDateSelect={(date) => {
                  bookingFlow.selectDate(date);
                  availability.setSelectedDate(date);
                }}
                loading={availability.isLoadingCalendar}
              />
            </motion.div>

            {/* Urgency Badge */}
            {showUrgency && state.selectedDate && selectedSlot && (
              <motion.div variants={staggerItem}>
                <UrgencyBadge
                  level={selectedSlot.urgency_level || 'low'}
                  spotsLeft={selectedSlot.available_spots}
                />
              </motion.div>
            )}
          </motion.div>
        );

      case 'time':
        return (
          <motion.div
            key="time"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <TimeSlotPicker
              slots={availability.slots}
              selectedSlotId={state.selectedSlotId}
              basePrice={attraction.base_price}
              onSlotSelect={(slot) => {
                bookingFlow.selectSlot(slot.id, slot.start_time);
              }}
              loading={availability.isLoadingSlots}
              currency={currency}
            />
          </motion.div>
        );

      case 'staff':
        return (
          <motion.div
            key="staff"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -20 }}
          >
            <StaffSelector
              staff={availableStaff}
              selectedStaffId={state.selectedStaffId}
              resourceLabel={attraction.resource_label || 'Guide'}
              onSelect={bookingFlow.selectStaff}
            />
          </motion.div>
        );

      case 'addons':
        return (
          <motion.div
            key="addons"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Packages */}
            {showPackages && availablePackages.length > 0 && (
              <PackageSelector
                packages={availablePackages}
                addons={addons}
                selectedPackageId={selectedPackageId}
                basePrice={attraction.base_price}
                partySize={state.partySize}
                currency={currency}
                onPackageSelect={selectPackage}
              />
            )}

            {/* Add-ons */}
            {showAddons && !selectedPackageId && availableAddons.length > 0 && (
              <AddOnsSelector
                addons={availableAddons}
                selectedAddons={selectedAddons}
                partySize={state.partySize}
                selectedDate={state.selectedDate}
                resourceId={state.selectedStaffId}
                currency={currency}
                onAddonsChange={(newAddons) => {
                  // Update each addon
                  newAddons.forEach((qty, id) => selectAddon(id, qty));
                  // Remove deselected
                  selectedAddons.forEach((_, id) => {
                    if (!newAddons.has(id)) removeAddon(id);
                  });
                }}
              />
            )}
          </motion.div>
        );

      case 'requirements':
        return (
          <motion.div
            key="requirements"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -20 }}
          >
            <RequirementsCard
              requirements={requirements}
              acknowledgedIds={state.acknowledgedRequirements}
              onAcknowledge={bookingFlow.acknowledgeRequirement}
            />
          </motion.div>
        );

      case 'details':
        return (
          <motion.div
            key="details"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -20 }}
          >
            <CustomerForm
              customerInfo={state.customerInfo}
              customFields={customFields}
              customFieldValues={state.customFieldResponses}
              onCustomerInfoChange={bookingFlow.updateCustomerInfo}
              onCustomFieldChange={bookingFlow.updateCustomField}
            />
          </motion.div>
        );

      case 'payment':
        return (
          <motion.div
            key="payment"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Order Summary */}
            <div className="p-6 rounded-2xl bg-muted">
              <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>

              <div className="space-y-3">
                {/* Base Booking */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {attraction.name} x {state.partySize}
                  </span>
                  <span className="font-medium">
                    {formatPrice(attraction.base_price * state.partySize, currency)}
                  </span>
                </div>

                {/* Add-ons */}
                {Array.from(selectedAddons.entries()).map(([addonId, qty]) => {
                  const addon = addons.find((a) => a.id === addonId);
                  if (!addon) return null;
                  return (
                    <div key={addonId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {addon.name} x {qty}
                      </span>
                      <span className="font-medium">
                        {formatPrice(addon.price * qty, currency)}
                      </span>
                    </div>
                  );
                })}

                {/* Total */}
                <div className="pt-3 border-t border-border">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(totalPrice, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Form Placeholder */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-border text-center">
              <p className="text-muted-foreground">Payment form integration</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Stripe / Windcave payment would be embedded here
              </p>
            </div>

            {/* Trust Signals */}
            <TrustSignals variant="compact" />

            {/* Pay Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmitBooking}
              className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              Pay {formatPrice(totalPrice, currency)}
            </motion.button>
          </motion.div>
        );

      case 'confirmation':
        return (
          <Confirmation
            booking={{
              id: 'temp-id',
              reference: 'PLS-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
              status: 'confirmed',
              date: state.selectedDate,
              time: state.selectedTime,
              partySize: state.partySize,
              customerName: `${state.customerInfo.first_name} ${state.customerInfo.last_name}`,
              customerEmail: state.customerInfo.email,
              total: totalPrice,
              currency,
            }}
            attraction={{
              name: attraction.name,
              location: attraction.location,
              imageUrl: attraction.image_url,
            }}
            staffName={selectedStaffName}
            selectedAddons={Array.from(selectedAddons.entries()).map(([id, qty]) => ({
              addon: addons.find((a) => a.id === id)!,
              quantity: qty,
            })).filter((a) => a.addon)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Hero Section */}
      {currentStep !== 'confirmation' && (
        <HeroSection
          attraction={{
            id: attraction.id,
            organization_id: '',
            name: attraction.name,
            description: attraction.description,
            venue: attraction.location,
            attraction_type: 'other',
            duration_minutes: attraction.duration_minutes,
            base_price: attraction.base_price,
            currency: currency,
            status: 'active',
            featured_image_url: attraction.image_url,
            logo_url: attraction.image_url,
          }}
          gallery={attraction.gallery_images?.map((url, i) => ({
            id: `gallery-${i}`,
            attraction_id: attraction.id,
            image_url: url,
            display_order: i,
            is_featured: i === 0,
          }))}
          ratingSummary={reviewsSummary ? {
            attraction_id: attraction.id,
            review_count: reviewsSummary.totalCount,
            average_rating: reviewsSummary.averageRating,
            five_star_count: 0,
            four_star_count: 0,
            three_star_count: 0,
            two_star_count: 0,
            one_star_count: 0,
          } : null}
          recentBookingsCount={reviewsSummary?.recentCount}
          onBookNow={() => {}}
        />
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={cn(
          'grid gap-8',
          currentStep !== 'confirmation' && 'lg:grid-cols-3'
        )}>
          {/* Left Column - Booking Flow */}
          <div className={cn(
            currentStep !== 'confirmation' && 'lg:col-span-2'
          )}>
            {/* Progress Stepper */}
            {currentStep !== 'confirmation' && (
              <div className="mb-8">
                <ProgressStepper
                  steps={steps.filter((s) => s !== 'confirmation').map((step) => ({
                    id: step,
                    label: getStepLabel(step),
                  }))}
                  currentStep={currentStep}
                  onStepClick={(stepId) => goToStep(stepId as any)}
                />
              </div>
            )}

            {/* Back Button */}
            {canGoBack && currentStep !== 'confirmation' && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={prevStep}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </motion.button>
            )}

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>

            {/* Continue Button */}
            {currentStep !== 'confirmation' && currentStep !== 'payment' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={nextStep}
                  disabled={!canProceed}
                  className={cn(
                    'w-full py-4 font-semibold rounded-xl transition-colors',
                    canProceed
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  Continue
                </motion.button>
              </motion.div>
            )}
          </div>

          {/* Right Column - Summary (Desktop) */}
          {currentStep !== 'confirmation' && !isMobile && (
            <div className="hidden lg:block">
              <div className="sticky top-4">
                <BookingSummary
                  attraction={{
                    name: attraction.name,
                    image_url: attraction.image_url,
                    base_price: attraction.base_price,
                    duration_minutes: attraction.duration_minutes,
                  }}
                  selectedDate={state.selectedDate}
                  selectedTime={state.selectedTime}
                  partySize={state.partySize}
                  selectedAddons={Array.from(selectedAddons.entries()).map(([id, qty]) => ({
                    addon: addons.find((a) => a.id === id)!,
                    quantity: qty,
                  })).filter((a) => a.addon)}
                  selectedPackage={packages.find((p) => p.id === selectedPackageId)}
                  totalPrice={totalPrice}
                  currency={currency}
                  onContinue={nextStep}
                  canContinue={canProceed}
                />

                {/* Reviews Preview */}
                {showReviews && featuredReviews.length > 0 && (
                  <div className="mt-6">
                    <ReviewsCarousel
                      reviews={featuredReviews}
                      variant="featured"
                    />
                  </div>
                )}

                {/* Trust Signals */}
                <div className="mt-6">
                  <TrustSignals variant="detailed" showStats />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Footer */}
      {isMobile && currentStep !== 'confirmation' && (
        <MobileBookingFooter
          totalPrice={totalPrice}
          currency={currency}
          onContinue={currentStep === 'payment' ? handleSubmitBooking : nextStep}
          buttonLabel={currentStep === 'payment' ? 'Pay Now' : 'Continue'}
          disabled={!canProceed}
        />
      )}

      {/* Close Button */}
      {onClose && currentStep !== 'confirmation' && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 p-2 rounded-full bg-background/90 backdrop-blur shadow-lg text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

// Helper to get step labels
function getStepLabel(step: string): string {
  const labels: Record<string, string> = {
    date: 'Date',
    time: 'Time',
    staff: 'Guide',
    addons: 'Extras',
    requirements: 'Requirements',
    details: 'Details',
    payment: 'Payment',
  };
  return labels[step] || step;
}

export default AttractionBookingWidgetV3;
