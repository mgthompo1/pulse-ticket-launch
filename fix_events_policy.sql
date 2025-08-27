-- Fix RLS policy to allow organization members to update events
-- This will allow Emma (editor role) to update event customizations

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can update their organization's events" ON public.events;

-- Create new policy that allows both owners and members
CREATE POLICY "Organization members can update their organization's events" 
ON public.events FOR UPDATE 
USING (
  organization_id IN (
    SELECT o.id FROM public.organizations o 
    WHERE o.user_id = auth.uid()  -- Organization owner
    UNION
    SELECT ou.organization_id FROM public.organization_users ou 
    WHERE ou.user_id = auth.uid()  -- Organization members
  )
);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events' AND policyname LIKE '%update%';
