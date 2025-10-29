-- Fix RLS performance issue by wrapping auth.uid() in subquery
-- This prevents re-evaluation of auth.uid() for each row

-- Drop and recreate the SELECT policy with optimized auth.uid() calls
DROP POLICY IF EXISTS "Event organizers can view orders for their events only" ON public.orders;

CREATE POLICY "Event organizers can view orders for their events only"
ON public.orders
FOR SELECT
USING (
  (select auth.uid()) IS NOT NULL
  AND event_id IN (
    SELECT e.id
    FROM public.events e
    JOIN public.organizations o ON e.organization_id = o.id
    WHERE o.user_id = (select auth.uid())
  )
);

-- Drop and recreate the UPDATE policy with optimized auth.uid() calls
DROP POLICY IF EXISTS "Event organizers can update their event orders" ON public.orders;

CREATE POLICY "Event organizers can update their event orders"
ON public.orders
FOR UPDATE
USING (
  (select auth.uid()) IS NOT NULL
  AND event_id IN (
    SELECT e.id
    FROM public.events e
    JOIN public.organizations o ON e.organization_id = o.id
    WHERE o.user_id = (select auth.uid())
  )
);

-- Add comment explaining the performance optimization
COMMENT ON POLICY "Event organizers can view orders for their events only" ON public.orders IS
'Optimized RLS policy that wraps auth.uid() in subquery to prevent per-row re-evaluation';

COMMENT ON POLICY "Event organizers can update their event orders" ON public.orders IS
'Optimized RLS policy that wraps auth.uid() in subquery to prevent per-row re-evaluation';
