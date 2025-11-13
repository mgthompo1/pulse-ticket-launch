-- Add attendees_per_ticket column to ticket_types table
-- This allows tickets to generate multiple attendee forms (e.g., parent + child events)

ALTER TABLE ticket_types
ADD COLUMN IF NOT EXISTS attendees_per_ticket INTEGER NOT NULL DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN ticket_types.attendees_per_ticket IS 'Number of attendee information forms to collect per ticket purchased. Default is 1. Use 2+ for parent+child or group tickets.';

-- Update existing rows to have default value of 1
UPDATE ticket_types
SET attendees_per_ticket = 1
WHERE attendees_per_ticket IS NULL;
