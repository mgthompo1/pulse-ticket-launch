-- Comprehensive fix for organizations table RLS policies
-- Run this in your Supabase SQL Editor

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'organizations'
ORDER BY policyname;

-- Drop all existing policies on organizations table
DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Organizations viewable by invitation token" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can view invited organizations" ON organizations;

-- Create new comprehensive policies

-- Allow users to view their own organizations
CREATE POLICY "Users can view their own organizations"
ON organizations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to create their own organizations
CREATE POLICY "Users can create their own organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own organizations
CREATE POLICY "Users can update their own organizations"
ON organizations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Allow users to delete their own organizations
CREATE POLICY "Users can delete their own organizations"
ON organizations
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Allow unauthenticated users to view organizations via valid invitation tokens
CREATE POLICY "Organizations viewable by invitation token"
ON organizations
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 
    FROM organization_invitations 
    WHERE organization_id = organizations.id
    AND invitation_token IS NOT NULL 
    AND status = 'pending'
    AND expires_at > now()
  )
);

-- Allow authenticated users to view organizations they're invited to
CREATE POLICY "Authenticated users can view invited organizations"
ON organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM organization_invitations 
    WHERE email = auth.email()
    AND status = 'pending'
  )
);

-- Allow authenticated users to view organizations they're members of
CREATE POLICY "Users can view organizations they belong to"
ON organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

-- Verify all policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'organizations'
ORDER BY policyname;
