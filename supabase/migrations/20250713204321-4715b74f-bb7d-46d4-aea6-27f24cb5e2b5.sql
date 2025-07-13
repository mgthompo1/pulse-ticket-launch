-- Create concession items table
CREATE TABLE public.concession_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT DEFAULT 'food',
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create check-ins table to track guest arrivals
CREATE TABLE public.check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_in_by UUID, -- staff member who checked them in
  notes TEXT,
  lanyard_printed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create POS transactions table
CREATE TABLE public.pos_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'stripe_terminal',
  stripe_payment_intent_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  created_by UUID, -- staff member
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.concession_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

-- Create security definer functions for RLS policies
CREATE OR REPLACE FUNCTION public.user_can_access_event(event_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e
    JOIN organizations o ON e.organization_id = o.id
    WHERE e.id = event_id AND o.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_ticket(ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tickets t
    JOIN order_items oi ON t.order_item_id = oi.id
    JOIN orders ord ON oi.order_id = ord.id
    JOIN events e ON ord.event_id = e.id
    JOIN organizations org ON e.organization_id = org.id
    WHERE t.id = ticket_id AND org.user_id = auth.uid()
  );
$$;

-- RLS Policies for concession_items
CREATE POLICY "Event organizers can manage concession items" ON public.concession_items
FOR ALL
USING (public.user_can_access_event(event_id));

-- RLS Policies for check_ins
CREATE POLICY "Event organizers can manage check-ins" ON public.check_ins
FOR ALL
USING (public.user_can_access_ticket(ticket_id));

-- RLS Policies for pos_transactions
CREATE POLICY "Event organizers can manage POS transactions" ON public.pos_transactions
FOR ALL
USING (public.user_can_access_event(event_id));

-- Add indexes for better performance
CREATE INDEX idx_concession_items_event_id ON public.concession_items(event_id);
CREATE INDEX idx_check_ins_ticket_id ON public.check_ins(ticket_id);
CREATE INDEX idx_pos_transactions_event_id ON public.pos_transactions(event_id);

-- Add update triggers
CREATE TRIGGER update_concession_items_updated_at
  BEFORE UPDATE ON public.concession_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add a column to track check-in status more efficiently
ALTER TABLE public.tickets ADD COLUMN checked_in BOOLEAN DEFAULT false;

-- Create view for guest status with all relevant information
CREATE VIEW public.guest_status_view AS
SELECT 
  t.id as ticket_id,
  t.ticket_code,
  t.status as ticket_status,
  t.checked_in,
  oi.quantity,
  tt.name as ticket_type,
  tt.price,
  o.customer_name,
  o.customer_email,
  o.customer_phone,
  o.created_at as order_date,
  ci.checked_in_at,
  ci.checked_in_by,
  ci.lanyard_printed,
  ci.notes as check_in_notes,
  e.name as event_name,
  e.id as event_id
FROM tickets t
JOIN order_items oi ON t.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id
JOIN ticket_types tt ON oi.ticket_type_id = tt.id
JOIN events e ON o.event_id = e.id
LEFT JOIN check_ins ci ON t.id = ci.ticket_id;