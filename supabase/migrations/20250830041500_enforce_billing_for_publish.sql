-- Enforce that events can only be published when billing is active
-- and the organization has a valid payment method on file.

-- Policy for UPDATE: publishing (status -> 'published') must require active billing
CREATE POLICY IF NOT EXISTS "Require billing to publish events (update)"
ON public.events
FOR UPDATE TO authenticated
WITH CHECK (
  -- If not publishing, allow
  (status <> 'published')
  OR EXISTS (
    SELECT 1
    FROM public.billing_customers bc
    WHERE bc.organization_id = events.organization_id
      AND bc.billing_status = 'active'
      AND bc.payment_method_id IS NOT NULL
  )
);

-- Policy for INSERT: inserting directly as published must also require active billing
CREATE POLICY IF NOT EXISTS "Require billing to publish events (insert)"
ON public.events
FOR INSERT TO authenticated
WITH CHECK (
  -- If not publishing, allow
  (status <> 'published')
  OR EXISTS (
    SELECT 1
    FROM public.billing_customers bc
    WHERE bc.organization_id = events.organization_id
      AND bc.billing_status = 'active'
      AND bc.payment_method_id IS NOT NULL
  )
);


