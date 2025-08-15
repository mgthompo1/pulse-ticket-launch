-- Fix admin_invitations table security by making it completely inaccessible to public
-- and only allowing service role access for invitation management

-- Drop the existing policy that may still allow public access
DROP POLICY IF EXISTS "System can manage admin invitations" ON admin_invitations;

-- Disable RLS temporarily to ensure we can modify policies
ALTER TABLE admin_invitations DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with no policies (this blocks all public access)
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Create a policy that only allows service role access (for backend functions)
-- This policy has no conditions for regular users, effectively blocking all public access
CREATE POLICY "Backend only access to admin invitations" 
ON admin_invitations 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure no public access is granted
REVOKE ALL ON admin_invitations FROM public;
REVOKE ALL ON admin_invitations FROM authenticated;
REVOKE ALL ON admin_invitations FROM anon;

-- Only service role should have access
GRANT ALL ON admin_invitations TO service_role;