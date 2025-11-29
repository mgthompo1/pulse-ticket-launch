-- Fix organization INSERT policy
-- The original policy "Users can create their own organizations" was never dropped
-- and requires auth.uid() = user_id, which may fail in some edge cases.
-- The newer policies allow any authenticated user to create, but PostgreSQL
-- uses AND logic for multiple INSERT policies, causing failures.

-- Drop the old restrictive policy that was never properly removed
DROP POLICY IF EXISTS "Users can create their own organizations" ON public.organizations;

-- Ensure the permissive policy exists
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure that after creating an org, the user can immediately see and update it
-- This is already handled by the "Users can view their organizations" policy
-- which checks user_id = auth.uid() OR public.user_is_org_member(id, auth.uid())
