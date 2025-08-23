-- CRITICAL SECURITY FIX: Add RLS policies to guest_status_view
-- This view contains sensitive customer data that was publicly accessible

-- First, enable RLS on the guest_status_view if not already enabled
ALTER TABLE public.guest_status_view ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to restrict access to event organizers only
-- Only users who own the organization that owns the event can see guest data for that event
CREATE POLICY "Event organizers can view guest data for their events only" 
ON public.guest_status_view 
FOR SELECT 
USING (
  event_id IN (
    SELECT e.id
    FROM events e
    JOIN organizations o ON e.organization_id = o.id
    WHERE o.user_id = auth.uid()
  )
);

-- Add policy for admins to view all guest data for management purposes
CREATE POLICY "Admins can view all guest data" 
ON public.guest_status_view 
FOR SELECT 
USING (is_authenticated_admin());

-- Ensure no public access - explicitly deny unauthenticated users
-- (This is additional security, RLS already handles this but being explicit)
CREATE POLICY "Deny unauthenticated access to guest data" 
ON public.guest_status_view 
FOR ALL 
TO anon 
USING (false);