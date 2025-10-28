-- Add attendee information fields to tickets table
-- This allows each ticket to have its own attendee details when multiple tickets are purchased

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS attendee_name TEXT,
ADD COLUMN IF NOT EXISTS attendee_email TEXT,
ADD COLUMN IF NOT EXISTS attendee_phone TEXT;

-- Create an index on attendee_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_attendee_email ON public.tickets(attendee_email);

-- Add a comment explaining the schema change
COMMENT ON COLUMN public.tickets.attendee_name IS 'Name of the person who will use this ticket (may differ from order buyer)';
COMMENT ON COLUMN public.tickets.attendee_email IS 'Email of the person who will use this ticket';
COMMENT ON COLUMN public.tickets.attendee_phone IS 'Phone number of the person who will use this ticket';
