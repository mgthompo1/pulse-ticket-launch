-- Add Apple Pay and Google Pay configuration fields to payment_credentials table
-- This allows organizations to enable/disable these payment methods

ALTER TABLE payment_credentials 
ADD COLUMN IF NOT EXISTS enable_apple_pay BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_google_pay BOOLEAN DEFAULT false;

-- Add comments to document the new fields
COMMENT ON COLUMN payment_credentials.enable_apple_pay IS 'Whether Apple Pay is enabled for this organization';
COMMENT ON COLUMN payment_credentials.enable_google_pay IS 'Whether Google Pay is enabled for this organization';

-- Update the get_public_payment_config function to include the new fields
-- Note: This function should be updated in your Supabase functions to return these fields
-- The function should select enable_apple_pay and enable_google_pay from payment_credentials
