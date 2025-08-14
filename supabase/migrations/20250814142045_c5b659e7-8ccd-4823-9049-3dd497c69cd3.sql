-- Fix security warnings from linter

-- Fix the function search path issue for verify_ticket_code function
-- The function already has SET search_path = public which should be sufficient
-- Let's ensure all our functions have immutable search paths

-- Update the verify_ticket_code function to be more secure
CREATE OR REPLACE FUNCTION public.verify_ticket_code(
  p_ticket_code TEXT,
  p_event_id UUID
)
RETURNS TABLE(
  ticket_id UUID,
  is_valid BOOLEAN,
  is_used BOOLEAN,
  customer_name TEXT,
  ticket_type TEXT,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket_record RECORD;
  v_event_owner_id UUID;
BEGIN
  -- First verify that the requesting user owns the event
  SELECT org.user_id INTO v_event_owner_id
  FROM public.events e
  JOIN public.organizations org ON e.organization_id = org.id
  WHERE e.id = p_event_id;
  
  IF v_event_owner_id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      FALSE, 
      FALSE, 
      NULL::TEXT, 
      NULL::TEXT, 
      'Event not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_event_owner_id != auth.uid() THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      FALSE, 
      FALSE, 
      NULL::TEXT, 
      NULL::TEXT, 
      'Unauthorized access'::TEXT;
    RETURN;
  END IF;
  
  -- Look up the ticket
  SELECT 
    t.id,
    t.status,
    t.used_at,
    o.customer_name,
    tt.name as ticket_type_name
  INTO v_ticket_record
  FROM public.tickets t
  JOIN public.order_items oi ON t.order_item_id = oi.id
  JOIN public.orders o ON oi.order_id = o.id
  LEFT JOIN public.ticket_types tt ON oi.ticket_type_id = tt.id
  WHERE t.ticket_code = p_ticket_code
    AND o.event_id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      FALSE, 
      FALSE, 
      NULL::TEXT, 
      NULL::TEXT, 
      'Invalid ticket code'::TEXT;
    RETURN;
  END IF;
  
  -- Return ticket information
  RETURN QUERY SELECT 
    v_ticket_record.id,
    TRUE,
    (v_ticket_record.used_at IS NOT NULL),
    v_ticket_record.customer_name,
    v_ticket_record.ticket_type_name,
    NULL::TEXT;
END;
$$;