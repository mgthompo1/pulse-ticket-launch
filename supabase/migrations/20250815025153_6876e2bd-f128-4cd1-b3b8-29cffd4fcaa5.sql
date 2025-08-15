-- Create proper admin session management and fix weak RLS policies

-- Create admin sessions table for secure session tracking
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on admin sessions
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create secure admin session policy - only service role can manage
CREATE POLICY "Service role can manage admin sessions" 
ON admin_sessions 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Drop the insecure admin_users policies that rely on audit logs
DROP POLICY IF EXISTS "Admins can view their own data" ON admin_users;
DROP POLICY IF EXISTS "System can create admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can update their own data" ON admin_users;

-- Create new secure admin_users policies
-- Only service role can create admin users (through backend functions)
CREATE POLICY "Service role can create admin users" 
ON admin_users 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Only service role can read admin users (for authentication)
CREATE POLICY "Service role can read admin users" 
ON admin_users 
FOR SELECT 
TO service_role
USING (true);

-- Only service role can update admin users (for last login, etc.)
CREATE POLICY "Service role can update admin users" 
ON admin_users 
FOR UPDATE 
TO service_role
USING (true);

-- Completely block delete operations on admin users
-- (Should be done through soft deletion or deactivation)

-- Create function to validate admin session token
CREATE OR REPLACE FUNCTION public.validate_admin_session(token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Check if session exists and is not expired
  SELECT admin_user_id INTO admin_id
  FROM admin_sessions
  WHERE session_token = token
  AND expires_at > now()
  AND created_at > now() - interval '24 hours'; -- Additional safety check
  
  IF admin_id IS NOT NULL THEN
    -- Update last activity
    UPDATE admin_sessions 
    SET last_activity = now()
    WHERE session_token = token;
  END IF;
  
  RETURN admin_id;
END;
$$;

-- Create function to create admin session
CREATE OR REPLACE FUNCTION public.create_admin_session(p_admin_id UUID, p_token TEXT, p_ip INET DEFAULT NULL, p_user_agent TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Clean up expired sessions first
  DELETE FROM admin_sessions 
  WHERE expires_at < now() OR created_at < now() - interval '24 hours';
  
  -- Create new session
  INSERT INTO admin_sessions (admin_user_id, session_token, expires_at, ip_address, user_agent)
  VALUES (p_admin_id, p_token, now() + interval '24 hours', p_ip, p_user_agent)
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

-- Create function to invalidate admin session
CREATE OR REPLACE FUNCTION public.invalidate_admin_session(token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM admin_sessions WHERE session_token = token;
  RETURN FOUND;
END;
$$;

-- Revoke all access from public and authenticated users
REVOKE ALL ON admin_users FROM public;
REVOKE ALL ON admin_users FROM authenticated;
REVOKE ALL ON admin_users FROM anon;
REVOKE ALL ON admin_sessions FROM public;
REVOKE ALL ON admin_sessions FROM authenticated;
REVOKE ALL ON admin_sessions FROM anon;

-- Grant access only to service role
GRANT ALL ON admin_users TO service_role;
GRANT ALL ON admin_sessions TO service_role;