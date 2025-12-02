-- Migration: Add group_id column to promo_codes
-- Description: Links promo codes directly to groups instead of relying on description parsing

-- Add group_id column to promo_codes
ALTER TABLE promo_codes
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_group_id ON promo_codes(group_id);

COMMENT ON COLUMN promo_codes.group_id IS
'Optional reference to a group. When set, this code is associated with a specific group.';

-- Note: Existing codes with GROUP: prefix in description will continue to work
-- New codes should use the group_id column for cleaner association
