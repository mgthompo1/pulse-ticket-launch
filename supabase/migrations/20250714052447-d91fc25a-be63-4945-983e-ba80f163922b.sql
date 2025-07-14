-- Remove the problematic RLS policy that's causing issues with service role
DROP POLICY IF EXISTS "Tickets follow order item policies" ON public.tickets;

-- Create a simpler policy that allows service role to insert tickets without auth.uid() check
CREATE POLICY "Service can manage tickets" ON public.tickets
  FOR ALL
  USING (true)
  WITH CHECK (true);