-- Add membership settings to events table
-- Allows per-event configuration of membership features

ALTER TABLE events
ADD COLUMN IF NOT EXISTS membership_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS membership_signup_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS membership_discount_display BOOLEAN DEFAULT true;

-- membership_enabled: Show member pricing on this event
-- membership_signup_enabled: Allow new customers to sign up for membership during checkout
-- membership_discount_display: Show "Member Price" badges on tickets

COMMENT ON COLUMN events.membership_enabled IS 'Enable member pricing display for this event';
COMMENT ON COLUMN events.membership_signup_enabled IS 'Allow membership signup during checkout';
COMMENT ON COLUMN events.membership_discount_display IS 'Show member price badges on ticket types';
