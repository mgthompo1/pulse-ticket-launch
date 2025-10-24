-- Add stripe_terminal_location_id column to organizations table for Tap to Pay
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_terminal_location_id TEXT;

COMMENT ON COLUMN organizations.stripe_terminal_location_id IS 'Stripe Terminal location ID (format: tml_xxxxx) for Tap to Pay on iPhone functionality in the iOS app';
