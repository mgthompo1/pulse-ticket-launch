-- Add Stripe Connect fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_access_token TEXT,
ADD COLUMN IF NOT EXISTS stripe_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS stripe_scope TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account_id ON organizations(stripe_account_id);

-- Update the get_public_payment_config function to include Connect account info
CREATE OR REPLACE FUNCTION get_public_payment_config(p_event_id UUID)
RETURNS TABLE (
    stripe_publishable_key TEXT,
    payment_provider TEXT,
    currency TEXT,
    credit_card_processing_fee_percentage NUMERIC,
    apple_pay_merchant_id TEXT,
    windcave_enabled BOOLEAN,
    stripe_account_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.stripe_publishable_key,
        o.payment_provider,
        o.currency,
        o.credit_card_processing_fee_percentage,
        o.apple_pay_merchant_id,
        o.windcave_enabled,
        o.stripe_account_id
    FROM events e
    JOIN organizations o ON e.organization_id = o.id
    WHERE e.id = p_event_id;
END;
$$;