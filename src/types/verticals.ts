/**
 * Multi-Vertical Booking System Types
 * Supports golf, salon, spa, fitness, tours, rental, and general verticals
 */

// ============================================================================
// Vertical Type Definitions
// ============================================================================

export type VerticalType = 'general' | 'golf' | 'salon' | 'fitness' | 'tours' | 'spa' | 'rental' | 'entertainment';

export type StaffSelectionMode = 'none' | 'optional' | 'required';

export interface VerticalFeatures {
  staffSelection: StaffSelectionMode;
  serviceCatalog: boolean;
  staffSchedules: boolean;
  membershipPasses: boolean;
  pricingTiers: boolean;
  tipsEnabled: boolean;
  productSales: boolean;
  recurringBookings: boolean;
  clientProfiles: boolean;
  joinExisting: boolean;
  variableDuration: boolean;
  // Entertainment-specific features
  packages?: boolean;
  partyBookings?: boolean;
  resourceBooking?: boolean;
  foodAndBeverage?: boolean;
}

export interface VerticalTerminology {
  booking: string;
  bookings: string;
  resource: string;
  resources: string;
  customer: string;
  customers: string;
  partySize: string;
  startTime: string;
  duration: string;
  bookNow: string;
  checkIn: string;
}

export interface VerticalFeatureDefaults {
  id: string;
  vertical_type: VerticalType;
  features: VerticalFeatures;
  terminology: VerticalTerminology;
  default_config: Record<string, unknown>;
  created_at?: string;
}

// ============================================================================
// Client Profiles
// ============================================================================

export interface ClientProfile {
  id: string;
  organization_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  notes?: string | null;
  tags: string[];
  preferences: Record<string, unknown>;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientAttractionStats {
  id: string;
  client_id: string;
  attraction_id: string;
  total_bookings: number;
  total_spent: number;
  total_no_shows: number;
  total_cancellations: number;
  last_visit_at?: string | null;
  first_visit_at?: string | null;
  avg_party_size?: number | null;
  preferred_staff_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWithStats extends ClientProfile {
  stats?: ClientAttractionStats[];
}

// ============================================================================
// Membership Passes
// ============================================================================

export type PassType = 'unlimited' | 'punch_card' | 'time_limited';
export type ValidityPeriod = 'days' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
export type BillingInterval = 'month' | 'year';
export type PassStatus = 'active' | 'expired' | 'cancelled' | 'paused' | 'pending';

export interface PassRestrictions {
  daysOfWeek?: number[] | null;  // 0-6
  startTime?: string | null;     // HH:MM
  endTime?: string | null;       // HH:MM
  blackoutDates?: string[];
  resourceIds?: string[] | null;
  maxUsesPerDay?: number | null;
  maxUsesPerWeek?: number | null;
  maxUsesPerMonth?: number | null;
}

export interface AttractionPass {
  id: string;
  attraction_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  pass_type: PassType;
  price: number;
  currency: string;
  total_uses?: number | null;
  duration_days?: number | null;
  validity_period?: ValidityPeriod | null;
  is_subscription: boolean;
  stripe_price_id?: string | null;
  billing_interval?: BillingInterval | null;
  restrictions: PassRestrictions;
  member_discount_percent: number;
  included_addons: string[];
  priority_booking_hours: number;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  max_active_holders?: number | null;
  current_holders: number;
  created_at: string;
  updated_at: string;
}

export interface ClientPass {
  id: string;
  pass_id: string;
  client_id: string;
  purchased_at: string;
  purchase_price: number;
  purchase_currency: string;
  starts_at: string;
  expires_at?: string | null;
  remaining_uses?: number | null;
  total_uses_consumed: number;
  status: PassStatus;
  paused_at?: string | null;
  pause_reason?: string | null;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  next_billing_date?: string | null;
  stripe_payment_intent_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  pass?: AttractionPass;
  client?: ClientProfile;
}

export interface PassUsage {
  id: string;
  client_pass_id: string;
  booking_id?: string | null;
  used_at: string;
  use_type: 'booking' | 'manual' | 'refund';
  uses_consumed: number;
  notes?: string | null;
  created_by?: string | null;
}

// ============================================================================
// Pricing Tiers
// ============================================================================

export type DiscountType = 'percentage' | 'fixed';

export interface PricingTierConditions {
  requiresPass?: boolean;
  passTypeIds?: string[] | null;
  daysOfWeek?: number[] | null;
  startTime?: string | null;
  endTime?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  minPartySize?: number | null;
  maxPartySize?: number | null;
}

export interface AttractionPricingTier {
  id: string;
  attraction_id: string;
  name: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  price_override?: number | null;
  conditions: PricingTierConditions;
  priority: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Golf Configuration
// ============================================================================

export interface GolfCourseConfig {
  id: string;
  attraction_id: string;
  tee_time_interval: number;
  first_tee_time: string;
  last_tee_time: string;
  holes_options: number[];
  default_holes: number;
  nine_hole_duration: number;
  eighteen_hole_duration: number;
  max_players_per_tee: number;
  min_players_per_tee: number;
  allow_join_existing: boolean;
  allow_single_bookings: boolean;
  course_rating?: number | null;
  slope_rating?: number | null;
  par: number;
  total_yards?: number | null;
  cart_included: boolean;
  cart_fee?: number | null;
  walking_allowed: boolean;
  require_handicap: boolean;
  dress_code?: string | null;
  caddie_available: boolean;
  caddie_fee?: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Entertainment Configuration
// ============================================================================

export interface EntertainmentConfig {
  id: string;
  attraction_id: string;
  resource_label: string;  // 'Lane', 'Room', 'Station', 'Pod', 'Court'
  total_resources: number;
  duration_options: number[];
  default_duration: number;
  buffer_between: number;
  min_per_resource: number;
  max_per_resource: number;
  price_per_duration: boolean;
  equipment_included: boolean;
  equipment_fee?: number | null;
  party_packages_enabled: boolean;
  min_party_size: number;
  party_deposit_percent: number;
  fnb_enabled: boolean;
  fnb_required_for_parties: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartyPackage {
  id: string;
  attraction_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  duration_minutes: number;
  num_resources: number;
  min_guests?: number | null;
  max_guests?: number | null;
  base_price: number;
  price_per_extra_guest?: number | null;
  deposit_amount?: number | null;
  inclusions: string[];
  available_addons: string[];
  available_days: number[];
  available_start_time?: string | null;
  available_end_time?: string | null;
  blackout_dates: string[];
  advance_booking_days: number;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Salon Services
// ============================================================================

export interface ServiceVariablePricing {
  [key: string]: {
    duration: number;
    price: number;
  };
}

export interface ServiceOption {
  name: string;
  choices: string[];
}

export interface SalonService {
  id: string;
  attraction_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  base_duration: number;
  base_price: number;
  variable_duration: boolean;
  variable_pricing: ServiceVariablePricing;
  options: ServiceOption[];
  buffer_before: number;
  buffer_after: number;
  requires_consultation: boolean;
  requires_patch_test: boolean;
  patch_test_hours: number;
  deposit_required: boolean;
  deposit_amount?: number | null;
  deposit_type?: 'fixed' | 'percentage' | null;
  is_active: boolean;
  display_order: number;
  availability_rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type SkillLevel = 'junior' | 'standard' | 'senior' | 'specialist';

export interface StaffService {
  id: string;
  resource_id: string;
  service_id: string;
  price_override?: number | null;
  duration_override?: number | null;
  skill_level?: SkillLevel | null;
  is_active: boolean;
}

// ============================================================================
// Staff Schedules
// ============================================================================

export interface StaffSchedule {
  id: string;
  resource_id: string;
  day_of_week: number;  // 0-6
  start_time: string;   // HH:MM:SS
  end_time: string;     // HH:MM:SS
  is_working: boolean;
  break_start?: string | null;
  break_end?: string | null;
  effective_from?: string | null;
  effective_until?: string | null;
  created_at: string;
  updated_at: string;
}

export type TimeOffType = 'vacation' | 'sick' | 'personal' | 'training' | 'other';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected';

export interface StaffTimeOff {
  id: string;
  resource_id: string;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
  time_off_type: TimeOffType;
  status: TimeOffStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  bookings_affected: number;
  bookings_rescheduled: number;
  created_at: string;
}

// ============================================================================
// Recurring Appointments
// ============================================================================

export type RecurrencePattern = 'weekly' | 'biweekly' | 'every_3_weeks' | 'monthly' | 'every_6_weeks' | 'every_8_weeks' | 'quarterly';

export interface RecurringAppointment {
  id: string;
  attraction_id: string;
  client_id: string;
  resource_id?: string | null;
  service_id?: string | null;
  recurrence_pattern: RecurrencePattern;
  preferred_day_of_week?: number | null;
  preferred_time: string;
  duration_minutes: number;
  auto_book: boolean;
  auto_book_days_ahead: number;
  send_reminders: boolean;
  reminder_days_before: number;
  notes?: string | null;
  is_active: boolean;
  last_scheduled_at?: string | null;
  next_booking_date?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  client?: ClientProfile;
  resource?: unknown;  // StaffProfile from attraction-v3.ts
  service?: SalonService;
}

// ============================================================================
// Products & Retail
// ============================================================================

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

export interface VariantOption {
  name: string;
  values: string[];
}

export interface AttractionProduct {
  id: string;
  attraction_id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price: number;
  compare_at_price?: number | null;
  cost?: number | null;
  currency: string;
  category?: string | null;
  subcategory?: string | null;
  tags: string[];
  brand?: string | null;
  image_url?: string | null;
  images: string[];
  track_inventory: boolean;
  inventory_count: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
  has_variants: boolean;
  variant_options: VariantOption[];
  requires_shipping: boolean;
  weight_grams?: number | null;
  dimensions?: ProductDimensions | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  taxable: boolean;
  tax_code?: string | null;
  vendor_id?: string | null;
  custom_attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  cost?: number | null;
  option_values: Record<string, string>;
  inventory_count: number;
  image_url?: string | null;
  weight_grams?: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'partial_refund';
export type FulfillmentStatus = 'unfulfilled' | 'fulfilled' | 'shipped' | 'delivered' | 'cancelled';
export type SaleChannel = 'pos' | 'online' | 'booking' | 'phone';

export interface ProductSale {
  id: string;
  attraction_id: string;
  product_id?: string | null;
  variant_id?: string | null;
  product_name: string;
  variant_name?: string | null;
  booking_id?: string | null;
  client_id?: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  discount_reason?: string | null;
  total_price: number;
  tax_amount: number;
  tax_rate?: number | null;
  payment_status: PaymentStatus;
  stripe_payment_intent_id?: string | null;
  fulfillment_status: FulfillmentStatus;
  fulfilled_at?: string | null;
  fulfilled_by?: string | null;
  tracking_number?: string | null;
  shipping_carrier?: string | null;
  sold_by?: string | null;
  notes?: string | null;
  sale_channel: SaleChannel;
  sold_at: string;
  created_at: string;
  // Relations
  product?: AttractionProduct;
  variant?: ProductVariant;
  client?: ClientProfile;
}

export type InventoryTransactionType = 'sale' | 'return' | 'adjustment' | 'restock' | 'transfer' | 'damage' | 'shrinkage';

export interface InventoryTransaction {
  id: string;
  product_id?: string | null;
  variant_id?: string | null;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  transaction_type: InventoryTransactionType;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  performed_by?: string | null;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  attraction_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  parent_id?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  children?: ProductCategory[];
}

// ============================================================================
// Vertical Configuration Helper Types
// ============================================================================

export interface VerticalConfig {
  type: VerticalType;
  features: VerticalFeatures;
  terminology: VerticalTerminology;
  config: Record<string, unknown>;
}

export interface GolfVerticalConfig extends VerticalConfig {
  type: 'golf';
  config: {
    teeTimeInterval: number;
    defaultHoles: number;
    holesOptions: number[];
    maxPlayersPerTee: number;
    allowJoinExisting: boolean;
    cartIncluded: boolean;
  };
}

export interface SalonVerticalConfig extends VerticalConfig {
  type: 'salon';
  config: {
    tipOptions: number[];
    defaultTipPercent: number;
    allowNoShow: boolean;
    noShowFeePercent: number;
    requireDeposit: boolean;
    depositPercent: number;
  };
}

export interface FitnessVerticalConfig extends VerticalConfig {
  type: 'fitness';
  config: {
    allowWaitlist: boolean;
    waitlistMax: number;
    allowClassPass: boolean;
    cancellationHours: number;
  };
}

// ============================================================================
// Extended Booking Types (with new fields)
// ============================================================================

export interface BookingWithVerticalFields {
  // Base fields from attraction-v3.ts
  id: string;
  attraction_id: string;
  booking_slot_id: string;
  organization_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  party_size: number;
  special_requests?: string | null;
  total_amount: number;
  currency: string;
  payment_status: string;
  booking_status: string;
  booking_reference: string;
  created_at: string;
  updated_at: string;

  // New vertical-related fields
  client_id?: string | null;
  pass_id?: string | null;
  pricing_tier_id?: string | null;
  original_amount?: number | null;
  discount_amount?: number | null;
  discount_description?: string | null;
  holes_selected?: number | null;
  join_existing_booking_id?: string | null;
  service_id?: string | null;
  service_options?: Record<string, unknown>;
  tip_amount?: number | null;
  tip_percent?: number | null;
  tip_paid_at?: string | null;
  tip_staff_id?: string | null;
  recurring_appointment_id?: string | null;

  // Relations
  client?: ClientProfile;
  pass?: ClientPass;
  pricing_tier?: AttractionPricingTier;
  service?: SalonService;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the label for a term based on vertical terminology
 */
export function getTerm(
  terminology: VerticalTerminology,
  key: keyof VerticalTerminology,
  plural = false
): string {
  const term = terminology[key];
  if (!term) return key;

  // Handle special plural cases
  if (plural && key === 'booking') return terminology.bookings || `${term}s`;
  if (plural && key === 'resource') return terminology.resources || `${term}s`;
  if (plural && key === 'customer') return terminology.customers || `${term}s`;

  return term;
}

/**
 * Check if a feature is enabled for a vertical
 */
export function isFeatureEnabled(
  features: VerticalFeatures,
  feature: keyof VerticalFeatures
): boolean {
  const value = features[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value !== 'none';
  return false;
}

/**
 * Get display name for a vertical type
 */
export function getVerticalDisplayName(type: VerticalType): string {
  const names: Record<VerticalType, string> = {
    general: 'General',
    golf: 'Golf Course',
    salon: 'Hair Salon / Barber',
    fitness: 'Fitness Studio',
    tours: 'Tours & Activities',
    spa: 'Spa & Wellness',
    rental: 'Equipment Rental',
    entertainment: 'Entertainment Venue',
  };
  return names[type] || type;
}

/**
 * Get icon name for a vertical type (Lucide icon names)
 */
export function getVerticalIcon(type: VerticalType): string {
  const icons: Record<VerticalType, string> = {
    general: 'Calendar',
    golf: 'Flag',
    salon: 'Scissors',
    fitness: 'Dumbbell',
    tours: 'MapPin',
    spa: 'Sparkles',
    rental: 'Package',
    entertainment: 'Gamepad2',
  };
  return icons[type] || 'Calendar';
}

/**
 * Format pass validity for display
 */
export function formatPassValidity(pass: AttractionPass): string {
  if (pass.pass_type === 'unlimited') {
    if (pass.validity_period === 'lifetime') return 'Lifetime access';
    return `Unlimited ${pass.validity_period} pass`;
  }

  if (pass.pass_type === 'punch_card') {
    return `${pass.total_uses} visit${pass.total_uses !== 1 ? 's' : ''}`;
  }

  if (pass.pass_type === 'time_limited' && pass.duration_days) {
    return `${pass.duration_days} day${pass.duration_days !== 1 ? 's' : ''}`;
  }

  return 'Pass';
}

/**
 * Calculate remaining validity for a client pass
 */
export function getPassRemainingValidity(clientPass: ClientPass): string {
  if (clientPass.status !== 'active') {
    return clientPass.status.charAt(0).toUpperCase() + clientPass.status.slice(1);
  }

  if (clientPass.remaining_uses !== null) {
    return `${clientPass.remaining_uses} visit${clientPass.remaining_uses !== 1 ? 's' : ''} remaining`;
  }

  if (clientPass.expires_at) {
    const expiry = new Date(clientPass.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return 'Expired';
    if (daysLeft === 0) return 'Expires today';
    if (daysLeft === 1) return 'Expires tomorrow';
    return `${daysLeft} days remaining`;
  }

  return 'Active';
}
