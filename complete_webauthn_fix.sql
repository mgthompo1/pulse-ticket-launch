-- Complete WebAuthn function fix
-- This will create everything from scratch

-- First ensure the schema and tables exist
CREATE SCHEMA IF NOT EXISTS webauthn;

-- Drop all existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_challenge CASCADE;
DROP FUNCTION IF EXISTS public.insert_challenge CASCADE;
DROP FUNCTION IF EXISTS public.mark_challenge_used CASCADE;
DROP FUNCTION IF EXISTS public.insert_user_credential CASCADE;
DROP FUNCTION IF EXISTS public.get_existing_credentials CASCADE;
DROP FUNCTION IF EXISTS public.get_user_credential CASCADE;
DROP FUNCTION IF EXISTS public.update_credential_counter CASCADE;
DROP FUNCTION IF EXISTS public.get_user_credentials CASCADE;

-- Recreate tables with correct structure
DROP TABLE IF EXISTS webauthn.user_credentials CASCADE;
DROP TABLE IF EXISTS webauthn.challenges CASCADE;

CREATE TABLE webauthn.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  credential_public_key BYTEA NOT NULL,
  credential_counter BIGINT NOT NULL DEFAULT 0,
  credential_device_type TEXT,
  credential_backed_up BOOLEAN DEFAULT false,
  credential_transports TEXT[] DEFAULT '{}',
  credential_name TEXT DEFAULT 'My Passkey',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE webauthn.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('registration', 'authentication')),
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE webauthn.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn.challenges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own credentials" ON webauthn.user_credentials
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own challenges" ON webauthn.challenges
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON webauthn.user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_credential_id ON webauthn.user_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON webauthn.challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON webauthn.challenges(expires_at);

-- Now create all functions with explicit types
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
  SELECT c.id, c.challenge, c.user_id, c.challenge_type, c.used, c.expires_at, c.created_at
  FROM webauthn.challenges c
  WHERE c.user_id = p_user_id 
    AND c.challenge_type = p_challenge_type
    AND c.used = false
    AND c.expires_at >= NOW()
  ORDER BY c.created_at DESC
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
  SELECT c.credential_id 
  FROM webauthn.user_credentials c
  WHERE c.user_id = p_user_id;
$$;

-- Test all functions
SELECT 'Testing functions...' as status;

-- Test insert and get challenge
SELECT public.insert_challenge(
  '00000000-0000-0000-0000-000000000000'::UUID,
  'test-challenge-123',
  'registration'::TEXT,
  (NOW() + INTERVAL '5 minutes')::TIMESTAMP WITH TIME ZONE
);

SELECT * FROM public.get_challenge(
  '00000000-0000-0000-0000-000000000000'::UUID,
  'registration'::TEXT
);

-- Show all functions exist
SELECT 'Created functions:' as status;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name LIKE '%credential%' OR routine_name LIKE '%challenge%')
ORDER BY routine_name;

SELECT 'Setup complete!' as status;