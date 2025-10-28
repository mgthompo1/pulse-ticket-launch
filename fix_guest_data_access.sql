-- Fix the can_access_guest_data function to allow organization members and admins
-- to access attendee/guest data for their organization's events

CREATE OR REPLACE FUNCTION public.can_access_guest_data(p_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow platform admin access
  IF is_authenticated_admin() THEN
    RETURN TRUE;
  END IF;

  -- Allow event organizers (organization owners) to access their own event data
  IF EXISTS (
    SELECT 1
    FROM events e
    JOIN organizations o ON e.organization_id = o.id
    WHERE e.id = p_event_id
    AND o.user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Allow organization members to access their organization's event data
  RETURN EXISTS (
    SELECT 1
    FROM events e
    JOIN organization_users ou ON e.organization_id = ou.organization_id
    WHERE e.id = p_event_id
    AND ou.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
