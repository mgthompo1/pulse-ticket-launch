-- Update promotional_emails table to support new recipient types and tracking

-- First, drop the existing constraint
ALTER TABLE promotional_emails
  DROP CONSTRAINT IF EXISTS promotional_emails_recipient_type_check;

-- Add new recipient_type constraint with updated values
ALTER TABLE promotional_emails
  ADD CONSTRAINT promotional_emails_recipient_type_check
  CHECK (recipient_type IN ('all', 'past_attendees', 'interests', 'location', 'event_ticket_holders', 'ticket_type', 'vip_holders', 'all_customers'));

-- Add missing columns if they don't exist
ALTER TABLE promotional_emails
  ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL;

ALTER TABLE promotional_emails
  ADD COLUMN IF NOT EXISTS recipients_count INTEGER DEFAULT 0;

ALTER TABLE promotional_emails
  ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;

ALTER TABLE promotional_emails
  ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;

ALTER TABLE promotional_emails
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Create index for ticket_type_id
CREATE INDEX IF NOT EXISTS idx_promotional_emails_ticket_type
  ON promotional_emails(ticket_type_id) WHERE ticket_type_id IS NOT NULL;

-- Comment on new columns
COMMENT ON COLUMN promotional_emails.ticket_type_id IS 'Optional ticket type filter for targeted campaigns';
COMMENT ON COLUMN promotional_emails.recipients_count IS 'Total number of recipients for this campaign';
COMMENT ON COLUMN promotional_emails.sent_count IS 'Number of successfully sent emails';
COMMENT ON COLUMN promotional_emails.failed_count IS 'Number of failed email sends';
COMMENT ON COLUMN promotional_emails.sent_at IS 'Timestamp when the campaign was sent';
