-- Allow organization members (not just owners) to update organization settings including logo
-- This fixes the "Unauthorized" error when admins try to upload logos

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Organization owners can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their organization" ON public.organizations;

-- Create new policy allowing any organization member to update the organization
CREATE POLICY "Organization members can update their organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id
    FROM public.organization_users
    WHERE user_id = (select auth.uid())
  )
);

-- Also ensure members can SELECT their organization details
DROP POLICY IF EXISTS "Organization members can view their organization" ON public.organizations;

CREATE POLICY "Organization members can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id
    FROM public.organization_users
    WHERE user_id = (select auth.uid())
  )
);

COMMENT ON POLICY "Organization members can update their organization" ON public.organizations IS
'Allows any organization member (owner or admin) to update organization settings including logo';

COMMENT ON POLICY "Organization members can view their organization" ON public.organizations IS
'Allows any organization member to view organization details';
