-- Add optional event_end_date to support multi-day events

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMPTZ;

DO $$
BEGIN
  ALTER TABLE public.events
    ADD CONSTRAINT events_event_end_after_start
    CHECK (event_end_date IS NULL OR event_end_date >= event_date);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;


