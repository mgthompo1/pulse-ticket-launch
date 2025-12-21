// Membership System Types

export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'pending' | 'paused';
export type MembershipInterval = 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
export type BenefitType = 'discount_percentage' | 'discount_fixed' | 'early_access' | 'exclusive_events' | 'free_tickets' | 'priority_seating' | 'guest_passes';

export interface MembershipTier {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price: number;
  interval: MembershipInterval;
  color: string | null; // For badge display
  icon: string | null; // Icon name
  sort_order: number;
  is_active: boolean;
  auto_renew_default: boolean;
  trial_days: number | null;
  max_members: number | null; // null = unlimited
  current_members: number;
  benefits: MembershipBenefit[];
  created_at: string;
  updated_at: string;
}

export interface MembershipBenefit {
  id: string;
  tier_id: string;
  benefit_type: BenefitType;
  value: number | null; // e.g., 10 for 10% discount, 2 for 2 guest passes
  description: string;
  applies_to: 'all_events' | 'specific_events' | 'specific_ticket_types';
  event_ids: string[] | null; // If applies_to = 'specific_events'
  ticket_type_ids: string[] | null; // If applies_to = 'specific_ticket_types'
  created_at: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  tier_id: string;
  tier?: MembershipTier;
  customer_email: string;
  customer_name: string | null;
  customer_phone: string | null;
  contact_id: string | null; // Link to CRM contacts
  status: MembershipStatus;
  start_date: string;
  end_date: string | null; // null for lifetime
  auto_renew: boolean;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  payment_method_id: string | null;
  last_payment_date: string | null;
  next_payment_date: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  notes: string | null;
  member_number: string | null; // Display number like "MEM-00001"
  created_at: string;
  updated_at: string;
}

export interface MembershipPayment {
  id: string;
  membership_id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  stripe_payment_intent_id: string | null;
  payment_method: string | null;
  invoice_url: string | null;
  receipt_url: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface MemberPricing {
  id: string;
  ticket_type_id: string;
  tier_id: string;
  member_price: number;
  is_exclusive: boolean; // Only members can purchase
  max_per_member: number | null;
  created_at: string;
}

// For the UI
export interface MembershipStats {
  totalMembers: number;
  activeMembers: number;
  expiringSoon: number; // Within 30 days
  newThisMonth: number;
  churnedThisMonth: number;
  recurringRevenue: number;
  revenueByTier: Array<{ tier: string; revenue: number; count: number }>;
}

export interface CreateMembershipTierInput {
  name: string;
  description?: string;
  price: number;
  interval: MembershipInterval;
  color?: string;
  icon?: string;
  auto_renew_default?: boolean;
  trial_days?: number;
  max_members?: number;
  benefits?: Omit<MembershipBenefit, 'id' | 'tier_id' | 'created_at'>[];
}

export interface CreateMembershipInput {
  tier_id: string;
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  contact_id?: string;
  auto_renew?: boolean;
  notes?: string;
  send_welcome_email?: boolean;
}
