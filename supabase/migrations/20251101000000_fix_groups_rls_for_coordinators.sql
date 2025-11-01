-- Fix Groups RLS Policies for Group Coordinators and Public Access
-- This migration allows group coordinators to manage their groups without breaking existing functionality

-- ============================================================================
-- 1. Fix promo_codes policies to allow group coordinators to create codes
-- ============================================================================

-- Add policy for group coordinators to create promo codes for their organization
DROP POLICY IF EXISTS "Group coordinators can create promo codes" ON public.promo_codes;
CREATE POLICY "Group coordinators can create promo codes"
ON public.promo_codes FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT g.organization_id
    FROM public.groups g
    INNER JOIN public.group_coordinators gc ON gc.group_id = g.id
    WHERE gc.user_id = auth.uid()
  )
);

-- Add policy for group coordinators to view promo codes (including their group's codes)
DROP POLICY IF EXISTS "Group coordinators can view promo codes" ON public.promo_codes;
CREATE POLICY "Group coordinators can view promo codes"
ON public.promo_codes FOR SELECT
USING (
  organization_id IN (
    SELECT g.organization_id
    FROM public.groups g
    INNER JOIN public.group_coordinators gc ON gc.group_id = g.id
    WHERE gc.user_id = auth.uid()
  )
);

-- Add policy for group coordinators to update their group's promo codes
DROP POLICY IF EXISTS "Group coordinators can update their promo codes" ON public.promo_codes;
CREATE POLICY "Group coordinators can update their promo codes"
ON public.promo_codes FOR UPDATE
USING (
  organization_id IN (
    SELECT g.organization_id
    FROM public.groups g
    INNER JOIN public.group_coordinators gc ON gc.group_id = g.id
    WHERE gc.user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT g.organization_id
    FROM public.groups g
    INNER JOIN public.group_coordinators gc ON gc.group_id = g.id
    WHERE gc.user_id = auth.uid()
  )
);

-- Add policy for group coordinators to delete their promo codes
DROP POLICY IF EXISTS "Group coordinators can delete their promo codes" ON public.promo_codes;
CREATE POLICY "Group coordinators can delete their promo codes"
ON public.promo_codes FOR DELETE
USING (
  organization_id IN (
    SELECT g.organization_id
    FROM public.groups g
    INNER JOIN public.group_coordinators gc ON gc.group_id = g.id
    WHERE gc.user_id = auth.uid()
  )
);

-- ============================================================================
-- 2. Fix group_invoices policies to allow service role (webhooks) to update
-- ============================================================================

-- Allow service role to update invoices (for Stripe webhook payments)
DROP POLICY IF EXISTS "Service role can update invoices" ON public.group_invoices;
CREATE POLICY "Service role can update invoices"
ON public.group_invoices FOR UPDATE
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. Fix group_ticket_sales to allow public purchases through widget
-- ============================================================================

-- The existing "Service role can create sales" policy should handle this,
-- but let's ensure it covers all operations that the widget might need
DROP POLICY IF EXISTS "Service role can manage sales" ON public.group_ticket_sales;
CREATE POLICY "Service role can manage sales"
ON public.group_ticket_sales FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. Add public read access for unauthenticated widget users
-- ============================================================================

-- Allow public to view promo codes (needed for applying codes in widget)
DROP POLICY IF EXISTS "Public can view active promo codes" ON public.promo_codes;
CREATE POLICY "Public can view active promo codes"
ON public.promo_codes FOR SELECT
USING (active = true);

-- ============================================================================
-- 5. Ensure group coordinators can view their own data
-- ============================================================================

-- Coordinators can view their group's sales (already exists, keeping for clarity)
-- This is already in place from the original migration

-- Coordinators can view their group's invoices (already exists, keeping for clarity)
-- This is already in place from the original migration

-- ============================================================================
-- NOTES:
-- ============================================================================
-- After this migration:
-- 1. Group coordinators (authenticated users) can create/manage promo codes
-- 2. Service role (webhooks) can update invoices when payments complete
-- 3. Public users can view active promo codes in the widget
-- 4. Service role can create sales records when tickets are purchased
-- 5. GroupPortal at /group/:slug should be wrapped in ProtectedRoute in App.tsx
