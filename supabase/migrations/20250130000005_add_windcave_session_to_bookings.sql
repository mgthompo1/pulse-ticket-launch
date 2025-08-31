-- Add windcave_session_id field to attraction_bookings table
ALTER TABLE attraction_bookings 
ADD COLUMN windcave_session_id VARCHAR(255);

-- Add index for performance
CREATE INDEX idx_attraction_bookings_windcave_session ON attraction_bookings(windcave_session_id);

-- Add comment for documentation
COMMENT ON COLUMN attraction_bookings.windcave_session_id IS 'Windcave payment session ID for tracking payments';
