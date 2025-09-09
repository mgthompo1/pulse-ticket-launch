-- Test if our WebAuthn RPC functions exist and work
-- Run this in your Supabase SQL Editor to verify functions exist

-- Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%credential%' 
  OR routine_name LIKE '%challenge%'
ORDER BY routine_name;

-- Test get_existing_credentials function (should work even with no data)
SELECT * FROM public.get_existing_credentials('00000000-0000-0000-0000-000000000000'::UUID);