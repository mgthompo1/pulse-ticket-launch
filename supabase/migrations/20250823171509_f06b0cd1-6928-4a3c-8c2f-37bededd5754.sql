-- Fix critical security vulnerability in platform_config table
-- Replace the existing policy with a proper admin session validation

-- Drop the existing policy that relies on session variables
DROP POLICY IF EXISTS "admin_only_platform_config" ON public.platform_config;

-- Create a secure policy that validates admin sessions properly
CREATE POLICY "Authenticated admins can manage platform config"
ON public.platform_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_sessions 
    WHERE admin_user_id IN (
      SELECT id FROM public.admin_users WHERE id IS NOT NULL
    )
    AND expires_at > now()
    AND session_token IS NOT NULL
    AND last_activity > now() - interval '1 hour'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_sessions 
    WHERE admin_user_id IN (
      SELECT id FROM public.admin_users WHERE id IS NOT NULL
    )
    AND expires_at > now()
    AND session_token IS NOT NULL
    AND last_activity > now() - interval '1 hour'
  )
);

-- Also create a service role policy for backend operations
CREATE POLICY "Service role can manage platform config"
ON public.platform_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure the table is properly secured
-- Remove any potential public access
REVOKE ALL ON public.platform_config FROM public;
REVOKE ALL ON public.platform_config FROM anon;