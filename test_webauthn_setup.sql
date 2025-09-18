-- Test if WebAuthn tables exist and are properly configured
SELECT 'webauthn.user_credentials table exists' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'webauthn' AND table_name = 'user_credentials'
);

SELECT 'webauthn.challenges table exists' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'webauthn' AND table_name = 'challenges'
);

-- Check table structure
\d webauthn.user_credentials;
\d webauthn.challenges;