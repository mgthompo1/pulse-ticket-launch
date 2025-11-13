-- Add Google Maps location data to events table
-- This allows storing precise venue coordinates and displaying maps

ALTER TABLE events
ADD COLUMN IF NOT EXISTS venue_address TEXT,
ADD COLUMN IF NOT EXISTS venue_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS venue_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS venue_place_id TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN events.venue_address IS 'Full formatted address from Google Maps';
COMMENT ON COLUMN events.venue_lat IS 'Latitude coordinate for map display';
COMMENT ON COLUMN events.venue_lng IS 'Longitude coordinate for map display';
COMMENT ON COLUMN events.venue_place_id IS 'Google Place ID for reference';

-- Copy existing venue data to venue_address where it exists
UPDATE events
SET venue_address = venue
WHERE venue IS NOT NULL AND venue_address IS NULL;
