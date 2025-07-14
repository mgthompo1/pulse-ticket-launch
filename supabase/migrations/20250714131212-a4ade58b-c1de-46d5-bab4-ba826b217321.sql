-- Add test_mode field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN test_mode boolean NOT NULL DEFAULT true;

-- Add test_mode field to events table to track test vs live events
ALTER TABLE public.events 
ADD COLUMN test_mode boolean NOT NULL DEFAULT true;

-- Add test_mode field to orders table to track test vs live orders
ALTER TABLE public.orders 
ADD COLUMN test_mode boolean NOT NULL DEFAULT true;

-- Update RLS policies to include test mode considerations
-- Users can view their own test and live events
DROP POLICY IF EXISTS "Users can view their organization's events" ON public.events;
CREATE POLICY "Users can view their organization's events" ON public.events
FOR SELECT
USING (organization_id IN (
  SELECT id FROM organizations 
  WHERE user_id = auth.uid()
));

-- Create view for test mode analytics
CREATE OR REPLACE VIEW public.test_mode_analytics AS
SELECT 
  o.organization_id,
  e.test_mode,
  COUNT(DISTINCT e.id) as total_events,
  COUNT(DISTINCT ord.id) as total_orders,
  COALESCE(SUM(ord.total_amount), 0) as total_revenue,
  COALESCE(SUM(ord.total_amount * 0.01 + 0.50), 0) as estimated_platform_fees
FROM organizations o
LEFT JOIN events e ON o.id = e.organization_id
LEFT JOIN orders ord ON e.id = ord.event_id
GROUP BY o.id, e.test_mode;