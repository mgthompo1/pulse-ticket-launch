-- Migration: Create Membership System
-- Description: Adds membership tiers, benefits, member management, and related tables

-- Add membership_enabled to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS membership_enabled BOOLEAN DEFAULT false;

-- Create membership_tiers table
CREATE TABLE IF NOT EXISTS membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  interval TEXT NOT NULL DEFAULT 'monthly' CHECK (interval IN ('monthly', 'quarterly', 'yearly', 'lifetime')),
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'crown',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_renew_default BOOLEAN NOT NULL DEFAULT true,
  trial_days INTEGER,
  max_members INTEGER, -- null = unlimited
  stripe_price_id TEXT, -- For Stripe subscription integration
  stripe_product_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_membership_tiers_org ON membership_tiers(organization_id);
CREATE INDEX IF NOT EXISTS idx_membership_tiers_active ON membership_tiers(organization_id, is_active);

-- Create membership_benefits table
CREATE TABLE IF NOT EXISTS membership_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES membership_tiers(id) ON DELETE CASCADE,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('discount_percentage', 'discount_fixed', 'early_access', 'exclusive_events', 'free_tickets', 'priority_seating', 'guest_passes')),
  value DECIMAL(10, 2), -- e.g., 10 for 10% discount, 2 for 2 guest passes
  description TEXT NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'all_events' CHECK (applies_to IN ('all_events', 'specific_events', 'specific_ticket_types')),
  event_ids UUID[], -- If applies_to = 'specific_events'
  ticket_type_ids UUID[], -- If applies_to = 'specific_ticket_types'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_benefits_tier ON membership_benefits(tier_id);

-- Create memberships table (customer memberships)
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES membership_tiers(id) ON DELETE RESTRICT,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Link to CRM contacts
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'cancelled', 'pending', 'paused')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ, -- null for lifetime memberships
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  payment_method_id TEXT,
  last_payment_date TIMESTAMPTZ,
  next_payment_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  notes TEXT,
  member_number TEXT, -- Display number like "MEM-00001"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tier ON memberships(tier_id);
CREATE INDEX IF NOT EXISTS idx_memberships_email ON memberships(customer_email);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_contact ON memberships(contact_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_stripe_sub ON memberships(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Create membership_payments table
CREATE TABLE IF NOT EXISTS membership_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NZD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  payment_method TEXT,
  invoice_url TEXT,
  receipt_url TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_payments_membership ON membership_payments(membership_id);
CREATE INDEX IF NOT EXISTS idx_membership_payments_status ON membership_payments(status);

-- Create member_pricing table (special pricing for members on ticket types)
CREATE TABLE IF NOT EXISTS member_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES membership_tiers(id) ON DELETE CASCADE,
  member_price DECIMAL(10, 2) NOT NULL,
  is_exclusive BOOLEAN NOT NULL DEFAULT false, -- Only members can purchase
  max_per_member INTEGER, -- null = unlimited
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ticket_type_id, tier_id)
);

CREATE INDEX IF NOT EXISTS idx_member_pricing_ticket ON member_pricing(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_member_pricing_tier ON member_pricing(tier_id);

-- Function to generate member numbers
CREATE OR REPLACE FUNCTION generate_member_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  org_prefix TEXT;
BEGIN
  -- Get the next number for this organization
  SELECT COALESCE(MAX(
    CASE
      WHEN member_number ~ '^MEM-[0-9]+$'
      THEN CAST(SUBSTRING(member_number FROM 5) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM memberships
  WHERE organization_id = NEW.organization_id;

  -- Generate the member number
  NEW.member_number := 'MEM-' || LPAD(next_num::TEXT, 5, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate member numbers
DROP TRIGGER IF EXISTS trigger_generate_member_number ON memberships;
CREATE TRIGGER trigger_generate_member_number
  BEFORE INSERT ON memberships
  FOR EACH ROW
  WHEN (NEW.member_number IS NULL)
  EXECUTE FUNCTION generate_member_number();

-- Function to update membership status based on dates
CREATE OR REPLACE FUNCTION update_membership_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If end_date has passed and status is active, mark as expired
  IF NEW.end_date IS NOT NULL AND NEW.end_date < now() AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;

  -- Update the updated_at timestamp
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for membership status updates
DROP TRIGGER IF EXISTS trigger_update_membership_status ON memberships;
CREATE TRIGGER trigger_update_membership_status
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_status();

-- Function to update tier updated_at
CREATE OR REPLACE FUNCTION update_tier_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tier updates
DROP TRIGGER IF EXISTS trigger_update_tier_timestamp ON membership_tiers;
CREATE TRIGGER trigger_update_tier_timestamp
  BEFORE UPDATE ON membership_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_tier_timestamp();

-- RLS Policies
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_pricing ENABLE ROW LEVEL SECURITY;

-- Membership Tiers policies
CREATE POLICY "Users can view tiers for their organizations"
  ON membership_tiers FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can manage tiers"
  ON membership_tiers FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Membership Benefits policies
CREATE POLICY "Users can view benefits for their organization tiers"
  ON membership_benefits FOR SELECT
  USING (
    tier_id IN (
      SELECT id FROM membership_tiers WHERE organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners and admins can manage benefits"
  ON membership_benefits FOR ALL
  USING (
    tier_id IN (
      SELECT id FROM membership_tiers WHERE organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Memberships policies
CREATE POLICY "Users can view memberships for their organizations"
  ON memberships FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can manage memberships"
  ON memberships FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Membership Payments policies
CREATE POLICY "Users can view payments for their organization memberships"
  ON membership_payments FOR SELECT
  USING (
    membership_id IN (
      SELECT id FROM memberships WHERE organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners and admins can manage payments"
  ON membership_payments FOR ALL
  USING (
    membership_id IN (
      SELECT id FROM memberships WHERE organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Member Pricing policies
CREATE POLICY "Users can view member pricing for their organizations"
  ON member_pricing FOR SELECT
  USING (
    tier_id IN (
      SELECT id FROM membership_tiers WHERE organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners and admins can manage member pricing"
  ON member_pricing FOR ALL
  USING (
    tier_id IN (
      SELECT id FROM membership_tiers WHERE organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Grant permissions
GRANT ALL ON membership_tiers TO authenticated;
GRANT ALL ON membership_benefits TO authenticated;
GRANT ALL ON memberships TO authenticated;
GRANT ALL ON membership_payments TO authenticated;
GRANT ALL ON member_pricing TO authenticated;
