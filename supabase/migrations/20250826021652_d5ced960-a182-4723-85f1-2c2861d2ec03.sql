-- Fix the auth.users table corruption issue
-- The problem is NULL confirmation_token values causing SQL scan errors

-- First, let's see what users have NULL confirmation_token
SELECT email, confirmation_token, email_confirmed_at 
FROM auth.users 
WHERE confirmation_token IS NULL 
LIMIT 5;

-- Fix the NULL confirmation_token values by setting them to empty string
-- This should resolve the "converting NULL to string is unsupported" error
UPDATE auth.users 
SET confirmation_token = '' 
WHERE confirmation_token IS NULL;

-- Also ensure email_change_token_new and email_change_token_current are not NULL
UPDATE auth.users 
SET email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, '')
WHERE email_change_token_new IS NULL OR email_change_token_current IS NULL;

-- Check recovery_token as well
UPDATE auth.users 
SET recovery_token = COALESCE(recovery_token, '')
WHERE recovery_token IS NULL;