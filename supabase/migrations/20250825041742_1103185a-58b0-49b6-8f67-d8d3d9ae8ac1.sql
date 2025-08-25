-- Remove the policy that's causing infinite recursion
DROP POLICY IF EXISTS "Allow reading organization info for valid invitations" ON public.organizations;

-- The existing policies are sufficient for most use cases
-- Users can access their own organizations, and the invitation flow 
-- should work with the existing "Allow reading organization info for valid invitations" policy