# WebAuthn Database Fix

Your WebAuthn functionality is failing because the database tables don't exist. Here's how to fix it:

## 1. Go to Supabase Dashboard
1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/yoxsewbpoqxscsutqlcb)
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

## 2. Run this SQL to create the WebAuthn tables:

```sql
-- Create webauthn schema
CREATE SCHEMA IF NOT EXISTS webauthn;

-- Create user_credentials table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON webauthn.user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_credential_id ON webauthn.user_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON webauthn.challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenge ON webauthn.challenges(challenge);

-- Enable RLS
ALTER TABLE webauthn.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn.challenges ENABLE ROW LEVEL SECURITY;

-- Create policies
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
```

## 3. Click "Run" to execute the SQL

## 4. Test the fix
After running the SQL, try registering a passkey again in your web app. The "Database error" should be resolved.

## What this does:
- Creates the `webauthn` schema
- Creates `webauthn.user_credentials` table for storing passkey data
- Creates `webauthn.challenges` table for temporary auth challenges
- Sets up proper Row Level Security (RLS) policies
- Grants correct permissions

The WebAuthn edge functions are already fixed and deployed - they just needed the database tables to exist.