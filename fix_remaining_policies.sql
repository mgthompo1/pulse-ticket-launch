-- Fix remaining RLS policy issues for organization invitations
-- Run this in your Supabase SQL Editor

-- Drop and recreate the organization invitation policies with better logic
DROP POLICY IF EXISTS "Invited users can view organization names" ON organizations;
DROP POLICY IF EXISTS "Unauthenticated users can view pending invitations" ON organization_invitations;

-- Create a more permissive policy for organizations that allows viewing by invitation token
CREATE POLICY "Organizations viewable by invitation token"
ON organizations
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 
    FROM organization_invitations 
    WHERE organization_id = organizations.id
    AND invitation_token IS NOT NULL 
    AND status = 'pending'
    AND expires_at > now()
  )
);

-- Create a more permissive policy for organization_invitations
CREATE POLICY "Invitations viewable by token"
ON organization_invitations
FOR SELECT
TO anon
USING (
  invitation_token IS NOT NULL 
  AND status = 'pending'
  AND expires_at > now()
);

-- Also allow authenticated users to view organizations they're invited to
CREATE POLICY "Authenticated users can view invited organizations"
ON organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM organization_invitations 
    WHERE email = auth.email()
    AND status = 'pending'
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('organizations', 'organization_invitations')
ORDER BY tablename, policyname;
