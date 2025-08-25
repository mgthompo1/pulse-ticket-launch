-- Allow reading basic organization info for valid invitations
-- This allows unauthenticated users to see organization name when viewing invitations
CREATE POLICY "Allow reading organization info for valid invitations" 
ON public.organizations 
FOR SELECT 
USING (
  id IN (
    SELECT organization_id 
    FROM organization_invitations 
    WHERE status = 'pending' 
    AND expires_at > now()
    AND invitation_token IS NOT NULL
  )
);