-- Test user account configuration for sign-in
-- Run this in your Supabase SQL Editor

-- Check the complete user status
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  banned_until,
  reauthentication_sent_at,
  email_change_confirm_status
FROM auth.users 
WHERE id = '6cc075cd-3176-4667-800a-8d3d5e6ba7fb';

-- Check if there are any auth-related issues
SELECT 
  'User exists' as status,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Email confirmed'
    ELSE 'Email NOT confirmed'
  END as email_status,
  CASE 
    WHEN banned_until IS NULL OR banned_until < now() THEN 'Not banned'
    ELSE 'Banned until ' || banned_until
  END as ban_status,
  CASE 
    WHEN confirmation_token IS NULL THEN 'No pending confirmation'
    ELSE 'Has pending confirmation token'
  END as confirmation_status
FROM auth.users 
WHERE id = '6cc075cd-3176-4667-800a-8d3d5e6ba7fb';

-- Check organization invitation status
SELECT 
  'Invitation Status' as info,
  oi.status,
  oi.expires_at,
  oi.created_at,
  o.name as organization_name,
  CASE 
    WHEN oi.expires_at > now() THEN 'Valid'
    ELSE 'Expired'
  END as validity
FROM organization_invitations oi
JOIN organizations o ON oi.organization_id = o.id
WHERE oi.email = 'mitchell.thompson@windcave.com'
ORDER BY oi.created_at DESC;
