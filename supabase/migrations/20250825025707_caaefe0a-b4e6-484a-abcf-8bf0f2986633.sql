-- Fix the organization_invitations policies that are trying to access auth.users
-- Drop the problematic policy that tries to access auth.users
DROP POLICY IF EXISTS "Invited users can view their invitations" ON organization_invitations;

-- Create a function to get the current user's email without accessing auth.users directly
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(auth.email(), '');
$$;

-- Create a new policy that uses the security definer function
CREATE POLICY "Invited users can view their invitations v2"
ON organization_invitations
FOR SELECT
TO authenticated
USING (
  email = get_current_user_email()
);

-- Also ensure we have a policy for accepting invitations
CREATE POLICY "Users can update invitations sent to their email"
ON organization_invitations
FOR UPDATE
TO authenticated
USING (
  email = get_current_user_email()
)
WITH CHECK (
  email = get_current_user_email()
);