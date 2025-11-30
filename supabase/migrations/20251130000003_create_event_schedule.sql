-- Create event_schedule table for event runsheets
CREATE TABLE IF NOT EXISTS public.event_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT,
  speaker TEXT,
  category TEXT DEFAULT 'general',
  is_break BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_visible_to_attendees BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_event_schedule_event_id ON public.event_schedule(event_id);
CREATE INDEX IF NOT EXISTS idx_event_schedule_start_time ON public.event_schedule(start_time);
CREATE INDEX IF NOT EXISTS idx_event_schedule_sort_order ON public.event_schedule(sort_order);

-- Enable RLS
ALTER TABLE public.event_schedule ENABLE ROW LEVEL SECURITY;

-- Policy for event organizers to manage schedule
CREATE POLICY "Event organizers can manage schedule" ON public.event_schedule
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizations o ON e.organization_id = o.id
      WHERE e.id = event_schedule.event_id
      AND o.user_id = auth.uid()
    )
  );

-- Policy for public viewing of visible schedule items
CREATE POLICY "Public can view visible schedule items" ON public.event_schedule
  FOR SELECT USING (is_visible_to_attendees = true);

-- Grant permissions
GRANT ALL ON public.event_schedule TO authenticated;
GRANT SELECT ON public.event_schedule TO anon;
