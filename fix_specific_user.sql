-- Fix specific user account: mitchell.thompson@windcave.com
-- Run this in your Supabase SQL Editor

-- Check the current status of this specific user
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data,
  confirmation_token,
  recovery_token
FROM auth.users 
WHERE id = '6cc075cd-3176-4667-800a-8d3d5e6ba7fb';

-- Manually confirm the email for this specific user
UPDATE auth.users 
SET 
  email_confirmed_at = now(),
  updated_at = now()
WHERE id = '6cc075cd-3176-4667-800a-8d3d5e6ba7fb'
AND email_confirmed_at IS NULL;

-- Also try to clear any pending confirmation tokens
UPDATE auth.users 
SET 
  confirmation_token = NULL,
  recovery_token = NULL
WHERE id = '6cc075cd-3176-4667-800a-8d3d5e6ba7fb';

-- Verify the user is now confirmed
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE id = '6cc075cd-3176-4667-800a-8d3d5e6ba7fb';

-- Check if there are any organization invitations for this user
SELECT 
  oi.*,
  o.name as organization_name
FROM organization_invitations oi
JOIN organizations o ON oi.organization_id = o.id
WHERE oi.email = 'mitchell.thompson@windcave.com'
ORDER BY oi.created_at DESC;

-- Check if user is already in any organizations
SELECT 
  ou.*,
  o.name as organization_name
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = '6cc075cd-3176-4667-800a-8d3d5e6ba7fb';
