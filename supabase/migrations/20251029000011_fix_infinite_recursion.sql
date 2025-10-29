-- Fix infinite recursion in organization policies
-- Use a SECURITY DEFINER function to break the circular reference

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view organizations where owner or member" ON public.organizations;
DROP POLICY IF EXISTS "Users can update organizations where owner or member" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_users ou
    WHERE ou.organization_id = org_id
    AND ou.user_id = user_id
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_is_org_member(UUID, UUID) TO authenticated;

-- Now create policies using the function (no recursion!)
CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  public.user_is_org_member(id, auth.uid())
);

CREATE POLICY "Users can update their organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  public.user_is_org_member(id, auth.uid())
);

CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

COMMENT ON FUNCTION public.user_is_org_member IS
'Helper function to check organization membership without triggering RLS recursion';

COMMENT ON POLICY "Users can view their organizations" ON public.organizations IS
'Allows users to view organizations they own or are members of (no recursion)';

COMMENT ON POLICY "Users can update their organizations" ON public.organizations IS
'Allows owners and members to update organization settings (no recursion)';
