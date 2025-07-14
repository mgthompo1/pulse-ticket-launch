-- Create merchandise table
CREATE TABLE public.merchandise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0,
  category TEXT DEFAULT 'apparel',
  size_options TEXT[], -- Array of available sizes (S, M, L, XL, etc.)
  color_options TEXT[], -- Array of available colors
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchandise ENABLE ROW LEVEL SECURITY;

-- Create policies for merchandise
CREATE POLICY "Merchandise is publicly viewable for published events" ON public.merchandise
  FOR SELECT
  USING (event_id IN (
    SELECT id FROM public.events WHERE status = 'published'
  ));

CREATE POLICY "Event organizers can manage merchandise" ON public.merchandise
  FOR ALL
  USING (event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.organizations o ON e.organization_id = o.id
    WHERE o.user_id = auth.uid()
  ));

-- Update order_items table to support merchandise
ALTER TABLE public.order_items 
ADD COLUMN merchandise_id UUID REFERENCES public.merchandise(id),
ADD COLUMN item_type TEXT DEFAULT 'ticket' CHECK (item_type IN ('ticket', 'merchandise')),
ADD COLUMN merchandise_options JSONB; -- Store size, color, etc.

-- Make ticket_type_id nullable since we might have merchandise items
ALTER TABLE public.order_items 
ALTER COLUMN ticket_type_id DROP NOT NULL;

-- Add constraint to ensure either ticket_type_id or merchandise_id is set
ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_type_check 
CHECK (
  (item_type = 'ticket' AND ticket_type_id IS NOT NULL AND merchandise_id IS NULL) OR
  (item_type = 'merchandise' AND merchandise_id IS NOT NULL AND ticket_type_id IS NULL)
);

-- Create updated_at trigger for merchandise
CREATE TRIGGER update_merchandise_updated_at
  BEFORE UPDATE ON public.merchandise
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();