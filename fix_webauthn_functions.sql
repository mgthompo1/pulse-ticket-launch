-- Drop existing functions to fix signature conflicts
DROP FUNCTION IF EXISTS public.insert_challenge(uuid,text,text,timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_challenge(uuid,text);
DROP FUNCTION IF EXISTS public.mark_challenge_used(uuid);
DROP FUNCTION IF EXISTS public.insert_user_credential(uuid,text,bytea,bigint,text,boolean,text[],text);
DROP FUNCTION IF EXISTS public.get_existing_credentials(uuid);

-- Recreate all functions with correct signatures
CREATE OR REPLACE FUNCTION public.get_challenge(
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

CREATE OR REPLACE FUNCTION public.insert_challenge(
  p_user_id UUID,
  p_challenge TEXT,
  p_challenge_type TEXT,
  p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
  INSERT INTO webauthn.challenges (user_id, challenge, challenge_type, expires_at)
  VALUES (p_user_id, p_challenge, p_challenge_type, p_expires_at);
$$;

CREATE OR REPLACE FUNCTION public.mark_challenge_used(p_challenge_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE webauthn.challenges 
  SET used = true 
  WHERE id = p_challenge_id;
$$;

CREATE OR REPLACE FUNCTION public.insert_user_credential(
  p_user_id UUID,
  p_credential_id TEXT,
  p_credential_public_key BYTEA,
  p_credential_counter BIGINT,
  p_credential_device_type TEXT,
  p_credential_backed_up BOOLEAN,
  p_credential_transports TEXT[],
  p_credential_name TEXT
)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_existing_credentials(p_user_id UUID)
RETURNS TABLE(credential_id TEXT)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT credential_id 
  FROM webauthn.user_credentials 
  WHERE user_id = p_user_id;
$$;

-- Test the functions
SELECT 'Functions recreated successfully' as status;

-- Show all functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name LIKE '%credential%' OR routine_name LIKE '%challenge%')
ORDER BY routine_name;
