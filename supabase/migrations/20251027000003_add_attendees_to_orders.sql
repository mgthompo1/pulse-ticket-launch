-- Add attendees field to orders table to store individual attendee information
-- for multi-ticket purchases

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT NULL;

-- Add a comment explaining the schema
COMMENT ON COLUMN public.orders.attendees IS 'Array of attendee information for multi-ticket purchases. Format: [{"attendee_name": "John Doe", "attendee_email": "john@example.com"}]';

-- Create an index for better query performance when searching by attendee email
CREATE INDEX IF NOT EXISTS idx_orders_attendees_gin ON public.orders USING GIN (attendees);
