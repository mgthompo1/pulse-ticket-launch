-- Fix ticket_types RLS to allow organization members (admins/editors) to manage ticket types
-- Currently only organization owners can create/update ticket types

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage ticket types for their events" ON public.ticket_types;

-- Create new policy that includes both owners AND organization members (admin/editor roles)
CREATE POLICY "Users can manage ticket types for their events"
ON public.ticket_types FOR ALL
USING (
  event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.organizations o ON e.organization_id = o.id
    WHERE o.user_id = auth.uid()

    UNION

    SELECT e.id FROM public.events e
    JOIN public.organization_users ou ON e.organization_id = ou.organization_id
    WHERE ou.user_id = auth.uid()
    AND ou.role IN ('admin', 'editor')
  )
);

-- Also fix events policy if it has the same issue
DROP POLICY IF EXISTS "Users can update their organization's events" ON public.events;

CREATE POLICY "Users can update their organization's events"
ON public.events FOR UPDATE
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()

    UNION

    SELECT organization_id FROM public.organization_users
    WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
  )
);

-- Fix events INSERT policy for org members
DROP POLICY IF EXISTS "Users can insert events for their organizations" ON public.events;

CREATE POLICY "Users can insert events for their organizations"
ON public.events FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()

    UNION

    SELECT organization_id FROM public.organization_users
    WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
  )
);

COMMENT ON POLICY "Users can manage ticket types for their events" ON public.ticket_types IS
'Allows organization owners and members with admin/editor roles to manage ticket types';
