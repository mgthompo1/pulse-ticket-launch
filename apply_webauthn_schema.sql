-- Apply WebAuthn schema to database
-- This creates the missing webauthn.user_credentials and webauthn.challenges tables

-- Create schema
CREATE SCHEMA IF NOT EXISTS webauthn;

-- Create webauthn.user_credentials table if it doesn't exist
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

-- Create webauthn.challenges table if it doesn't exist
CREATE TABLE IF NOT EXISTS webauthn.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('registration', 'authentication')),
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON webauthn.user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_credential_id ON webauthn.user_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON webauthn.challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenge ON webauthn.challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON webauthn.challenges(expires_at);

-- Enable RLS
ALTER TABLE webauthn.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn.challenges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own credentials" ON webauthn.user_credentials;
DROP POLICY IF EXISTS "Users can insert their own credentials" ON webauthn.user_credentials;
DROP POLICY IF EXISTS "Users can update their own credentials" ON webauthn.user_credentials;
DROP POLICY IF EXISTS "Users can delete their own credentials" ON webauthn.user_credentials;
DROP POLICY IF EXISTS "Service role can manage challenges" ON webauthn.challenges;
DROP POLICY IF EXISTS "Users can view their own challenges" ON webauthn.challenges;

-- Create RLS policies
CREATE POLICY "Users can view their own credentials" ON webauthn.user_credentials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials" ON webauthn.user_credentials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" ON webauthn.user_credentials
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" ON webauthn.user_credentials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage challenges" ON webauthn.challenges
  FOR ALL TO service_role USING (true);

CREATE POLICY "Users can view their own challenges" ON webauthn.challenges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA webauthn TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA webauthn TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON webauthn.user_credentials TO authenticated;
GRANT SELECT ON webauthn.challenges TO authenticated;