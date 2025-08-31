-- Fix RLS policies for attraction_bookings to allow anonymous bookings
-- This addresses the 401 error when creating bookings from the public widget

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Anyone can create attraction bookings" ON attraction_bookings;
DROP POLICY IF EXISTS "Users can view bookings for their attractions" ON attraction_bookings;
DROP POLICY IF EXISTS "Users can update bookings for their attractions" ON attraction_bookings;
DROP POLICY IF EXISTS "Customers can view their own bookings" ON attraction_bookings;
DROP POLICY IF EXISTS "Customers can update their own bookings" ON attraction_bookings;

-- Allow anonymous users to create bookings (public booking widget)
CREATE POLICY "Allow anonymous booking creation" 
ON attraction_bookings FOR INSERT 
WITH CHECK (true);

-- Allow organization owners to view all bookings for their attractions
CREATE POLICY "Organization owners can view their attraction bookings" 
ON attraction_bookings FOR SELECT 
USING (
  attraction_id IN (
    SELECT a.id FROM attractions a 
    JOIN public.organizations o ON a.organization_id = o.id 
    WHERE o.user_id = auth.uid()
  )
);

-- Allow organization owners to update bookings for their attractions
CREATE POLICY "Organization owners can update their attraction bookings" 
ON attraction_bookings FOR UPDATE 
USING (
  attraction_id IN (
    SELECT a.id FROM attractions a 
    JOIN public.organizations o ON a.organization_id = o.id 
    WHERE o.user_id = auth.uid()
  )
);

-- Allow system/service role to update bookings (for payment processing)
CREATE POLICY "Service role can update bookings" 
ON attraction_bookings FOR UPDATE 
USING (auth.role() = 'service_role');

-- Allow system/service role to select bookings (for email sending, etc.)
CREATE POLICY "Service role can select bookings" 
ON attraction_bookings FOR SELECT 
USING (auth.role() = 'service_role');

-- Optional: Allow customers to view their bookings by email (if they're authenticated)
-- This is for future use when customers might have accounts
CREATE POLICY "Authenticated customers can view their own bookings" 
ON attraction_bookings FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  customer_email = auth.jwt() ->> 'email'
);

-- Fix booking add-ons policies as well
DROP POLICY IF EXISTS "Users can manage booking add-ons" ON booking_add_ons;

-- Enable RLS on booking_add_ons if not already enabled
ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization owners can manage booking add-ons" 
ON booking_add_ons FOR ALL 
USING (
  booking_id IN (
    SELECT ab.id FROM attraction_bookings ab
    JOIN attractions a ON ab.attraction_id = a.id
    JOIN public.organizations o ON a.organization_id = o.id 
    WHERE o.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage booking add-ons" 
ON booking_add_ons FOR ALL 
USING (auth.role() = 'service_role');
