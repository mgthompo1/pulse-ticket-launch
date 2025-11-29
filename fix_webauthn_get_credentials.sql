-- Fix the webauthn_get_user_credentials function to return credential_id and transports
-- Required for authentication to work properly

CREATE OR REPLACE FUNCTION public.webauthn_get_user_credentials(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  credential_id TEXT,
  credential_name TEXT,
  credential_transports TEXT[],
  credential_device_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_used TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT
    c.id,
    c.credential_id,
    c.credential_name,
    c.credential_transports,
    c.credential_device_type,
    c.created_at,
    c.last_used
  FROM webauthn.user_credentials c
  WHERE c.user_id = p_user_id
  ORDER BY c.created_at DESC;
$$;

SELECT 'webauthn_get_user_credentials function updated with credential_id and transports' as status;
