-- Test if get_challenge function exists and can be called
-- Check function exists
SELECT 
    routine_name, 
    routine_definition, 
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_challenge' 
  AND routine_schema = 'public';

-- Test calling the function directly
SELECT * FROM public.get_challenge(
    '00000000-0000-0000-0000-000000000000'::UUID,
    'registration'::TEXT
);
