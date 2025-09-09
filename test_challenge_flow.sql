-- Test the complete challenge flow
-- First, let's see if there are any challenges in the database
SELECT 'Current challenges in database:' as test;
SELECT * FROM webauthn.challenges ORDER BY created_at DESC LIMIT 5;

-- Test inserting a challenge manually
SELECT 'Testing challenge insertion:' as test;
SELECT public.insert_challenge(
  '00000000-0000-0000-0000-000000000000'::UUID,
  'test-challenge-123',
  'registration',
  NOW() + INTERVAL '5 minutes'
);

-- Test retrieving the challenge
SELECT 'Testing challenge retrieval:' as test;
SELECT * FROM public.get_challenge(
  '00000000-0000-0000-0000-000000000000'::UUID,
  'registration'
);

-- Show all challenges again
SELECT 'All challenges after test:' as test;
SELECT * FROM webauthn.challenges ORDER BY created_at DESC LIMIT 5;