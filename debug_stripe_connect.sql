-- Debug Stripe Connect data for organization
SELECT 
  id,
  name,
  stripe_account_id,
  stripe_access_token IS NOT NULL as has_access_token,
  stripe_refresh_token IS NOT NULL as has_refresh_token,
  stripe_scope,
  updated_at
FROM organizations 
WHERE user_id = '4eacd68d-a069-4035-920f-0ed21343ad79';