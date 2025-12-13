-- Add stripe_test_mode column to organizations table
-- This allows per-organization toggle between Stripe test and live mode

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_test_mode BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN organizations.stripe_test_mode IS 'When true, use Stripe test/sandbox mode for this organization. Requires platform test keys configured in edge function secrets.';

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_test_mode ON organizations(stripe_test_mode) WHERE stripe_test_mode = TRUE;
