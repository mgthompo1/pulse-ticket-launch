-- Test with actual user data
-- First, let's see what users exist
SELECT 'Current users:' as test;
SELECT id, email FROM auth.users LIMIT 3;

-- Show the functions that were created
SELECT 'Created functions:' as test;
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name LIKE '%credential%' OR routine_name LIKE '%challenge%')
ORDER BY routine_name;

-- Test getting challenges (should be empty initially)
SELECT 'Current challenges:' as test;
SELECT * FROM webauthn.challenges ORDER BY created_at DESC LIMIT 5;

-- Test getting existing credentials (should be empty initially)  
SELECT 'Current credentials:' as test;
SELECT * FROM webauthn.user_credentials ORDER BY created_at DESC LIMIT 5;