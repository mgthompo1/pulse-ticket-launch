-- Create system/service policies that allow service role to bypass RLS
-- These policies allow operations when there's no authenticated user (service role context)

-- Allow system to update any order
DROP POLICY IF EXISTS "System can update orders" ON public.orders;
CREATE POLICY "System can update orders" ON public.orders
  FOR UPDATE
  USING (true);

-- Allow system to insert tickets
DROP POLICY IF EXISTS "System can create tickets" ON public.tickets;  
CREATE POLICY "System can create tickets" ON public.tickets
  FOR INSERT
  WITH CHECK (true);