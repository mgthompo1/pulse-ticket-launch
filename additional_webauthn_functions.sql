-- Additional helper functions for the remaining WebAuthn edge functions

CREATE OR REPLACE FUNCTION public.get_challenge_for_verify(
  p_user_id UUID,
  p_challenge_type TEXT
)
RETURNS TABLE(
  id UUID,
  challenge TEXT,
  user_id UUID,
  challenge_type TEXT,
  used BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT id, challenge, user_id, challenge_type, used, expires_at, created_at
  FROM webauthn.challenges 
  WHERE user_id = p_user_id 
    AND challenge_type = p_challenge_type
    AND used = false
    AND expires_at >= NOW()
  ORDER BY created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_credential_by_id(
  p_user_id UUID,
  p_credential_id TEXT
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  credential_id TEXT,
  credential_public_key BYTEA,
  credential_counter BIGINT,
  credential_device_type TEXT,
  credential_backed_up BOOLEAN,
  credential_transports TEXT[],
  credential_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_used TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT id, user_id, credential_id, credential_public_key, credential_counter,
         credential_device_type, credential_backed_up, credential_transports,
         credential_name, created_at, last_used
  FROM webauthn.user_credentials 
  WHERE user_id = p_user_id AND credential_id = p_credential_id;
$$;

CREATE OR REPLACE FUNCTION public.insert_user_credential_full(
  p_user_id UUID,
  p_credential_id TEXT,
  p_credential_public_key BYTEA,
  p_credential_counter BIGINT,
  p_credential_device_type TEXT,
  p_credential_backed_up BOOLEAN,
  p_credential_transports TEXT[],
  p_credential_name TEXT
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO webauthn.user_credentials (
    user_id, credential_id, credential_public_key, credential_counter,
    credential_device_type, credential_backed_up, credential_transports,
    credential_name, last_used
  )
  VALUES (
    p_user_id, p_credential_id, p_credential_public_key, p_credential_counter,
    p_credential_device_type, p_credential_backed_up, p_credential_transports,
    p_credential_name, NOW()
  );
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_credential_counter_and_used(
  p_credential_id UUID,
  p_new_counter BIGINT
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE webauthn.user_credentials 
  SET credential_counter = p_new_counter, last_used = NOW()
  WHERE id = p_credential_id;
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;