-- Manually confirm user account for mitchell.thompson@windcave.com
-- Run this in your Supabase SQL Editor if the automatic sign-in keeps failing

-- First, let's see the current user status
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'mitchell.thompson@windcave.com';

-- Manually confirm the email if it's not confirmed
UPDATE auth.users 
SET 
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'mitchell.thompson@windcave.com'
AND email_confirmed_at IS NULL;

-- Verify the update
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'mitchell.thompson@windcave.com';

-- Also check if there are any other users with similar emails
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email LIKE '%mitchell%' OR email LIKE '%windcave%'
ORDER BY created_at DESC;
