-- Add seat assignment tracking to tickets table
-- This allows tickets to be linked to specific seats when assigned seating is used

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS seat_id UUID REFERENCES public.seats(id) ON DELETE SET NULL;

-- Create index for faster seat lookups
CREATE INDEX IF NOT EXISTS idx_tickets_seat_id ON public.tickets(seat_id);

-- Add comment explaining the field
COMMENT ON COLUMN public.tickets.seat_id IS 'Reference to the assigned seat for this ticket (NULL for general admission)';
