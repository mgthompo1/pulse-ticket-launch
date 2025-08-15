-- Fix critical admin security vulnerabilities by implementing proper RLS policies

-- Drop existing overly permissive admin_users policies
DROP POLICY IF EXISTS "System can manage admin users" ON admin_users;

-- Create secure admin_users policies
CREATE POLICY "Admins can view their own data" 
ON admin_users 
FOR SELECT 
USING (id IN (
  SELECT admin_user_id 
  FROM security_audit_log 
  WHERE event_type = 'admin_login' 
  AND user_agent = current_setting('request.headers', true)::json->>'user-agent'
  AND created_at > now() - interval '24 hours'
));

CREATE POLICY "System can create admin users" 
ON admin_users 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update their own data" 
ON admin_users 
FOR UPDATE 
USING (id IN (
  SELECT admin_user_id 
  FROM security_audit_log 
  WHERE event_type = 'admin_login' 
  AND user_agent = current_setting('request.headers', true)::json->>'user-agent'
  AND created_at > now() - interval '24 hours'
));

-- Drop existing overly permissive admin_invitations policies
DROP POLICY IF EXISTS "Allow all inserts" ON admin_invitations;

-- Create secure admin_invitations policies - only system can manage invitations
CREATE POLICY "System can manage admin invitations" 
ON admin_invitations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Revoke public access to admin tables
REVOKE ALL ON admin_users FROM public;
REVOKE ALL ON admin_invitations FROM public;

-- Grant necessary permissions to service role only
GRANT ALL ON admin_users TO service_role;
GRANT ALL ON admin_invitations TO service_role;

-- Create function to check if current request is from an authenticated admin
CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM security_audit_log 
    WHERE event_type = 'admin_login' 
    AND user_agent = current_setting('request.headers', true)::json->>'user-agent'
    AND created_at > now() - interval '24 hours'
  );
$$;