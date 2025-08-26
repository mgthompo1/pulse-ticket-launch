-- Check what foreign key constraints exist on organization_users table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'organization_users' 
    AND c.contype = 'f';

-- Let's also check if there's a users table in public schema
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name IN ('users', 'profiles') 
    AND table_schema = 'public';

-- Check the organization_users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'organization_users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;