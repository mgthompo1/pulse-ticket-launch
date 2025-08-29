-- Fix RLS policy for orders to allow service role updates
-- This allows the stripe-payment-success function to update order status

-- Drop the restrictive policy that requires auth.uid()
DROP POLICY IF EXISTS "Orders can be updated by event organizers" ON public.orders;

-- Create a new policy that allows both authenticated users and service role
CREATE POLICY "Orders can be updated by event organizers or service role" 
ON public.orders FOR UPDATE 
USING (
  -- Allow service role (no auth.uid() check)
  (auth.role() = 'service_role') OR
  -- Allow event organizers (existing logic)
  (event_id IN (
    SELECT e.id FROM public.events e 
    JOIN public.organizations o ON e.organization_id = o.id 
    WHERE o.user_id = auth.uid()
  ))
);

-- Also add a policy for the service role to insert tickets
DROP POLICY IF EXISTS "Service can manage tickets" ON public.tickets;
CREATE POLICY "Service can manage tickets" ON public.tickets
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add a policy for the service role to manage order items
CREATE POLICY "Service can manage order items" ON public.order_items
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant necessary permissions to the service role
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.tickets TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
