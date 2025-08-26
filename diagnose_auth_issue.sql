-- Simplified diagnosis of auth.users table issues
-- Run this in your Supabase SQL Editor

-- 1. Check if there are any RLS policies on auth.users that might be interfering
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'auth' AND tablename = 'users';

-- 2. Check if there are any triggers on auth.users that might be causing issues
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- 3. Check if there are any foreign key constraints that might be failing
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'auth'
AND tc.table_name = 'users';

-- 4. Check if there are any check constraints on auth.users
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'auth';

-- 5. Check the auth.users table structure and any issues
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. Check if there are any pending transactions or locks
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query
FROM pg_stat_activity
WHERE state = 'active'
AND query LIKE '%auth.users%';

-- 7. Try to manually create a test user to see what specific error occurs
-- (This will help identify the exact issue)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Try to create a test user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    '',
    'test@example.com',
    crypt('testpassword', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{}',
    false,
    NULL,
    NULL,
    NULL,
    NULL
  ) RETURNING id INTO test_user_id;
  
  RAISE NOTICE 'Test user created successfully with ID: %', test_user_id;
  
  -- Clean up the test user
  DELETE FROM auth.users WHERE id = test_user_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating test user: % %', SQLERRM, SQLSTATE;
END $$;
