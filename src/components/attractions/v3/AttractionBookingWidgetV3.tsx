/**
 * AttractionBookingWidgetV3 - Main booking widget orchestrator
 * Premium, mobile-first booking experience with Framer Motion animations
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Loader2, Flag, Users, Shirt, Car, MapPin, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Hooks
import { useBookingFlowV3 } from '@/hooks/attractions/useBookingFlowV3';
import { useAvailabilityV3 } from '@/hooks/attractions/useAvailabilityV3';
import { useAddonsV3 } from '@/hooks/attractions/useAddonsV3';
import { useStaffProfilesV3 } from '@/hooks/attractions/useStaffProfilesV3';
import { useReviewsV3 } from '@/hooks/attractions/useReviewsV3';
import { useGolfConfig } from '@/hooks/useGolfConfig';

// Golf components
import { TeeTimeSelector } from '@/components/verticals/golf/TeeTimeSelector';

// Types
import type { VerticalType, GolfCourseConfig } from '@/types/verticals';

// Payment
import { AttractionStripePayment } from '@/components/payment/AttractionStripePayment';

// Waivers
import { AttractionWaiverSigning } from '../waivers';

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

interface ThemeSettings {
  primaryColor?: string;
  accentColor?: string;
  borderRadius?: 'none' | 'small' | 'medium' | 'large';
  fontFamily?: 'default' | 'serif' | 'modern';
  compactMode?: boolean;
  hidePrice?: boolean;
  showTrustSignals?: boolean;
  customCss?: string;
}

interface AttractionBookingWidgetV3Props {
  attractionId: string;
  organizationId?: string;
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
    timezone?: string;
    vertical_type?: VerticalType;
  };
  theme?: ThemeSettings;
  trustSignals?: {
    paymentTitle?: string;
    paymentBadges?: { label: string; description: string }[];
    guaranteesTitle?: string;
    guaranteeBadges?: { label: string; description: string }[];
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
  organizationId,
  attraction,
  theme,
  trustSignals,
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
  const { toast } = useToast();
  const currency = attraction.currency || 'USD';
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [bookingCreationFailed, setBookingCreationFailed] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Golf mode state
  const isGolfMode = attraction.vertical_type === 'golf';
  const { data: golfConfig } = useGolfConfig(isGolfMode ? attractionId : '');
  const [selectedHoles, setSelectedHoles] = useState<number>(18);
  const [cartSelected, setCartSelected] = useState(false);
  const [caddieSelected, setCaddieSelected] = useState(false);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeValidating, setPromoCodeValidating] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string;
    code: string;
    discount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Waiver state
  const [hasOnlineWaivers, setHasOnlineWaivers] = useState(false);
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);

  // Add-ons context state (kept in sync with booking flow)
  const [addonsPartySize, setAddonsPartySize] = useState(1);
  const [addonsSelectedDate, setAddonsSelectedDate] = useState('');
  const [addonsSelectedStaffId, setAddonsSelectedStaffId] = useState<string | null>(null);

  // Theme defaults
  const primaryColor = theme?.primaryColor || '#3b82f6';
  const accentColor = theme?.accentColor || '#10b981';
  const showTrustSignals = theme?.showTrustSignals !== false;
  const hidePrice = theme?.hidePrice || false;

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set default holes from golf config
  useEffect(() => {
    if (golfConfig?.default_holes) {
      setSelectedHoles(golfConfig.default_holes);
    }
    if (golfConfig?.cart_included) {
      setCartSelected(true);
    }
  }, [golfConfig]);

  // Check for online waivers
  useEffect(() => {
    const checkForWaivers = async () => {
      if (!organizationId) return;

      try {
        const { data: waivers } = await supabase
          .from('waiver_templates')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .or(`attraction_id.eq.${attractionId},attraction_id.is.null`)
          .or('waiver_timing.eq.online,waiver_timing.eq.both')
          .limit(1);

        setHasOnlineWaivers((waivers?.length || 0) > 0);
      } catch (error) {
        console.error('Error checking for waivers:', error);
      }
    };

    checkForWaivers();
  }, [attractionId, organizationId]);

  const requiredRequirementIds = useMemo(
    () => requirements.filter((req) => req.acknowledgement_required).map((req) => req.id),
    [requirements]
  );

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
    partySize: addonsPartySize,
    selectedDate: addonsSelectedDate,
    resourceId: addonsSelectedStaffId,
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
    hasOnlineWaivers,
    requiredRequirementIds,
  });

  const {
    state,
    currentStep,
    steps,
    canProceed,
    canGoBack,
    nextStep,
    prevStep,
    goToStep,
    setPartySize,
    selectDate,
    selectStaff,
  } = bookingFlow;

  const handlePartySizeChange = useCallback((size: number) => {
    setAddonsPartySize(size);
    setPartySize(size);
  }, [setPartySize]);

  const handleDateSelect = useCallback((date: string) => {
    setAddonsSelectedDate(date);
    selectDate(date);
  }, [selectDate]);

  const handleStaffSelect = useCallback((staffId: string | null) => {
    setAddonsSelectedStaffId(staffId);
    selectStaff(staffId);
  }, [selectStaff]);

  const availability = useAvailabilityV3({
    attractionId,
    resourceId: state.selectedStaffId,
    partySize: state.partySize,
    timezone: attraction.timezone || 'Pacific/Auckland',
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

  // Calculate golf extras (cart + caddie)
  const golfExtrasTotal = useMemo(() => {
    if (!isGolfMode || !golfConfig) return 0;
    let extras = 0;
    // Cart fee (if not included and selected)
    if (!golfConfig.cart_included && cartSelected && golfConfig.cart_fee) {
      extras += golfConfig.cart_fee * state.partySize;
    }
    // Caddie fee (if available and selected)
    if (golfConfig.caddie_available && caddieSelected && golfConfig.caddie_fee) {
      extras += golfConfig.caddie_fee;
    }
    return extras;
  }, [isGolfMode, golfConfig, cartSelected, caddieSelected, state.partySize]);

  // Calculate subtotal (before promo)
  const subtotalPrice = useMemo(() => {
    if (selectedPackageId) {
      const pkg = packages.find((p) => p.id === selectedPackageId);
      return (pkg?.price || 0) + getAddonTotal() + golfExtrasTotal;
    }
    return (attraction.base_price * state.partySize) + getAddonTotal() + golfExtrasTotal;
  }, [attraction.base_price, state.partySize, selectedPackageId, packages, getAddonTotal, golfExtrasTotal]);

  // Calculate total (after promo discount)
  const totalPrice = useMemo(() => {
    const discount = appliedPromo?.discount || 0;
    return Math.max(0, subtotalPrice - discount);
  }, [subtotalPrice, appliedPromo]);

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

  // Auto-create pending booking when entering waiver or payment step
  useEffect(() => {
    const needsBooking = currentStep === 'payment' || currentStep === 'waiver';
    if (needsBooking && !pendingBookingId && !isProcessingPayment && !bookingCreationFailed && organizationId) {
      createPendingBooking();
    }
  }, [currentStep, pendingBookingId, isProcessingPayment, bookingCreationFailed, organizationId]);

  // Generate booking reference
  const generateBookingRef = () => {
    return 'PLS-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  };

  // Validate and apply promo code
  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    setPromoCodeValidating(true);
    setPromoError(null);

    try {
      const { data, error } = await supabase.rpc('validate_attraction_promo_code', {
        p_code: promoCode.trim(),
        p_attraction_id: attractionId,
        p_customer_email: state.customerInfo.email,
        p_party_size: state.partySize,
        p_subtotal: subtotalPrice,
      });

      if (error) throw error;

      const result = data?.[0];
      if (result?.valid) {
        setAppliedPromo({
          id: result.promo_code_id,
          code: promoCode.trim().toUpperCase(),
          discount: result.discount_amount,
        });
        setPromoCode('');
        toast({
          title: 'Promo code applied!',
          description: `You saved ${formatPrice(result.discount_amount, currency)}`,
        });
      } else {
        setPromoError(result?.error_message || 'Invalid promo code');
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoError('Failed to validate promo code');
    } finally {
      setPromoCodeValidating(false);
    }
  };

  // Remove applied promo code
  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  // Create pending booking for payment
  const createPendingBooking = async () => {
    if (!organizationId) {
      console.error('No organization ID provided for payment');
      toast({
        title: 'Configuration Error',
        description: 'Payment is not configured. Please contact support.',
        variant: 'destructive',
      });
      setBookingCreationFailed(true);
      return null;
    }

    if (!state.selectedSlotId) {
      console.error('No slot selected');
      toast({
        title: 'Error',
        description: 'Please select a time slot first.',
        variant: 'destructive',
      });
      setBookingCreationFailed(true);
      return null;
    }

    setIsProcessingPayment(true);
    const reference = generateBookingRef();

    try {
      // Step 1: Reserve the slot atomically to prevent overbooking
      const { data: reservationResult, error: reservationError } = await supabase.rpc(
        'reserve_attraction_slot',
        {
          p_attraction_id: attractionId,
          p_booking_slot_id: state.selectedSlotId,
          p_party_size: state.partySize,
          p_session_id: sessionId,
          p_customer_email: state.customerInfo.email,
        }
      );

      if (reservationError) throw reservationError;

      const reservation = reservationResult?.[0];
      if (!reservation?.success) {
        toast({
          title: 'Slot Unavailable',
          description: reservation?.error_message || 'This time slot is no longer available. Please select another.',
          variant: 'destructive',
        });
        setIsProcessingPayment(false);
        setBookingCreationFailed(true);
        return null;
      }

      setReservationId(reservation.reservation_id);

      // Step 2: Create the booking with the reservation
      const { data, error } = await supabase
        .from('attraction_bookings')
        .insert({
          attraction_id: attractionId,
          organization_id: organizationId,
          customer_name: `${state.customerInfo.first_name} ${state.customerInfo.last_name}`,
          customer_email: state.customerInfo.email,
          customer_phone: state.customerInfo.phone || null,
          booking_slot_id: state.selectedSlotId,
          party_size: state.partySize,
          total_amount: totalPrice,
          booking_status: 'pending',
          payment_status: 'pending',
          booking_reference: reference,
          promo_code_id: appliedPromo?.id || null,
          promo_code_discount: appliedPromo?.discount || 0,
        })
        .select()
        .single();

      if (error) throw error;

      setPendingBookingId(data.id);
      setBookingReference(reference);
      return data;
    } catch (error) {
      console.error('Error creating pending booking:', error);
      // Cancel reservation if booking creation failed
      if (reservationId) {
        await supabase.rpc('cancel_attraction_reservation', { p_session_id: sessionId }).catch(() => {});
      }
      toast({
        title: 'Error',
        description: 'Failed to create booking. Please try again.',
        variant: 'destructive',
      });
      setIsProcessingPayment(false);
      setBookingCreationFailed(true);
      return null;
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async () => {
    if (!pendingBookingId) return;

    try {
      // Update booking status
      await supabase
        .from('attraction_bookings')
        .update({
          booking_status: 'confirmed',
          payment_status: 'completed',
        })
        .eq('id', pendingBookingId);

      // Complete the slot reservation (atomically updates slot count)
      if (reservationId) {
        await supabase.rpc('complete_attraction_reservation', {
          p_reservation_id: reservationId,
          p_booking_id: pendingBookingId,
        });
      } else if (selectedSlot) {
        // Fallback: direct update if no reservation (shouldn't happen)
        await supabase
          .from('booking_slots')
          .update({
            current_bookings: selectedSlot.current_bookings + state.partySize,
          })
          .eq('id', selectedSlot.id);
      }

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-booking-email', {
          body: { bookingId: pendingBookingId }
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the booking if email fails
      }

      toast({
        title: 'Payment Successful! 🎉',
        description: 'Your booking has been confirmed.',
      });

      // Go to confirmation
      goToStep('confirmation');

      if (onBookingComplete) {
        onBookingComplete({
          id: pendingBookingId,
          reference: bookingReference,
          ...state,
          total: totalPrice,
        });
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast({
        title: 'Error',
        description: 'Payment succeeded but booking confirmation failed. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle payment error
  const handlePaymentError = (error: Error) => {
    console.error('Payment error:', error);
    toast({
      title: 'Payment Failed',
      description: error.message || 'Please try again.',
      variant: 'destructive',
    });
    setIsProcessingPayment(false);
  };

  // Handle booking submission - legacy, for confirmation step
  const handleSubmitBooking = async () => {
    console.log('Submitting booking:', {
      attractionId,
      ...state,
      totalPrice,
    });

    if (onBookingComplete) {
      onBookingComplete({
        id: pendingBookingId || 'booking-id',
        reference: bookingReference || generateBookingRef(),
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
            {/* Golf Course Info */}
            {isGolfMode && golfConfig && (
              <motion.div variants={staggerItem}>
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Flag className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Course Information</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {golfConfig.par && (
                      <div className="text-center p-2 bg-white/60 dark:bg-black/20 rounded-lg">
                        <div className="text-lg font-bold text-green-700 dark:text-green-300">{golfConfig.par}</div>
                        <div className="text-xs text-green-600 dark:text-green-400">Par</div>
                      </div>
                    )}
                    {golfConfig.total_yards && (
                      <div className="text-center p-2 bg-white/60 dark:bg-black/20 rounded-lg">
                        <div className="text-lg font-bold text-green-700 dark:text-green-300">{golfConfig.total_yards.toLocaleString()}</div>
                        <div className="text-xs text-green-600 dark:text-green-400">Yards</div>
                      </div>
                    )}
                    {golfConfig.course_rating && (
                      <div className="text-center p-2 bg-white/60 dark:bg-black/20 rounded-lg">
                        <div className="text-lg font-bold text-green-700 dark:text-green-300">{golfConfig.course_rating}</div>
                        <div className="text-xs text-green-600 dark:text-green-400">Rating</div>
                      </div>
                    )}
                    {golfConfig.slope_rating && (
                      <div className="text-center p-2 bg-white/60 dark:bg-black/20 rounded-lg">
                        <div className="text-lg font-bold text-green-700 dark:text-green-300">{golfConfig.slope_rating}</div>
                        <div className="text-xs text-green-600 dark:text-green-400">Slope</div>
                      </div>
                    )}
                  </div>
                  {golfConfig.dress_code && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                      <Shirt className="w-4 h-4 mt-0.5 shrink-0" />
                      <span><strong>Dress Code:</strong> {golfConfig.dress_code}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Holes Selection for Golf */}
            {isGolfMode && golfConfig && (
              <motion.div variants={staggerItem}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Number of Holes</label>
                  <div className="flex gap-3">
                    {(golfConfig.holes_options || [9, 18]).map((holes) => (
                      <button
                        key={holes}
                        onClick={() => setSelectedHoles(holes)}
                        className={cn(
                          'flex-1 p-4 rounded-xl border-2 font-semibold transition-all',
                          selectedHoles === holes
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50 text-foreground'
                        )}
                      >
                        <div className="text-2xl">{holes}</div>
                        <div className="text-xs text-muted-foreground">
                          ~{holes === 9 ? golfConfig.nine_hole_duration || 120 : golfConfig.eighteen_hole_duration || 240} min
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Party Size - labeled as "Players" for golf */}
            <motion.div variants={staggerItem}>
              <PartySizeSelector
                value={state.partySize}
                onChange={handlePartySizeChange}
                pricePerPerson={attraction.base_price}
                currency={currency}
                label={isGolfMode ? 'Players' : undefined}
                maxSize={isGolfMode && golfConfig ? golfConfig.max_players_per_tee : undefined}
              />
            </motion.div>

            {/* Cart & Caddie Options for Golf */}
            {isGolfMode && golfConfig && (
              <motion.div variants={staggerItem}>
                <div className="space-y-3">
                  {/* Cart Option */}
                  {!golfConfig.cart_included && golfConfig.cart_fee && (
                    <label className="flex items-center justify-between p-4 rounded-xl border-2 border-border hover:border-primary/50 cursor-pointer transition-all">
                      <div className="flex items-center gap-3">
                        <Car className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Golf Cart</div>
                          <div className="text-sm text-muted-foreground">
                            {formatPrice(golfConfig.cart_fee, currency)} per player
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={cartSelected}
                        onChange={(e) => setCartSelected(e.target.checked)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                    </label>
                  )}
                  {golfConfig.cart_included && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <Car className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium text-green-700 dark:text-green-300">Golf Cart Included</div>
                        <div className="text-sm text-green-600 dark:text-green-400">Cart is included with your green fee</div>
                      </div>
                    </div>
                  )}

                  {/* Caddie Option */}
                  {golfConfig.caddie_available && golfConfig.caddie_fee && (
                    <label className="flex items-center justify-between p-4 rounded-xl border-2 border-border hover:border-primary/50 cursor-pointer transition-all">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Caddie Service</div>
                          <div className="text-sm text-muted-foreground">
                            {formatPrice(golfConfig.caddie_fee, currency)} per round
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={caddieSelected}
                        onChange={(e) => setCaddieSelected(e.target.checked)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                    </label>
                  )}
                </div>
              </motion.div>
            )}

            {/* Calendar */}
            <motion.div variants={staggerItem}>
              <AvailabilityCalendar
                availability={availability.availability}
                selectedDate={state.selectedDate}
                onDateSelect={(date) => {
                  handleDateSelect(date);
                  availability.setSelectedDate(date);
                  // Auto-advance to time selection
                  setTimeout(() => goToStep('time'), 300);
                }}
                loading={availability.isLoadingCalendar}
              />
            </motion.div>

            {/* Urgency Badge */}
            {showUrgency && state.selectedDate && selectedSlot && (
              <motion.div variants={staggerItem}>
                <UrgencyBadge
                  level={selectedSlot.urgency_level ?? 'low'}
                  spotsLeft={selectedSlot.spots_left}
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
                // Auto-advance to next step after time
                const timeIndex = steps.indexOf('time');
                if (timeIndex >= 0 && timeIndex < steps.length - 1) {
                  setTimeout(() => goToStep(steps[timeIndex + 1]), 300);
                }
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
              onSelect={handleStaffSelect}
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
                partySize={addonsPartySize}
                currency={currency}
                onPackageSelect={selectPackage}
              />
            )}

            {/* Add-ons */}
            {showAddons && !selectedPackageId && availableAddons.length > 0 && (
              <AddOnsSelector
                addons={availableAddons}
                selectedAddons={selectedAddons}
                partySize={addonsPartySize}
                selectedDate={addonsSelectedDate}
                resourceId={addonsSelectedStaffId}
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

      case 'waiver':
        return (
          <motion.div
            key="waiver"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <motion.div variants={staggerItem}>
              <div className="text-center py-8">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Waiver Required
                </h3>
                <p className="text-muted-foreground mb-6">
                  Please sign the required waiver(s) before proceeding to payment.
                </p>
                <button
                  onClick={() => setWaiverModalOpen(true)}
                  className="px-6 py-3 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Sign Waiver
                </button>
              </div>
            </motion.div>

            {/* Waiver Signing Modal */}
            {organizationId && pendingBookingId && (
              <AttractionWaiverSigning
                open={waiverModalOpen}
                onOpenChange={setWaiverModalOpen}
                attractionId={attractionId}
                organizationId={organizationId}
                bookingId={pendingBookingId}
                bookingReference={bookingReference || ''}
                customerName={`${state.customerInfo.first_name} ${state.customerInfo.last_name}`}
                customerEmail={state.customerInfo.email}
                waiverTiming="online"
                onWaiverSigned={() => {
                  bookingFlow.markWaiversCompleted();
                  setWaiverModalOpen(false);
                  // Auto-advance to payment
                  setTimeout(() => goToStep('payment'), 300);
                }}
              />
            )}
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
                    {isGolfMode ? `Green Fee (${selectedHoles} holes)` : attraction.name} x {state.partySize}
                  </span>
                  <span className="font-medium">
                    {formatPrice(attraction.base_price * state.partySize, currency)}
                  </span>
                </div>

                {/* Golf Extras */}
                {isGolfMode && golfConfig && (
                  <>
                    {!golfConfig.cart_included && cartSelected && golfConfig.cart_fee && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Golf Cart x {state.partySize}
                        </span>
                        <span className="font-medium">
                          {formatPrice(golfConfig.cart_fee * state.partySize, currency)}
                        </span>
                      </div>
                    )}
                    {golfConfig.cart_included && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Golf Cart (Included)</span>
                        <span>Free</span>
                      </div>
                    )}
                    {golfConfig.caddie_available && caddieSelected && golfConfig.caddie_fee && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Caddie Service</span>
                        <span className="font-medium">
                          {formatPrice(golfConfig.caddie_fee, currency)}
                        </span>
                      </div>
                    )}
                  </>
                )}

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

                {/* Promo Discount */}
                {appliedPromo && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-2">
                      Promo: {appliedPromo.code}
                      <button
                        onClick={removePromoCode}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        (remove)
                      </button>
                    </span>
                    <span className="font-medium">
                      -{formatPrice(appliedPromo.discount, currency)}
                    </span>
                  </div>
                )}

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

            {/* Promo Code Input */}
            {!appliedPromo && (
              <div className="p-4 rounded-xl bg-muted/50">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Have a promo code?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase());
                      setPromoError(null);
                    }}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={validatePromoCode}
                    disabled={promoCodeValidating || !promoCode.trim()}
                    className="px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {promoCodeValidating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>
                {promoError && (
                  <p className="mt-2 text-sm text-destructive">{promoError}</p>
                )}
              </div>
            )}

            {/* Payment Form - Stripe */}
            {organizationId ? (
              pendingBookingId ? (
                <div className="space-y-4">
                  <AttractionStripePayment
                    amount={totalPrice}
                    currency={currency}
                    description={`${attraction.name} - ${state.partySize} ${state.partySize === 1 ? 'guest' : 'guests'}`}
                    customerEmail={state.customerInfo.email}
                    customerName={`${state.customerInfo.first_name} ${state.customerInfo.last_name}`}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    metadata={{
                      organization_id: organizationId,
                      attraction_id: attractionId,
                      booking_id: pendingBookingId,
                      booking_reference: bookingReference || '',
                      booking_date: state.selectedDate,
                      booking_time: state.selectedTime,
                      party_size: String(state.partySize),
                    }}
                  />
                </div>
              ) : bookingCreationFailed ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-destructive font-medium mb-4">Failed to prepare payment</p>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setBookingCreationFailed(false);
                        createPendingBooking();
                      }}
                      className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      Try Again
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Preparing secure payment...</p>
                  </div>
                </div>
              )
            ) : (
              <div className="p-6 rounded-2xl border-2 border-dashed border-border text-center">
                <p className="text-muted-foreground">Payment not configured</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Please contact the organizer to complete your booking.
                </p>
              </div>
            )}

            {/* Trust Signals */}
            {showTrustSignals && (
              <TrustSignals variant="compact" customSignals={trustSignals} />
            )}
          </motion.div>
        );

      case 'confirmation':
        return (
          <Confirmation
            booking={{
              id: pendingBookingId || 'booking-id',
              reference: bookingReference || 'PLS-XXXXXXXX',
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
            golfDetails={isGolfMode && golfConfig ? {
              holes: selectedHoles,
              cartIncluded: golfConfig.cart_included || cartSelected,
              caddieSelected,
              dressCode: golfConfig.dress_code,
              par: golfConfig.par,
              courseRating: golfConfig.course_rating,
              slopeRating: golfConfig.slope_rating,
            } : undefined}
          />
        );

      default:
        return null;
    }
  };

  // Apply custom CSS if provided
  const customStyles = theme?.customCss ? (
    <style dangerouslySetInnerHTML={{ __html: theme.customCss }} />
  ) : null;

  return (
    <div
      className={cn('min-h-screen bg-background', className)}
      style={{
        '--primary-color': primaryColor,
        '--accent-color': accentColor,
      } as React.CSSProperties}
    >
      {customStyles}
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
            base_price: hidePrice ? 0 : attraction.base_price,
            currency: currency,
            status: 'active',
            featured_image_url: attraction.image_url,
            logo_url: attraction.image_url,
            hero_settings: attraction.hero_settings,
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
                    label: getStepLabel(step, isGolfMode),
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
                  onContinue={currentStep === 'payment' ? undefined : nextStep}
                  canContinue={currentStep === 'payment' ? false : canProceed}
                  ctaText={currentStep === 'payment' ? 'Complete payment below' : 'Continue'}
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
                {showTrustSignals && (
                  <div className="mt-6">
                    <TrustSignals variant="detailed" showStats customSignals={trustSignals} />
                  </div>
                )}
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
function getStepLabel(step: string, isGolf?: boolean): string {
  const labels: Record<string, string> = {
    date: isGolf ? 'Tee Time' : 'Date',
    time: isGolf ? 'Tee Time' : 'Time',
    staff: 'Guide',
    addons: 'Extras',
    requirements: 'Requirements',
    details: 'Details',
    payment: 'Payment',
  };
  return labels[step] || step;
}

export default AttractionBookingWidgetV3;
