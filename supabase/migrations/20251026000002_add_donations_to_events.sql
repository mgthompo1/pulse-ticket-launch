-- Add donations_enabled field to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS donations_enabled BOOLEAN DEFAULT FALSE;

-- Add donation settings fields
ALTER TABLE events
ADD COLUMN IF NOT EXISTS donation_suggested_amounts TEXT[] DEFAULT ARRAY[5, 10, 25, 50, 100];

ALTER TABLE events
ADD COLUMN IF NOT EXISTS donation_description TEXT;
