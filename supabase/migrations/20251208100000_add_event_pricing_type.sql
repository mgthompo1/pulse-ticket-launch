-- Add pricing_type column to events table for free/paid/donation events
ALTER TABLE events ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'paid';

-- Add constraint to ensure valid pricing types
ALTER TABLE events ADD CONSTRAINT events_pricing_type_check
  CHECK (pricing_type IN ('paid', 'free', 'donation'));

-- Add subscription tier and free event tracking to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS free_events_this_month INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS free_events_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraint for subscription tiers
ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_events_pricing_type ON events(pricing_type);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier ON organizations(subscription_tier);

-- Comment for documentation
COMMENT ON COLUMN events.pricing_type IS 'Event pricing model: paid (requires payment), free (RSVP only), donation (optional payment)';
COMMENT ON COLUMN organizations.subscription_tier IS 'Organization subscription level: free, pro, enterprise';
COMMENT ON COLUMN organizations.free_events_this_month IS 'Counter for free events created this month (reset monthly)';
