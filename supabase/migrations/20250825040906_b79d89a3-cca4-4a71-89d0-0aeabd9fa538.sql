-- Create RLS policy to allow reading pending invitations by token
-- This allows unauthenticated users to view invitation details before signing in
CREATE POLICY "Allow reading pending invitations by token" 
ON public.organization_invitations 
FOR SELECT 
USING (
  status = 'pending' 
  AND expires_at > now()
  AND invitation_token IS NOT NULL
);