-- Analyze and fix security issues with customer personal information in orders and contact_enquiries tables

-- First, let's examine the current RLS policies for these tables
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
WHERE tablename IN ('orders', 'contact_enquiries')
ORDER BY tablename, policyname;

-- Check what columns contain sensitive customer data
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('orders', 'contact_enquiries') 
    AND table_schema = 'public'
    AND column_name LIKE ANY(ARRAY['%email%', '%phone%', '%name%'])
ORDER BY table_name, ordinal_position;

-- SECURITY FIX 1: Add explicit policies to deny anonymous access to orders table
-- This prevents harvesting of customer names, emails, and phone numbers
CREATE POLICY "deny_anonymous_access_to_orders" 
ON public.orders 
FOR ALL 
TO anon 
USING (false);

-- SECURITY FIX 2: Add explicit policy ensuring only authenticated users with proper permissions can access orders
CREATE POLICY "authenticated_users_proper_orders_access_only" 
ON public.orders 
FOR SELECT 
TO authenticated 
USING (
    -- Only allow access if user is authenticated AND meets one of these criteria:
    auth.uid() IS NOT NULL AND (
        -- User is an authenticated admin
        is_authenticated_admin() OR
        -- User is an event organizer viewing their own event orders
        event_id IN (
            SELECT e.id 
            FROM events e 
            JOIN organizations o ON e.organization_id = o.id 
            WHERE o.user_id = auth.uid()
        )
    )
);

-- SECURITY FIX 3: Add explicit policies to deny anonymous access to contact_enquiries
-- This prevents harvesting of customer contact details from enquiries
CREATE POLICY "deny_anonymous_access_to_contact_enquiries" 
ON public.contact_enquiries 
FOR SELECT 
TO anon 
USING (false);

-- SECURITY FIX 4: Ensure only authenticated users with proper permissions can view enquiries
CREATE POLICY "authenticated_users_proper_enquiries_access_only" 
ON public.contact_enquiries 
FOR SELECT 
TO authenticated 
USING (
    -- Only allow access if user is authenticated AND meets one of these criteria:
    auth.uid() IS NOT NULL AND (
        -- User is an authenticated admin (can view all enquiries)
        is_authenticated_admin() OR
        -- User is viewing their organization's support tickets only
        (enquiry_type = 'support' AND organization_id IS NOT NULL AND 
         organization_id IN (
             SELECT organizations.id 
             FROM organizations 
             WHERE organizations.user_id = auth.uid()
         ))
    )
);

-- SECURITY FIX 5: Ensure anonymous users can still create general enquiries but with limited scope
-- Update the existing policy to be more restrictive
DROP POLICY IF EXISTS "Anyone can create public enquiries" ON public.contact_enquiries;

CREATE POLICY "anonymous_can_create_general_enquiries_only" 
ON public.contact_enquiries 
FOR INSERT 
TO anon 
WITH CHECK (
    -- Anonymous users can only create general enquiries (not support tickets)
    enquiry_type = 'general' AND 
    organization_id IS NULL AND
    -- Ensure required fields are present
    name IS NOT NULL AND 
    email IS NOT NULL AND 
    message IS NOT NULL
);

-- Verify RLS is enabled on both tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('orders', 'contact_enquiries') 
    AND schemaname = 'public';

-- Verify the new policies are in place
SELECT 
    tablename,
    policyname,
    roles,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename IN ('orders', 'contact_enquiries')
    AND policyname LIKE '%anonymous%'
ORDER BY tablename, policyname;