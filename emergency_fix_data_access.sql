-- EMERGENCY FIX: Restore access to existing events and data
-- Run this immediately in your Supabase SQL Editor

-- First, let's see what's currently blocked
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('events', 'tickets', 'orders', 'order_items')
ORDER BY tablename, policyname;

-- TEMPORARILY DISABLE RLS on critical tables to restore access
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS but with more permissive policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Users can view their organization's events" ON events;
DROP POLICY IF EXISTS "Users can create events for their organizations" ON events;
DROP POLICY IF EXISTS "Users can update their organization's events" ON events;
DROP POLICY IF EXISTS "Published events are publicly viewable" ON events;

-- Create more permissive policies for events
CREATE POLICY "Events are publicly viewable"
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

-- Create permissive policies for tickets
CREATE POLICY "Tickets are publicly viewable"
ON tickets
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create tickets"
ON tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create permissive policies for orders
CREATE POLICY "Orders are publicly viewable"
ON orders
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create orders"
ON orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create permissive policies for order_items
CREATE POLICY "Order items are publicly viewable"
ON order_items
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create order items"
ON order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create permissive policies for ticket_types
CREATE POLICY "Ticket types are publicly viewable"
ON ticket_types
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Event organizers can manage ticket types"
ON ticket_types
FOR ALL
TO authenticated
USING (
  event_id IN (
    SELECT id FROM events WHERE organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('events', 'tickets', 'orders', 'order_items', 'ticket_types')
ORDER BY tablename, policyname;
