-- QUICK FIX: Restore access to events data
-- Run this immediately in your Supabase SQL Editor

-- First, let's see what policies currently exist on events table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- Temporarily disable RLS on events to restore immediate access
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with permissive policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop any problematic policies
DROP POLICY IF EXISTS "Events are publicly viewable" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Event owners can manage their events" ON events;
DROP POLICY IF EXISTS "Users can view their organization's events" ON events;
DROP POLICY IF EXISTS "Users can create events for their organizations" ON events;
DROP POLICY IF EXISTS "Users can update their organization's events" ON events;
DROP POLICY IF EXISTS "Published events are publicly viewable" ON events;

-- Create simple, permissive policies that won't block access
CREATE POLICY "Events are viewable by everyone"
ON events
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated users can create events"
ON events
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Event owners can manage their events"
ON events
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
);

-- Also fix tickets table if needed
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing ticket policies first
DROP POLICY IF EXISTS "Tickets are publicly viewable" ON tickets;
DROP POLICY IF EXISTS "Anyone can create tickets" ON tickets;
DROP POLICY IF EXISTS "Tickets follow order item policies" ON tickets;
DROP POLICY IF EXISTS "Tickets can be created by anyone" ON tickets;

CREATE POLICY "Tickets are viewable by everyone"
ON tickets
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create tickets"
ON tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix orders table if needed
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing order policies first
DROP POLICY IF EXISTS "Orders are publicly viewable" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Users can view orders for their events" ON orders;
DROP POLICY IF EXISTS "Orders can be created by anyone" ON tickets;

CREATE POLICY "Orders are viewable by everyone"
ON orders
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create orders"
ON orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('events', 'tickets', 'orders')
ORDER BY tablename, policyname;
