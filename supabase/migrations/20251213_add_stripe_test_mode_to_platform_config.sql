-- Add Stripe test mode columns to platform_config
ALTER TABLE platform_config
ADD COLUMN IF NOT EXISTS stripe_test_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_test_publishable_key TEXT;

-- Add comment
COMMENT ON COLUMN platform_config.stripe_test_mode IS 'Global toggle for Stripe test mode';
COMMENT ON COLUMN platform_config.stripe_test_publishable_key IS 'Stripe test publishable key (pk_test_xxx)';
