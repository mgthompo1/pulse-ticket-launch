-- First, let's see the exact foreign key constraint that's causing the issue
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'organization_users' 
    AND c.contype = 'f'
    AND conname LIKE '%user_id%';

-- Drop the problematic foreign key constraint
ALTER TABLE public.organization_users 
DROP CONSTRAINT IF EXISTS organization_users_user_id_fkey;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE public.organization_users 
ADD CONSTRAINT organization_users_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the constraint was added correctly
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'organization_users' 
    AND c.contype = 'f'
    AND conname = 'organization_users_user_id_fkey';