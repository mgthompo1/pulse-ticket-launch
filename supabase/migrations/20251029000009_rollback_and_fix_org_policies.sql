-- Rollback and fix organization policies properly
-- The previous migration broke login because it removed critical policies

-- First, drop the policies we just created
DROP POLICY IF EXISTS "Organization members can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Organization members can view their organization" ON public.organizations;

-- Check what existing policies are there and drop them
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON public.organizations;

-- Recreate proper policies that work with existing system

-- Allow users to SELECT organizations they are members of
CREATE POLICY "Users can view organizations they belong to"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_users ou
    WHERE ou.organization_id = organizations.id
    AND ou.user_id = auth.uid()
  )
);

-- Allow users to UPDATE organizations they are members of
CREATE POLICY "Users can update organizations they belong to"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_users ou
    WHERE ou.organization_id = organizations.id
    AND ou.user_id = auth.uid()
  )
);

-- Make sure INSERT is covered too
DROP POLICY IF EXISTS "Users can create their own organization" ON public.organizations;

CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

COMMENT ON POLICY "Users can view organizations they belong to" ON public.organizations IS
'Allows users to view organizations where they are members (via organization_users)';

COMMENT ON POLICY "Users can update organizations they belong to" ON public.organizations IS
'Allows organization members to update organization settings including logo';
