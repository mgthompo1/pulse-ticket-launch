-- Create RPC functions to access WebAuthn tables properly
-- This avoids the schema prefix issue with Supabase client

-- Function to get existing credentials for a user
CREATE OR REPLACE FUNCTION public.webauthn_get_existing_credentials(p_user_id UUID)
RETURNS TABLE(credential_id TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT uc.credential_id
  FROM webauthn.user_credentials uc
  WHERE uc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store a challenge
CREATE OR REPLACE FUNCTION public.webauthn_store_challenge(
  p_user_id UUID,
  p_challenge TEXT,
  p_challenge_type TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  challenge_id UUID;
BEGIN
  INSERT INTO webauthn.challenges (user_id, challenge, challenge_type, expires_at)
  VALUES (p_user_id, p_challenge, p_challenge_type, p_expires_at)
  RETURNING id INTO challenge_id;

  RETURN challenge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a valid challenge
CREATE OR REPLACE FUNCTION public.webauthn_get_challenge(
  p_user_id UUID,
  p_challenge_type TEXT
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  challenge TEXT,
  challenge_type TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.user_id, c.challenge, c.challenge_type, c.expires_at, c.created_at
  FROM webauthn.challenges c
  WHERE c.user_id = p_user_id
    AND c.challenge_type = p_challenge_type
    AND c.used = false
    AND c.expires_at > NOW()
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark challenge as used
CREATE OR REPLACE FUNCTION public.webauthn_mark_challenge_used(p_challenge_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE webauthn.challenges
  SET used = true
  WHERE id = p_challenge_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store user credential
CREATE OR REPLACE FUNCTION public.webauthn_store_credential(
  p_user_id UUID,
  p_credential_id TEXT,
  p_credential_public_key BYTEA,
  p_credential_counter BIGINT,
  p_credential_device_type TEXT,
  p_credential_backed_up BOOLEAN,
  p_credential_transports TEXT[],
  p_credential_name TEXT
)
RETURNS UUID AS $$
DECLARE
  cred_id UUID;
BEGIN
  INSERT INTO webauthn.user_credentials (
    user_id,
    credential_id,
    credential_public_key,
    credential_counter,
    credential_device_type,
    credential_backed_up,
    credential_transports,
    credential_name,
    last_used
  )
  VALUES (
    p_user_id,
    p_credential_id,
    p_credential_public_key,
    p_credential_counter,
    p_credential_device_type,
    p_credential_backed_up,
    p_credential_transports,
    p_credential_name,
    NOW()
  )
  RETURNING id INTO cred_id;

  RETURN cred_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user credential by credential_id
CREATE OR REPLACE FUNCTION public.webauthn_get_credential(p_credential_id TEXT)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  credential_id TEXT,
  credential_public_key BYTEA,
  credential_counter BIGINT,
  credential_device_type TEXT,
  credential_backed_up BOOLEAN,
  credential_transports TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT uc.id, uc.user_id, uc.credential_id, uc.credential_public_key,
         uc.credential_counter, uc.credential_device_type, uc.credential_backed_up,
         uc.credential_transports
  FROM webauthn.user_credentials uc
  WHERE uc.credential_id = p_credential_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update credential counter
CREATE OR REPLACE FUNCTION public.webauthn_update_counter(
  p_credential_id TEXT,
  p_new_counter BIGINT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE webauthn.user_credentials
  SET credential_counter = p_new_counter,
      last_used = NOW()
  WHERE credential_id = p_credential_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.webauthn_get_existing_credentials TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.webauthn_store_challenge TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.webauthn_get_challenge TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.webauthn_mark_challenge_used TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.webauthn_store_credential TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.webauthn_get_credential TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.webauthn_update_counter TO authenticated, service_role;