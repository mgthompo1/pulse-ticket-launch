-- SECURITY FIX: Implement proper RLS policies for tickets table to prevent unauthorized access to ticket codes

-- First, drop the existing overly permissive policies
DROP POLICY IF EXISTS "Service can manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "System can create tickets" ON public.tickets;  
DROP POLICY IF EXISTS "Tickets can be created by anyone" ON public.tickets;

-- Create secure RLS policies for tickets

-- 1. Allow system/service to create tickets during order processing
CREATE POLICY "System can create tickets"
ON public.tickets
FOR INSERT
WITH CHECK (true);

-- 2. Allow event organizers to view and manage tickets for their events
CREATE POLICY "Event organizers can manage their event tickets"
ON public.tickets
FOR ALL
USING (
  order_item_id IN (
    SELECT oi.id 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN events e ON o.event_id = e.id
    JOIN organizations org ON e.organization_id = org.id
    WHERE org.user_id = auth.uid()
  )
)
WITH CHECK (
  order_item_id IN (
    SELECT oi.id 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN events e ON o.event_id = e.id
    JOIN organizations org ON e.organization_id = org.id
    WHERE org.user_id = auth.uid()
  )
);

-- 3. Allow system functions to update ticket status during operations
CREATE POLICY "System can update ticket status"
ON public.tickets
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 4. Allow reading tickets only for specific check-in operations by event organizers
-- This policy is more restrictive than the management policy above
CREATE POLICY "Event staff can read tickets for check-in"
ON public.tickets
FOR SELECT
USING (
  order_item_id IN (
    SELECT oi.id 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN events e ON o.event_id = e.id
    JOIN organizations org ON e.organization_id = org.id
    WHERE org.user_id = auth.uid()
  )
);

-- Add function to safely verify ticket codes without exposing all ticket data
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
SET search_path = public
AS $$
DECLARE
  v_ticket_record RECORD;
  v_event_owner_id UUID;
BEGIN
  -- First verify that the requesting user owns the event
  SELECT org.user_id INTO v_event_owner_id
  FROM events e
  JOIN organizations org ON e.organization_id = org.id
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
  FROM tickets t
  JOIN order_items oi ON t.order_item_id = oi.id
  JOIN orders o ON oi.order_id = o.id
  LEFT JOIN ticket_types tt ON oi.ticket_type_id = tt.id
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