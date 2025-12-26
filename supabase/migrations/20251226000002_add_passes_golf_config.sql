-- ============================================================================
-- Multi-Vertical Booking System - Phase 2: Membership Passes + Golf Config
-- Supports both one-time and subscription-based passes
-- ============================================================================

-- 1. Pass Templates (what can be purchased)
-- ============================================================================
CREATE TABLE IF NOT EXISTS attraction_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Pass type
  pass_type TEXT NOT NULL CHECK (pass_type IN ('unlimited', 'punch_card', 'time_limited')),

  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'NZD',

  -- For punch cards
  total_uses INTEGER,  -- NULL for unlimited

  -- For time-limited passes
  duration_days INTEGER,  -- NULL for punch cards
  validity_period TEXT CHECK (validity_period IN ('days', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime')),

  -- Subscription settings (for recurring billing)
  is_subscription BOOLEAN DEFAULT false,
  stripe_price_id TEXT,  -- Stripe Price ID for subscriptions
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),

  -- Restrictions
  restrictions JSONB DEFAULT '{
    "daysOfWeek": null,
    "startTime": null,
    "endTime": null,
    "blackoutDates": [],
    "resourceIds": null,
    "maxUsesPerDay": null,
    "maxUsesPerWeek": null,
    "maxUsesPerMonth": null
  }',

  -- Member benefits
  member_discount_percent INTEGER DEFAULT 0,
  included_addons TEXT[] DEFAULT '{}',
  priority_booking_hours INTEGER DEFAULT 0,  -- How many hours before public can book

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Limits
  max_active_holders INTEGER,  -- Max people who can hold this pass at once
  current_holders INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_passes_attraction ON attraction_passes(attraction_id, is_active);
CREATE INDEX IF NOT EXISTS idx_passes_stripe ON attraction_passes(stripe_price_id) WHERE stripe_price_id IS NOT NULL;

COMMENT ON TABLE attraction_passes IS 'Pass/membership templates that customers can purchase';

-- RLS
ALTER TABLE attraction_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active passes" ON attraction_passes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage passes" ON attraction_passes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = attraction_passes.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 2. Customer Purchased Passes
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id UUID NOT NULL REFERENCES attraction_passes(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,

  -- Purchase info
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  purchase_price DECIMAL(10,2) NOT NULL,
  purchase_currency TEXT DEFAULT 'NZD',

  -- Validity
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Usage (for punch cards)
  remaining_uses INTEGER,  -- NULL for unlimited
  total_uses_consumed INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'paused', 'pending')),
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,

  -- Stripe subscription (for recurring passes)
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  next_billing_date TIMESTAMPTZ,

  -- Payment
  stripe_payment_intent_id TEXT,

  -- Metadata
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_passes_client ON client_passes(client_id, status);
CREATE INDEX IF NOT EXISTS idx_client_passes_pass ON client_passes(pass_id);
CREATE INDEX IF NOT EXISTS idx_client_passes_status ON client_passes(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_client_passes_stripe ON client_passes(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_passes_expires ON client_passes(expires_at) WHERE status = 'active';

COMMENT ON TABLE client_passes IS 'Customer-owned passes/memberships';

-- RLS
ALTER TABLE client_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own passes" ON client_passes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = client_passes.client_id
      AND LOWER(cp.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Org members can view passes" ON client_passes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM attraction_passes ap
      JOIN attractions a ON a.id = ap.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE ap.id = client_passes.pass_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage passes" ON client_passes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attraction_passes ap
      JOIN attractions a ON a.id = ap.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE ap.id = client_passes.pass_id
      AND ou.user_id = auth.uid()
    )
  );

-- 3. Pass Usage Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS pass_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_pass_id UUID NOT NULL REFERENCES client_passes(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES attraction_bookings(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  use_type TEXT DEFAULT 'booking' CHECK (use_type IN ('booking', 'manual', 'refund')),
  uses_consumed INTEGER DEFAULT 1,  -- Can be negative for refunds
  notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pass_usage_pass ON pass_usage(client_pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_usage_booking ON pass_usage(booking_id);
CREATE INDEX IF NOT EXISTS idx_pass_usage_date ON pass_usage(used_at DESC);

-- RLS
ALTER TABLE pass_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view usage" ON pass_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_passes cp
      JOIN attraction_passes ap ON ap.id = cp.pass_id
      JOIN attractions a ON a.id = ap.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE cp.id = pass_usage.client_pass_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage usage" ON pass_usage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM client_passes cp
      JOIN attraction_passes ap ON ap.id = cp.pass_id
      JOIN attractions a ON a.id = ap.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE cp.id = pass_usage.client_pass_id
      AND ou.user_id = auth.uid()
    )
  );

-- 4. Pricing Tiers (member vs public pricing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS attraction_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- 'public', 'member', 'senior', 'junior', 'twilight'
  description TEXT,

  -- Discount type
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) DEFAULT 0,  -- percentage or fixed amount off

  -- Alternatively, override price entirely
  price_override DECIMAL(10,2),

  -- Conditions
  conditions JSONB DEFAULT '{
    "requiresPass": false,
    "passTypeIds": null,
    "daysOfWeek": null,
    "startTime": null,
    "endTime": null,
    "minAge": null,
    "maxAge": null,
    "minPartySize": null,
    "maxPartySize": null
  }',

  -- Priority (higher = checked first)
  priority INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,  -- Default tier for this attraction

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_attraction ON attraction_pricing_tiers(attraction_id, is_active, priority DESC);

COMMENT ON TABLE attraction_pricing_tiers IS 'Different pricing levels (public, member, senior, etc.)';

-- RLS
ALTER TABLE attraction_pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active pricing tiers" ON attraction_pricing_tiers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage pricing tiers" ON attraction_pricing_tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = attraction_pricing_tiers.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 5. Link bookings to passes and pricing tiers
-- ============================================================================
ALTER TABLE attraction_bookings
ADD COLUMN IF NOT EXISTS pass_id UUID REFERENCES client_passes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pricing_tier_id UUID REFERENCES attraction_pricing_tiers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_description TEXT;

-- 6. Golf Course Configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS golf_course_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE UNIQUE,

  -- Tee time settings
  tee_time_interval INTEGER DEFAULT 10,  -- minutes between tee times
  first_tee_time TIME DEFAULT '06:00',
  last_tee_time TIME DEFAULT '18:00',

  -- Holes
  holes_options INTEGER[] DEFAULT '{9, 18}',
  default_holes INTEGER DEFAULT 18,
  nine_hole_duration INTEGER DEFAULT 120,  -- minutes
  eighteen_hole_duration INTEGER DEFAULT 240,  -- minutes

  -- Player settings
  max_players_per_tee INTEGER DEFAULT 4,
  min_players_per_tee INTEGER DEFAULT 1,
  allow_join_existing BOOLEAN DEFAULT true,
  allow_single_bookings BOOLEAN DEFAULT true,

  -- Course info
  course_rating DECIMAL(3,1),
  slope_rating INTEGER,
  par INTEGER DEFAULT 72,
  total_yards INTEGER,

  -- Cart settings
  cart_included BOOLEAN DEFAULT false,
  cart_fee DECIMAL(10,2),
  walking_allowed BOOLEAN DEFAULT true,

  -- Additional settings
  require_handicap BOOLEAN DEFAULT false,
  dress_code TEXT,
  caddie_available BOOLEAN DEFAULT false,
  caddie_fee DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_golf_config_attraction ON golf_course_config(attraction_id);

COMMENT ON TABLE golf_course_config IS 'Golf-specific configuration for attractions';

-- RLS
ALTER TABLE golf_course_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view golf config" ON golf_course_config
  FOR SELECT USING (true);

CREATE POLICY "Org members can manage golf config" ON golf_course_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = golf_course_config.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 7. Add holes to bookings
-- ============================================================================
ALTER TABLE attraction_bookings
ADD COLUMN IF NOT EXISTS holes_selected INTEGER,
ADD COLUMN IF NOT EXISTS join_existing_booking_id UUID REFERENCES attraction_bookings(id);

-- 8. Function to check if pass is valid for booking
-- ============================================================================
CREATE OR REPLACE FUNCTION is_pass_valid_for_booking(
  p_client_pass_id UUID,
  p_attraction_id UUID,
  p_booking_date DATE,
  p_start_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  v_pass client_passes;
  v_template attraction_passes;
  v_restrictions JSONB;
  v_day_of_week INTEGER;
BEGIN
  -- Get client pass
  SELECT * INTO v_pass
  FROM client_passes
  WHERE id = p_client_pass_id;

  IF v_pass IS NULL THEN
    RETURN false;
  END IF;

  -- Get pass template
  SELECT * INTO v_template
  FROM attraction_passes
  WHERE id = v_pass.pass_id;

  -- Check pass belongs to this attraction
  IF v_template.attraction_id != p_attraction_id THEN
    RETURN false;
  END IF;

  -- Check status
  IF v_pass.status != 'active' THEN
    RETURN false;
  END IF;

  -- Check expiry
  IF v_pass.expires_at IS NOT NULL AND v_pass.expires_at < NOW() THEN
    RETURN false;
  END IF;

  -- Check remaining uses (for punch cards)
  IF v_pass.remaining_uses IS NOT NULL AND v_pass.remaining_uses <= 0 THEN
    RETURN false;
  END IF;

  -- Check restrictions
  v_restrictions := v_template.restrictions;
  v_day_of_week := EXTRACT(DOW FROM p_booking_date)::INTEGER;

  -- Day of week restriction
  IF v_restrictions->'daysOfWeek' IS NOT NULL AND
     NOT (v_restrictions->'daysOfWeek') @> to_jsonb(v_day_of_week) THEN
    RETURN false;
  END IF;

  -- Time restrictions
  IF v_restrictions->>'startTime' IS NOT NULL AND
     p_start_time < (v_restrictions->>'startTime')::TIME THEN
    RETURN false;
  END IF;

  IF v_restrictions->>'endTime' IS NOT NULL AND
     p_start_time > (v_restrictions->>'endTime')::TIME THEN
    RETURN false;
  END IF;

  -- Blackout dates
  IF v_restrictions->'blackoutDates' IS NOT NULL AND
     (v_restrictions->'blackoutDates') @> to_jsonb(p_booking_date::TEXT) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Function to consume pass use on booking
-- ============================================================================
CREATE OR REPLACE FUNCTION consume_pass_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pass_id IS NOT NULL THEN
    -- Record usage
    INSERT INTO pass_usage (client_pass_id, booking_id, uses_consumed)
    VALUES (NEW.pass_id, NEW.id, 1);

    -- Decrement remaining uses if applicable
    UPDATE client_passes
    SET
      remaining_uses = CASE WHEN remaining_uses IS NOT NULL THEN remaining_uses - 1 ELSE remaining_uses END,
      total_uses_consumed = total_uses_consumed + 1,
      updated_at = NOW()
    WHERE id = NEW.pass_id;

    -- Check if pass should expire (punch card with 0 remaining)
    UPDATE client_passes
    SET status = 'expired', updated_at = NOW()
    WHERE id = NEW.pass_id
      AND remaining_uses IS NOT NULL
      AND remaining_uses <= 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS consume_pass_on_booking_trigger ON attraction_bookings;
CREATE TRIGGER consume_pass_on_booking_trigger
  AFTER INSERT ON attraction_bookings
  FOR EACH ROW
  WHEN (NEW.pass_id IS NOT NULL)
  EXECUTE FUNCTION consume_pass_on_booking();

-- 10. Function to calculate price with tier
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_booking_price(
  p_attraction_id UUID,
  p_base_price DECIMAL,
  p_party_size INTEGER,
  p_client_id UUID DEFAULT NULL,
  p_booking_date DATE DEFAULT CURRENT_DATE,
  p_start_time TIME DEFAULT '12:00'
)
RETURNS TABLE (
  final_price DECIMAL,
  tier_id UUID,
  tier_name TEXT,
  discount_amount DECIMAL,
  discount_description TEXT
) AS $$
DECLARE
  v_tier attraction_pricing_tiers;
  v_has_active_pass BOOLEAN := false;
  v_discount DECIMAL := 0;
  v_final DECIMAL;
  v_day_of_week INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_booking_date)::INTEGER;

  -- Check if client has an active pass
  IF p_client_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM client_passes cp
      JOIN attraction_passes ap ON ap.id = cp.pass_id
      WHERE cp.client_id = p_client_id
      AND ap.attraction_id = p_attraction_id
      AND cp.status = 'active'
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
    ) INTO v_has_active_pass;
  END IF;

  -- Find applicable pricing tier (highest priority that matches conditions)
  SELECT * INTO v_tier
  FROM attraction_pricing_tiers pt
  WHERE pt.attraction_id = p_attraction_id
    AND pt.is_active = true
    AND (
      -- Check pass requirement
      (pt.conditions->>'requiresPass')::boolean IS NOT TRUE
      OR v_has_active_pass = true
    )
    AND (
      -- Check day of week
      pt.conditions->'daysOfWeek' IS NULL
      OR (pt.conditions->'daysOfWeek') @> to_jsonb(v_day_of_week)
    )
    AND (
      -- Check time
      (pt.conditions->>'startTime') IS NULL
      OR p_start_time >= (pt.conditions->>'startTime')::TIME
    )
    AND (
      -- Check time
      (pt.conditions->>'endTime') IS NULL
      OR p_start_time <= (pt.conditions->>'endTime')::TIME
    )
  ORDER BY pt.priority DESC, pt.discount_value DESC
  LIMIT 1;

  -- Calculate final price
  IF v_tier.id IS NOT NULL THEN
    IF v_tier.price_override IS NOT NULL THEN
      v_final := v_tier.price_override * p_party_size;
      v_discount := (p_base_price * p_party_size) - v_final;
    ELSIF v_tier.discount_type = 'percentage' THEN
      v_discount := (p_base_price * p_party_size) * (v_tier.discount_value / 100);
      v_final := (p_base_price * p_party_size) - v_discount;
    ELSE -- fixed
      v_discount := v_tier.discount_value * p_party_size;
      v_final := (p_base_price * p_party_size) - v_discount;
    END IF;

    RETURN QUERY SELECT
      GREATEST(v_final, 0),
      v_tier.id,
      v_tier.name,
      v_discount,
      v_tier.name || ' pricing applied';
  ELSE
    -- No tier, return base price
    RETURN QUERY SELECT
      p_base_price * p_party_size,
      NULL::UUID,
      'Standard'::TEXT,
      0::DECIMAL,
      NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. Update pass holder count on purchase/cancel
-- ============================================================================
CREATE OR REPLACE FUNCTION update_pass_holder_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE attraction_passes
    SET current_holders = current_holders + 1
    WHERE id = NEW.pass_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Became active
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
      UPDATE attraction_passes
      SET current_holders = current_holders + 1
      WHERE id = NEW.pass_id;
    -- Became inactive
    ELSIF NEW.status != 'active' AND OLD.status = 'active' THEN
      UPDATE attraction_passes
      SET current_holders = GREATEST(current_holders - 1, 0)
      WHERE id = NEW.pass_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE attraction_passes
    SET current_holders = GREATEST(current_holders - 1, 0)
    WHERE id = OLD.pass_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_pass_holder_count_trigger ON client_passes;
CREATE TRIGGER update_pass_holder_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON client_passes
  FOR EACH ROW
  EXECUTE FUNCTION update_pass_holder_count();
