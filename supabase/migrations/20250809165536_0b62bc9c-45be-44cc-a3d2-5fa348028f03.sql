-- Enable RLS (safe if already enabled)
ALTER TABLE public.seat_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;

-- Allow public (anonymous) SELECT access to seat maps for published events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'seat_maps' AND policyname = 'Seat maps are publicly viewable for published events'
  ) THEN
    CREATE POLICY "Seat maps are publicly viewable for published events"
    ON public.seat_maps
    FOR SELECT
    USING (
      event_id IN (
        SELECT id FROM public.events WHERE status = 'published'
      )
    );
  END IF;
END$$;

-- Allow public (anonymous) SELECT access to seats for seat maps of published events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'seats' AND policyname = 'Seats are publicly viewable for published events'
  ) THEN
    CREATE POLICY "Seats are publicly viewable for published events"
    ON public.seats
    FOR SELECT
    USING (
      seat_map_id IN (
        SELECT sm.id
        FROM public.seat_maps sm
        JOIN public.events e ON e.id = sm.event_id
        WHERE e.status = 'published'
      )
    );
  END IF;
END$$;