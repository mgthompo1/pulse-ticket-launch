-- SIMPLE FIX: Fix organizations table RLS policies causing HTTP 500 errors
-- Run this in your Supabase SQL Editor

-- First, let's see what's currently causing issues
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'organizations'
ORDER BY policyname;

-- Drop all complex policies that might be causing circular dependencies
DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can delete their own organizations" ON organizations;
DROP POLICY IF EXISTS "Organizations viewable by invitation token" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can view invited organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;

-- Create simple, permissive policies that won't cause errors
CREATE POLICY "Organizations are viewable by all authenticated users"
ON organizations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create their own organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own organizations"
ON organizations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own organizations"
ON organizations
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Allow unauthenticated users to view organizations (needed for invitation flow)
CREATE POLICY "Organizations are viewable by everyone"
ON organizations
FOR SELECT
TO anon
USING (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'organizations'
ORDER BY policyname;
