-- Manually add the existing user mitchell.thompson@windcave.com to the organization
-- Run this in your Supabase SQL Editor

-- First, let's see what organizations exist
SELECT id, name, user_id FROM organizations ORDER BY name;

-- Find the organization "mitchs ticket company" (or whatever your org name is)
SELECT id, name, user_id FROM organizations WHERE name LIKE '%mitch%' OR name LIKE '%ticket%';

-- Get the user ID for mitchell.thompson@windcave.com
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'mitchell.thompson@windcave.com';

-- Add the user to the organization (replace the UUIDs with actual values from above queries)
-- You'll need to run this with the actual organization_id and user_id from the queries above

-- Example (replace with actual UUIDs):
-- INSERT INTO organization_users (
--   organization_id,
--   user_id,
--   role,
--   permissions
-- ) VALUES (
--   'YOUR_ORGANIZATION_ID_HERE',
--   '6cc075cd-3176-4667-800a-8d3d5e6ba7fb', -- mitchell.thompson@windcave.com user ID
--   'viewer',
--   ARRAY['view_events']::organization_permission[]
-- );

-- Check if the user is now in the organization
SELECT 
  ou.*,
  o.name as organization_name,
  au.email as user_email
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
JOIN auth.users au ON ou.user_id = au.id
WHERE au.email = 'mitchell.thompson@windcave.com';
