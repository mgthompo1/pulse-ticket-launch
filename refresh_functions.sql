-- Refresh functions with new names to bypass cache issues
-- Drop all existing functions
DROP FUNCTION IF EXISTS public.get_challenge CASCADE;
DROP FUNCTION IF EXISTS public.insert_challenge CASCADE;
DROP FUNCTION IF EXISTS public.mark_challenge_used CASCADE;
DROP FUNCTION IF EXISTS public.insert_user_credential CASCADE;
DROP FUNCTION IF EXISTS public.get_existing_credentials CASCADE;

-- Recreate with slightly different names to force cache refresh
CREATE OR REPLACE FUNCTION public.webauthn_get_challenge(
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
  SELECT c.id, c.challenge, c.user_id, c.challenge_type, c.used, c.expires_at, c.created_at
  FROM webauthn.challenges c
  WHERE c.user_id = p_user_id 
    AND c.challenge_type = p_challenge_type
    AND c.used = false
    AND c.expires_at >= NOW()
  ORDER BY c.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.webauthn_insert_challenge(
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

CREATE OR REPLACE FUNCTION public.webauthn_mark_challenge_used(p_challenge_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE webauthn.challenges 
  SET used = true 
  WHERE id = p_challenge_id;
$$;

CREATE OR REPLACE FUNCTION public.webauthn_insert_user_credential(
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

CREATE OR REPLACE FUNCTION public.webauthn_get_existing_credentials(p_user_id UUID)
RETURNS TABLE(credential_id TEXT)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT c.credential_id 
  FROM webauthn.user_credentials c
  WHERE c.user_id = p_user_id;
$$;

SELECT 'Functions recreated with new names' as status;

-- Test the new function
SELECT * FROM public.webauthn_get_challenge(
  (SELECT id FROM auth.users LIMIT 1),
  'registration'::TEXT
);

-- Show all functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%webauthn%'
ORDER BY routine_name;