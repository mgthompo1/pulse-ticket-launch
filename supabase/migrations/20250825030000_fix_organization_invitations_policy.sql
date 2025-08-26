-- Fix organization_invitations RLS policy to allow organization members to view invitations
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Organization owners can manage invitations v2" ON organization_invitations;

-- Create a new policy that allows organization members to see invitations
CREATE POLICY "Organization members can manage invitations"
ON organization_invitations
FOR ALL
TO authenticated
USING (
  -- Organization owners can see all invitations
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
  OR
  -- Organization members can see invitations for their org
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Organization owners can manage all invitations
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
  OR
  -- Organization members can only view invitations (not modify them)
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

-- Also ensure we have a policy for users to view invitations sent to their email
CREATE POLICY "Users can view invitations sent to their email"
ON organization_invitations
FOR SELECT
TO authenticated
USING (
  email = COALESCE(auth.email(), '')
);

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

