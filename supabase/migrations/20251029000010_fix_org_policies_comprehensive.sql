-- Comprehensive fix for organization policies
-- Supports BOTH ownership (user_id) AND membership (organization_users table)

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Users can update organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization members can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Organization members can view their organization" ON public.organizations;

-- SELECT policy: Allow users to see organizations where they are owner OR member
CREATE POLICY "Users can view organizations where owner or member"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  -- Either they own it directly
  user_id = auth.uid()
  OR
  -- Or they are a member via organization_users
  EXISTS (
    SELECT 1
    FROM public.organization_users ou
    WHERE ou.organization_id = organizations.id
    AND ou.user_id = auth.uid()
  )
);

-- UPDATE policy: Allow users to update organizations where they are owner OR member
CREATE POLICY "Users can update organizations where owner or member"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  -- Either they own it directly
  user_id = auth.uid()
  OR
  -- Or they are a member via organization_users
  EXISTS (
    SELECT 1
    FROM public.organization_users ou
    WHERE ou.organization_id = organizations.id
    AND ou.user_id = auth.uid()
  )
);

-- INSERT policy: Allow authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

COMMENT ON POLICY "Users can view organizations where owner or member" ON public.organizations IS
'Allows users to view organizations where they are the owner (user_id) OR a member (organization_users)';

COMMENT ON POLICY "Users can update organizations where owner or member" ON public.organizations IS
'Allows owners and members to update organization settings including logo';

COMMENT ON POLICY "Authenticated users can create organizations" ON public.organizations IS
'Allows any authenticated user to create a new organization';
