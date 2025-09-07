-- WebAuthn Schema Migration
-- Creates tables for storing passkey credentials and related data

-- Create webauthn schema for namespacing
CREATE SCHEMA IF NOT EXISTS webauthn;

-- User credentials table - stores WebAuthn credential data
CREATE TABLE webauthn.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- WebAuthn credential data
  credential_id TEXT NOT NULL UNIQUE,
  credential_public_key BYTEA NOT NULL,
  credential_counter BIGINT NOT NULL DEFAULT 0,
  
  -- Device and backup information
  credential_device_type TEXT,
  credential_backed_up BOOLEAN DEFAULT false,
  credential_transports TEXT[], -- ['usb', 'nfc', 'ble', 'hybrid']
  
  -- User-friendly credential management
  credential_name TEXT, -- e.g., "iPhone TouchID", "YubiKey"
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ,
  
  -- Indexes for performance
  CONSTRAINT unique_user_credential UNIQUE(user_id, credential_id)
);

-- Challenge storage for registration and authentication flows
CREATE TABLE webauthn.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_credentials_user_id ON webauthn.user_credentials(user_id);
CREATE INDEX idx_user_credentials_credential_id ON webauthn.user_credentials(credential_id);
CREATE INDEX idx_user_credentials_last_used ON webauthn.user_credentials(last_used);

CREATE INDEX idx_challenges_user_id ON webauthn.challenges(user_id);
CREATE INDEX idx_challenges_challenge ON webauthn.challenges(challenge);
CREATE INDEX idx_challenges_expires_at ON webauthn.challenges(expires_at);

-- Clean up expired challenges automatically
CREATE OR REPLACE FUNCTION webauthn.cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM webauthn.challenges 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's passkey count
CREATE OR REPLACE FUNCTION webauthn.get_user_passkey_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM webauthn.user_credentials
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has any passkeys
CREATE OR REPLACE FUNCTION webauthn.user_has_passkeys(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM webauthn.user_credentials
    WHERE user_id = user_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for security
ALTER TABLE webauthn.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn.challenges ENABLE ROW LEVEL SECURITY;

-- Users can only see their own credentials
CREATE POLICY "Users can view their own credentials" 
ON webauthn.user_credentials FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can insert their own credentials (during registration)
CREATE POLICY "Users can insert their own credentials" 
ON webauthn.user_credentials FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own credentials (counter, last_used, name)
CREATE POLICY "Users can update their own credentials" 
ON webauthn.user_credentials FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete their own credentials" 
ON webauthn.user_credentials FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Challenge policies - more permissive for service role operations
CREATE POLICY "Service role can manage challenges" 
ON webauthn.challenges FOR ALL 
TO service_role 
USING (true);

-- Users can view their own challenges
CREATE POLICY "Users can view their own challenges" 
ON webauthn.challenges FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA webauthn TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA webauthn TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON webauthn.user_credentials TO authenticated;
GRANT SELECT ON webauthn.challenges TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA webauthn TO authenticated, service_role;

-- Add helpful comments
COMMENT ON SCHEMA webauthn IS 'WebAuthn/Passkey credential storage and management';
COMMENT ON TABLE webauthn.user_credentials IS 'Stores WebAuthn credentials (passkeys) for users';
COMMENT ON TABLE webauthn.challenges IS 'Temporary storage for WebAuthn challenges during auth flows';
COMMENT ON COLUMN webauthn.user_credentials.credential_id IS 'Base64URL encoded credential ID from WebAuthn';
COMMENT ON COLUMN webauthn.user_credentials.credential_public_key IS 'CBOR encoded public key from WebAuthn';
COMMENT ON COLUMN webauthn.user_credentials.credential_counter IS 'Signature counter for replay attack prevention';