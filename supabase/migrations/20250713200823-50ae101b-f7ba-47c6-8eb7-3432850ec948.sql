-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  brand_colors JSONB DEFAULT '{"primary": "#000000", "secondary": "#ffffff"}',
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  venue TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 100,
  featured_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  requires_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_types table
CREATE TABLE public.ticket_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity_available INTEGER NOT NULL,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  sale_start_date TIMESTAMP WITH TIME ZONE,
  sale_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tickets table (individual tickets)
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  ticket_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled')),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organizations" 
ON public.organizations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own organizations" 
ON public.organizations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organizations" 
ON public.organizations FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for events
CREATE POLICY "Users can view their organization's events" 
ON public.events FOR SELECT 
USING (organization_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can create events for their organizations" 
ON public.events FOR INSERT 
WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their organization's events" 
ON public.events FOR UPDATE 
USING (organization_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()));

CREATE POLICY "Published events are publicly viewable" 
ON public.events FOR SELECT 
USING (status = 'published');

-- RLS Policies for ticket_types
CREATE POLICY "Users can manage ticket types for their events" 
ON public.ticket_types FOR ALL 
USING (event_id IN (
  SELECT e.id FROM public.events e 
  JOIN public.organizations o ON e.organization_id = o.id 
  WHERE o.user_id = auth.uid()
));

CREATE POLICY "Ticket types are publicly viewable for published events" 
ON public.ticket_types FOR SELECT 
USING (event_id IN (SELECT id FROM public.events WHERE status = 'published'));

-- RLS Policies for orders
CREATE POLICY "Users can view orders for their events" 
ON public.orders FOR SELECT 
USING (event_id IN (
  SELECT e.id FROM public.events e 
  JOIN public.organizations o ON e.organization_id = o.id 
  WHERE o.user_id = auth.uid()
));

CREATE POLICY "Orders can be created by anyone" 
ON public.orders FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Orders can be updated by event organizers" 
ON public.orders FOR UPDATE 
USING (event_id IN (
  SELECT e.id FROM public.events e 
  JOIN public.organizations o ON e.organization_id = o.id 
  WHERE o.user_id = auth.uid()
));

-- RLS Policies for order_items
CREATE POLICY "Order items follow order policies" 
ON public.order_items FOR ALL 
USING (order_id IN (
  SELECT o.id FROM public.orders o 
  JOIN public.events e ON o.event_id = e.id 
  JOIN public.organizations org ON e.organization_id = org.id 
  WHERE org.user_id = auth.uid()
));

CREATE POLICY "Order items can be created by anyone" 
ON public.order_items FOR INSERT 
WITH CHECK (true);

-- RLS Policies for tickets
CREATE POLICY "Tickets follow order item policies" 
ON public.tickets FOR ALL 
USING (order_item_id IN (
  SELECT oi.id FROM public.order_items oi 
  JOIN public.orders o ON oi.order_id = o.id 
  JOIN public.events e ON o.event_id = e.id 
  JOIN public.organizations org ON e.organization_id = org.id 
  WHERE org.user_id = auth.uid()
));

CREATE POLICY "Tickets can be created by anyone" 
ON public.tickets FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_types_updated_at
  BEFORE UPDATE ON public.ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate ticket codes
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TKT-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$ LANGUAGE plpgsql;