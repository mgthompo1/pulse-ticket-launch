-- Create seat_maps table to store venue layouts
CREATE TABLE public.seat_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Layout',
  layout_data JSONB NOT NULL DEFAULT '{}',
  total_seats INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.seat_maps ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage seat maps for their events
CREATE POLICY "Users can manage seat maps for their events" 
ON public.seat_maps 
FOR ALL 
USING (
  event_id IN (
    SELECT e.id FROM events e 
    JOIN organizations o ON e.organization_id = o.id 
    WHERE o.user_id = auth.uid()
  )
);

-- Create seats table to store individual seat data
CREATE TABLE public.seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_map_id UUID NOT NULL REFERENCES public.seat_maps(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  row_label TEXT NOT NULL,
  section TEXT,
  x_position INTEGER NOT NULL,
  y_position INTEGER NOT NULL,
  seat_type TEXT NOT NULL DEFAULT 'standard',
  price_override DECIMAL(10,2),
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage seats for their events
CREATE POLICY "Users can manage seats for their events" 
ON public.seats 
FOR ALL 
USING (
  seat_map_id IN (
    SELECT sm.id FROM seat_maps sm 
    JOIN events e ON sm.event_id = e.id 
    JOIN organizations o ON e.organization_id = o.id 
    WHERE o.user_id = auth.uid()
  )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seat_maps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seat_maps_updated_at
    BEFORE UPDATE ON public.seat_maps
    FOR EACH ROW
    EXECUTE FUNCTION update_seat_maps_updated_at();