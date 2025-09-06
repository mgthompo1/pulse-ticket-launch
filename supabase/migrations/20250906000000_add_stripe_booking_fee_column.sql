-- Add stripe_booking_fee_enabled column to organizations table
ALTER TABLE organizations 
ADD COLUMN stripe_booking_fee_enabled BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN organizations.stripe_booking_fee_enabled IS 'When enabled, booking fees (1% + $0.50) are passed to customers via Stripe separate charges, and no platform fee is generated';