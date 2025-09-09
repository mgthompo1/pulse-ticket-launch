-- Debug the challenge storage issue
-- Check if any challenges are being stored
SELECT 'All challenges in database:' as test;
SELECT 
  id,
  user_id,
  challenge,
  challenge_type,
  used,
  expires_at,
  created_at,
  (expires_at >= NOW()) as is_not_expired,
  (NOW() - created_at) as age
FROM webauthn.challenges 
ORDER BY created_at DESC 
LIMIT 10;

-- Test the get_challenge function manually with a real user ID
-- First get a real user ID
SELECT 'Real user for testing:' as test;
SELECT id as user_id, email FROM auth.users LIMIT 1;

-- Check if RLS policies are blocking access
SELECT 'Testing RLS policies:' as test;
SELECT current_setting('row_security');

-- Show what auth.uid() returns (should be null in SQL editor)
SELECT 'Current auth.uid():' as test;
SELECT auth.uid() as current_auth_uid;