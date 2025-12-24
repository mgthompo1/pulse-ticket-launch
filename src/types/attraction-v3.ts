/**
 * Attractions V3 Types
 * Premium booking system with staff profiles, add-ons, reviews, and more
 */

// ============================================================================
// Staff/Resource with Profile
// ============================================================================

export interface StaffProfile {
  id: string;
  attraction_id: string;
  name: string;
  description?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  specialties?: string[];
  display_order: number;
  show_on_widget: boolean;
  capacity: number;
  is_active: boolean;
  rating_average?: number | null;
  booking_count?: number;
  resource_data?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Add-ons
// ============================================================================

export type AddonPricingType = 'flat' | 'per_person' | 'percentage';

export interface AttractionAddon {
  id: string;
  attraction_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  pricing_type: AddonPricingType;
  is_required: boolean;
  is_active: boolean;
  max_quantity?: number | null;
  min_quantity?: number;
  category?: string | null;
  display_order: number;
  availability_rules?: AddonAvailabilityRules | null;
  created_at?: string;
  updated_at?: string;
}

export interface AddonAvailabilityRules {
  days_of_week?: number[]; // 0-6, Sunday = 0
  start_time?: string; // HH:MM
  end_time?: string; // HH:MM
  min_party_size?: number;
  max_party_size?: number;
  resource_ids?: string[];
}

export interface SelectedAddon {
  addon: AttractionAddon;
  quantity: number;
}

// ============================================================================
// Packages
// ============================================================================

export interface AttractionPackage {
  id: string;
  attraction_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  original_price?: number | null;
  discount_label?: string | null;
  included_addon_ids: string[];
  duration_override?: number | null;
  party_size_min?: number;
  party_size_max?: number | null;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  validity_rules?: PackageValidityRules | null;
  created_at?: string;
  updated_at?: string;
}

export interface PackageValidityRules {
  valid_from?: string; // ISO date
  valid_until?: string; // ISO date
  days_of_week?: number[];
  blackout_dates?: string[];
}

// ============================================================================
// Reviews & Ratings
// ============================================================================

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface AttractionReview {
  id: string;
  attraction_id: string;
  booking_id?: string | null;
  resource_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  rating: ReviewRating;
  title?: string | null;
  review_text?: string | null;
  photos?: string[];
  is_verified: boolean;
  is_featured: boolean;
  is_published: boolean;
  admin_response?: string | null;
  admin_response_at?: string | null;
  helpful_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface RatingSummary {
  attraction_id: string;
  review_count: number;
  average_rating: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
}

// ============================================================================
// Gallery
// ============================================================================

export interface GalleryImage {
  id: string;
  attraction_id: string;
  image_url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  caption?: string | null;
  is_featured: boolean;
  display_order: number;
  created_at?: string;
}

// ============================================================================
// Requirements & Restrictions
// ============================================================================

export type RequirementType =
  | 'age_minimum'
  | 'age_maximum'
  | 'height_minimum'
  | 'height_maximum'
  | 'health'
  | 'equipment'
  | 'skill_level'
  | 'waiver'
  | 'custom';

export interface AttractionRequirement {
  id: string;
  attraction_id: string;
  requirement_type: RequirementType;
  title: string;
  description?: string | null;
  value?: string | null;
  unit?: string | null;
  icon?: string | null;
  is_blocking: boolean;
  acknowledgement_required: boolean;
  display_order: number;
  created_at?: string;
}

// ============================================================================
// Custom Form Fields
// ============================================================================

export type CustomFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'date'
  | 'time'
  | 'textarea'
  | 'file';

export interface CustomFormField {
  id: string;
  attraction_id: string;
  field_type: CustomFieldType;
  label: string;
  placeholder?: string | null;
  help_text?: string | null;
  options?: FieldOption[] | null;
  validation_rules?: FieldValidationRules | null;
  default_value?: string | null;
  is_required: boolean;
  is_active: boolean;
  show_on_confirmation: boolean;
  show_on_email: boolean;
  display_order: number;
  conditional_display?: ConditionalDisplay | null;
  created_at?: string;
  updated_at?: string;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface ConditionalDisplay {
  field_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number | boolean;
}

export interface CustomFieldResponse {
  id: string;
  booking_id: string;
  field_id: string;
  field_label: string;
  field_value: unknown;
  created_at?: string;
}

// ============================================================================
// Availability & Calendar
// ============================================================================

export type AvailabilityLevel = 'high' | 'medium' | 'low' | 'none';

export interface DateAvailability {
  date: string;
  level: AvailabilityLevel;
  slots_available: number;
  total_slots: number;
  lowest_price?: number;
  highest_price?: number;
  is_blackout: boolean;
  is_closed: boolean;
}

export interface TimeSlotGroup {
  id: string;
  label: string;
  time_range: string;
  slots: EnhancedBookingSlot[];
}

export interface EnhancedBookingSlot {
  id: string;
  attraction_id: string;
  resource_id?: string | null;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'blocked' | 'maintenance';
  max_capacity: number;
  current_bookings: number;
  spots_left: number;
  price: number;
  price_override?: number | null;
  resource?: StaffProfile | null;
  urgency_level: AvailabilityLevel;
}

// ============================================================================
// Booking Flow State
// ============================================================================

export type BookingStep =
  | 'date'
  | 'time'
  | 'staff'
  | 'addons'
  | 'details'
  | 'payment'
  | 'confirmation';

export interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
  special_requests?: string;
}

export interface BookingFlowState {
  step: BookingStep;
  selectedDate: string;
  selectedSlotId: string | null;
  selectedSlot: EnhancedBookingSlot | null;
  selectedStaffId: string | null;
  selectedAddons: Map<string, number>; // addonId -> quantity
  selectedPackageId: string | null;
  partySize: number;
  customerInfo: CustomerInfo;
  customFieldResponses: Map<string, unknown>;
  requirementsAcknowledged: Set<string>;
  totalPrice: number;
  isProcessing: boolean;
  error: string | null;
}

// ============================================================================
// Widget Settings
// ============================================================================

export interface UrgencySettings {
  enabled: boolean;
  showSpotsLeft: boolean;
  lowAvailabilityThreshold: number;
  criticalAvailabilityThreshold: number;
  showRecentBookings: boolean;
  recentBookingsWindow: number; // hours
}

export interface SocialProofSettings {
  showRatings: boolean;
  showReviewCount: boolean;
  showFeaturedReviews: boolean;
  maxFeaturedReviews: number;
  showBookingCount: boolean;
}

export interface BookingFlowSettings {
  steps: BookingStep[];
  requireStaffSelection: boolean;
  showAddOns: boolean;
  showPackages: boolean;
  showRequirements: boolean;
  collectPhone: boolean;
  collectSpecialRequests: boolean;
}

export interface HeroSettings {
  layout: 'fullwidth' | 'contained' | 'split' | 'minimal';
  showGallery: boolean;
  showRating: boolean;
  showBookingCount: boolean;
  overlayOpacity: number;
  ctaText?: string;
  showFloatingCard?: boolean;
}

// ============================================================================
// Enhanced Attraction Data
// ============================================================================

export interface AttractionV3Data {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  venue?: string | null;
  logo_url?: string | null;
  featured_image_url?: string | null;
  attraction_type: string;
  duration_minutes: number;
  base_price: number;
  currency?: string;
  status: 'active' | 'inactive' | 'maintenance';
  resource_label?: string | null;
  operating_hours?: Record<string, { open: string; close: string; closed?: boolean }> | null;
  blackout_dates?: string[] | null;
  advance_booking_days?: number;
  max_party_size?: number;

  // V3 Settings
  urgency_settings?: UrgencySettings | null;
  social_proof_settings?: SocialProofSettings | null;
  booking_flow_settings?: BookingFlowSettings | null;
  hero_settings?: HeroSettings | null;
  widget_customization?: Record<string, unknown> | null;
  email_customization?: Record<string, unknown> | null;

  // Relations
  organizations?: {
    id: string;
    name: string;
    logo_url?: string | null;
    currency?: string;
  } | null;

  // V3 Relations (populated separately)
  gallery?: GalleryImage[];
  reviews?: AttractionReview[];
  rating_summary?: RatingSummary | null;
  staff?: StaffProfile[];
  addons?: AttractionAddon[];
  packages?: AttractionPackage[];
  requirements?: AttractionRequirement[];
  custom_fields?: CustomFormField[];

  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface BookingConfirmation {
  booking_id: string;
  booking_reference: string;
  attraction: AttractionV3Data;
  slot: EnhancedBookingSlot;
  customer: CustomerInfo;
  party_size: number;
  addons: SelectedAddon[];
  package?: AttractionPackage | null;
  custom_field_responses: Array<{ label: string; value: unknown }>;
  total_amount: number;
  currency: string;
  created_at: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate availability level based on spots left
 */
export function getAvailabilityLevel(
  spotsLeft: number,
  totalCapacity: number,
  urgencySettings?: UrgencySettings
): AvailabilityLevel {
  if (spotsLeft === 0) return 'none';

  const lowThreshold = urgencySettings?.lowAvailabilityThreshold ?? 3;
  const criticalThreshold = urgencySettings?.criticalAvailabilityThreshold ?? 1;

  if (spotsLeft <= criticalThreshold) return 'low';
  if (spotsLeft <= lowThreshold) return 'medium';
  return 'high';
}

/**
 * Calculate total price including add-ons
 */
export function calculateBookingTotal(
  basePrice: number,
  partySize: number,
  selectedAddons: Map<string, number>,
  addons: AttractionAddon[],
  selectedPackage?: AttractionPackage | null
): number {
  // If package selected, start with package price
  let total = selectedPackage ? selectedPackage.price : basePrice * partySize;

  // Add addon costs
  selectedAddons.forEach((quantity, addonId) => {
    const addon = addons.find(a => a.id === addonId);
    if (!addon) return;

    let addonCost = 0;
    switch (addon.pricing_type) {
      case 'flat':
        addonCost = addon.price * quantity;
        break;
      case 'per_person':
        addonCost = addon.price * quantity * partySize;
        break;
      case 'percentage':
        addonCost = (total * (addon.price / 100)) * quantity;
        break;
    }
    total += addonCost;
  });

  return total;
}

/**
 * Group time slots by time of day
 * Uses _hour_in_tz if available (pre-calculated in attraction's timezone)
 * Falls back to browser timezone if not
 */
export function groupSlotsByTimeOfDay(slots: EnhancedBookingSlot[]): TimeSlotGroup[] {
  const morning: EnhancedBookingSlot[] = [];
  const afternoon: EnhancedBookingSlot[] = [];
  const evening: EnhancedBookingSlot[] = [];

  if (!slots || !Array.isArray(slots)) {
    return [];
  }

  slots.forEach(slot => {
    // Use pre-calculated hour in attraction timezone if available
    const hour = (slot as any)._hour_in_tz ?? new Date(slot.start_time).getHours();
    if (hour < 12) {
      morning.push(slot);
    } else if (hour < 17) {
      afternoon.push(slot);
    } else {
      evening.push(slot);
    }
  });

  const groups: TimeSlotGroup[] = [];

  if (morning.length > 0) {
    groups.push({
      id: 'morning',
      label: 'Morning',
      time_range: '6:00 AM - 12:00 PM',
      slots: morning
    });
  }

  if (afternoon.length > 0) {
    groups.push({
      id: 'afternoon',
      label: 'Afternoon',
      time_range: '12:00 PM - 5:00 PM',
      slots: afternoon
    });
  }

  if (evening.length > 0) {
    groups.push({
      id: 'evening',
      label: 'Evening',
      time_range: '5:00 PM - 10:00 PM',
      slots: evening
    });
  }

  return groups;
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Format time from ISO string
 */
export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format date from ISO string or YYYY-MM-DD
 */
export function formatDate(isoString: string): string {
  if (!isoString) return 'Select date';
  // Handle YYYY-MM-DD format by adding noon time to avoid timezone date shift
  // new Date("2025-12-25") parses as UTC midnight which shows wrong date in some timezones
  const dateStr = isoString.includes('T') ? isoString : `${isoString}T12:00:00`;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Check if addon is available for given context
 */
export function isAddonAvailable(
  addon: AttractionAddon,
  partySize: number,
  selectedDate: string,
  resourceId?: string | null
): boolean {
  if (!addon.is_active) return false;
  if (!addon.availability_rules) return true;

  const rules = addon.availability_rules;

  // Check party size
  if (rules.min_party_size && partySize < rules.min_party_size) return false;
  if (rules.max_party_size && partySize > rules.max_party_size) return false;

  // Check day of week
  if (rules.days_of_week && rules.days_of_week.length > 0) {
    const dayOfWeek = new Date(selectedDate).getDay();
    if (!rules.days_of_week.includes(dayOfWeek)) return false;
  }

  // Check resource
  if (rules.resource_ids && rules.resource_ids.length > 0 && resourceId) {
    if (!rules.resource_ids.includes(resourceId)) return false;
  }

  return true;
}
