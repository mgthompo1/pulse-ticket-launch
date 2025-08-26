-- Fix organization invitation RLS policies
-- Run this in your Supabase SQL Editor

-- Allow unauthenticated users to view organization names when they have a valid invitation
CREATE POLICY "Invited users can view organization names"
ON organizations
FOR SELECT
TO anon
USING (
  id IN (
    SELECT organization_id 
    FROM organization_invitations 
    WHERE invitation_token IS NOT NULL 
    AND status = 'pending'
    AND expires_at > now()
  )
);

-- Allow unauthenticated users to view their pending invitations
CREATE POLICY "Unauthenticated users can view pending invitations"
ON organization_invitations
FOR SELECT
TO anon
USING (
  status = 'pending' 
  AND expires_at > now()
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('organizations', 'organization_invitations')
ORDER BY tablename, policyname;
