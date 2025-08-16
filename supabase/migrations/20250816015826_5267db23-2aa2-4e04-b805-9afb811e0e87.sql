-- Add ticket delivery method column to events table
ALTER TABLE public.events 
ADD COLUMN ticket_delivery_method TEXT DEFAULT 'qr_ticket' CHECK (ticket_delivery_method IN ('qr_ticket', 'confirmation_email'));

-- Create RPC function to create tickets in bulk (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_tickets_bulk(tickets_data JSONB)
RETURNS SETOF public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.tickets (
    order_item_id,
    ticket_code,
    status,
    checked_in
  )
  SELECT 
    (value->>'order_item_id')::UUID,
    value->>'ticket_code',
    value->>'status',
    COALESCE((value->>'checked_in')::BOOLEAN, false)
  FROM jsonb_array_elements(tickets_data)
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_tickets_bulk(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tickets_bulk(JSONB) TO anon;