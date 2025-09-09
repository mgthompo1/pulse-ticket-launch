-- Add RPC function to delete user credentials
CREATE OR REPLACE FUNCTION public.webauthn_delete_credential(p_credential_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete the credential (RLS policy ensures user can only delete their own)
  DELETE FROM webauthn.user_credentials 
  WHERE id = p_credential_id 
  AND user_id = auth.uid();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return true if a row was deleted, false otherwise
  RETURN deleted_count > 0;
END;
$$;

SELECT 'webauthn_delete_credential function created' as status;