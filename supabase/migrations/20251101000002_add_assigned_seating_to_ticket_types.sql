-- Add use_assigned_seating field to ticket_types to link ticket types to seat maps
ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS use_assigned_seating BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ticket_types.use_assigned_seating IS
'When true, this ticket type requires seat selection from the event seat map';

-- Index for filtering ticket types by assigned seating
CREATE INDEX IF NOT EXISTS idx_ticket_types_assigned_seating
ON public.ticket_types(use_assigned_seating)
WHERE use_assigned_seating = true;
