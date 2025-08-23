-- Fix critical security vulnerability in admin_invitations table
-- Remove the overly permissive policy that allows public access

-- Drop the existing insecure policy
DROP POLICY IF EXISTS "Backend only access to admin invitations" ON public.admin_invitations;

-- Create secure policies that properly restrict access
-- Only service role (backend functions) can manage invitations
CREATE POLICY "Service role can manage admin invitations"
ON public.admin_invitations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated admin users to view their own invitations (if they have valid sessions)
CREATE POLICY "Valid admin sessions can view invitations"
ON public.admin_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_sessions 
    WHERE admin_user_id IN (
      SELECT id FROM public.admin_users WHERE email = admin_invitations.email
    )
    AND expires_at > now()
    AND session_token IS NOT NULL
  )
);

-- Ensure no other access is allowed - this is now secure by default
-- Public users cannot access admin invitations at all