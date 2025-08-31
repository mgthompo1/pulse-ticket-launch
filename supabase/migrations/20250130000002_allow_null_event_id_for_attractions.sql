-- Allow null event_id in orders table for attraction bookings
ALTER TABLE public.orders ALTER COLUMN event_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.orders.event_id IS 'Event ID for event orders, NULL for attraction bookings';
