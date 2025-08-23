-- CRITICAL SECURITY FIX: Secure the guest_status_view by ensuring all underlying tables have proper RLS
-- The view joins tickets, order_items, orders, ticket_types, events, and check_ins

-- The issue is that the guest_status_view exposes customer data through joins
-- We need to create a security definer function that properly restricts access

-- First, let's create a security definer function that can be used to check if a user can access guest data for an event
CREATE OR REPLACE FUNCTION public.can_access_guest_data(p_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow admin access
  IF is_authenticated_admin() THEN
    RETURN TRUE;
  END IF;
  
  -- Allow event organizers to access their own event data
  RETURN EXISTS (
    SELECT 1 
    FROM events e
    JOIN organizations o ON e.organization_id = o.id
    WHERE e.id = p_event_id 
    AND o.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;