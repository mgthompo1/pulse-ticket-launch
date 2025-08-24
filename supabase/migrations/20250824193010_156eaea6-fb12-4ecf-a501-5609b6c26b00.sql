-- Analyze the billing_customers table security and improve RLS policies
-- First, let's check the current state of the table
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'billing_customers' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'billing_customers';

-- The billing_customers table already has proper RLS enabled and policies that restrict access
-- based on organization ownership via the user_owns_organization function.
-- 
-- Current policy: "Users can manage their organization billing"
-- - Uses user_owns_organization(organization_id, auth.uid()) 
-- - Applies to ALL operations (SELECT, INSERT, UPDATE, DELETE)
-- - Ensures users can only access billing data for organizations they own
--
-- This is already secure and follows proper RLS best practices.
-- The security scanner may be giving a false positive.
--
-- However, let's add an additional explicit policy for extra security
-- to ensure anonymous users definitely cannot access billing data

-- Add explicit policy to deny anonymous access to billing_customers
CREATE POLICY "deny_anonymous_access_billing_customers" 
ON public.billing_customers 
FOR ALL 
TO anon 
USING (false);

-- Add explicit policy to ensure only authenticated users with proper organization ownership can access
CREATE POLICY "authenticated_users_own_organization_billing_only" 
ON public.billing_customers 
FOR ALL 
TO authenticated 
USING (
    auth.uid() IS NOT NULL 
    AND user_owns_organization(organization_id, auth.uid())
);

-- Verify RLS is enabled (it should already be enabled)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'billing_customers' 
    AND schemaname = 'public';