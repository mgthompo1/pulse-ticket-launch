-- Add donation_title field to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS donation_title TEXT DEFAULT 'Support Our Cause';

-- Update existing events to have the default title if they have donations enabled
UPDATE events
SET donation_title = 'Support Our Cause'
WHERE donations_enabled = TRUE AND donation_title IS NULL;
