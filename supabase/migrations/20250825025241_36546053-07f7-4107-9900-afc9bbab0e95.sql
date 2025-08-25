-- Fix infinite recursion in organization_users RLS policies
-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Organization members can view other members" ON organization_users;

-- Create a security definer function to safely check organization membership
CREATE OR REPLACE FUNCTION public.user_is_org_member(p_user_id uuid, p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Check if user is organization owner
  SELECT EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = p_organization_id AND user_id = p_user_id
  )
  OR
  -- Check if user is a member (avoiding recursion by using direct table access)
  EXISTS (
    SELECT 1 FROM organization_users 
    WHERE organization_id = p_organization_id AND user_id = p_user_id
  );
$$;

-- Create new non-recursive policy for organization members
CREATE POLICY "Organization members can view other members v2"
ON organization_users
FOR SELECT
TO authenticated
USING (
  -- Organization owners can see all members
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
  OR
  -- Members can see other members (using security definer function)
  user_is_org_member(auth.uid(), organization_id)
);

-- Also ensure organization owners can still manage users
-- This policy should already exist but let's recreate it to be safe
DROP POLICY IF EXISTS "Organization owners can manage users" ON organization_users;
CREATE POLICY "Organization owners can manage users v2"
ON organization_users
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
);

-- Fix organization_invitations policies to ensure proper access
DROP POLICY IF EXISTS "Organization owners can manage invitations" ON organization_invitations;
CREATE POLICY "Organization owners can manage invitations v2"
ON organization_invitations
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
);