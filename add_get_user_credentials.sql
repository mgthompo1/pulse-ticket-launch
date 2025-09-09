-- Add RPC function to get user credentials for display
CREATE OR REPLACE FUNCTION public.webauthn_get_user_credentials(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  credential_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_used TIMESTAMP WITH TIME ZONE,
  credential_device_type TEXT
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT c.id, c.credential_name, c.created_at, c.last_used, c.credential_device_type
  FROM webauthn.user_credentials c
  WHERE c.user_id = p_user_id
  ORDER BY c.created_at DESC;
$$;

SELECT 'webauthn_get_user_credentials function created' as status;