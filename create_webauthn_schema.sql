-- Create WebAuthn schema and tables
-- Run this in your Supabase SQL Editor if the migration didn't apply

-- Create the webauthn schema
CREATE SCHEMA IF NOT EXISTS webauthn;

-- Create user credentials table
CREATE TABLE IF NOT EXISTS webauthn.user_credentials (
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

-- Create challenges table
CREATE TABLE IF NOT EXISTS webauthn.challenges (
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

-- RLS Policies for user_credentials
CREATE POLICY "Users can view their own credentials" ON webauthn.user_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials" ON webauthn.user_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" ON webauthn.user_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" ON webauthn.user_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for challenges
CREATE POLICY "Users can view their own challenges" ON webauthn.challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges" ON webauthn.challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges" ON webauthn.challenges
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON webauthn.user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_credential_id ON webauthn.user_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON webauthn.challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON webauthn.challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_challenges_used ON webauthn.challenges(used);

-- Helper functions for edge functions to access webauthn schema
CREATE OR REPLACE FUNCTION public.get_user_credentials(p_user_id UUID)
RETURNS TABLE(credential_id TEXT, credential_transports TEXT[])
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT credential_id, credential_transports 
  FROM webauthn.user_credentials 
  WHERE user_id = p_user_id;
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

CREATE OR REPLACE FUNCTION public.get_user_credential(
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

CREATE OR REPLACE FUNCTION public.update_credential_counter(
  p_credential_id UUID,
  p_new_counter BIGINT
)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE webauthn.user_credentials 
  SET credential_counter = p_new_counter, last_used = NOW()
  WHERE id = p_credential_id;
$$;

CREATE OR REPLACE FUNCTION public.mark_challenge_used(p_challenge_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE webauthn.challenges 
  SET used = true 
  WHERE id = p_challenge_id;
$$;

CREATE OR REPLACE FUNCTION public.get_existing_credentials(p_user_id UUID)
RETURNS TABLE(credential_id TEXT)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT credential_id 
  FROM webauthn.user_credentials 
  WHERE user_id = p_user_id;
$$;