-- CRITICAL SECURITY FIX: Replace the insecure guest_status_view with a secure function
-- The original view was publicly accessible, exposing customer data

-- Drop the existing insecure view
DROP VIEW IF EXISTS public.guest_status_view;

-- Create a secure function that returns guest status data with proper access control
CREATE OR REPLACE FUNCTION public.get_guest_status_for_event(p_event_id UUID)
RETURNS TABLE (
  ticket_id UUID,
  ticket_code TEXT,
  ticket_status TEXT,
  checked_in BOOLEAN,
  quantity INTEGER,
  ticket_type TEXT,
  price NUMERIC,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  order_date TIMESTAMP WITH TIME ZONE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID,
  lanyard_printed BOOLEAN,
  check_in_notes TEXT,
  event_name TEXT,
  event_id UUID
) AS $$
BEGIN
  -- Security check: Only allow access if user can access this event's guest data
  IF NOT can_access_guest_data(p_event_id) THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to view guest data for this event';
  END IF;
  
  -- Return the guest status data for the specified event
  RETURN QUERY
  SELECT 
    t.id AS ticket_id,
    t.ticket_code,
    t.status AS ticket_status,
    t.checked_in,
    oi.quantity,
    tt.name AS ticket_type,
    tt.price,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.created_at AS order_date,
    ci.checked_in_at,
    ci.checked_in_by,
    ci.lanyard_printed,
    ci.notes AS check_in_notes,
    e.name AS event_name,
    e.id AS event_id
  FROM tickets t
  JOIN order_items oi ON t.order_item_id = oi.id
  JOIN orders o ON oi.order_id = o.id
  JOIN ticket_types tt ON oi.ticket_type_id = tt.id
  JOIN events e ON o.event_id = e.id
  LEFT JOIN check_ins ci ON t.id = ci.ticket_id
  WHERE e.id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;