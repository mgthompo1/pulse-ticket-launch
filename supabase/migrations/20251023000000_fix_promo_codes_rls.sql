-- Fix RLS policy for promo_codes to allow INSERT operations
-- The original policy only had USING clause which doesn't work for INSERT

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can manage promo codes for their organizations" ON public.promo_codes;

-- Create separate policies for better control
CREATE POLICY "Users can view promo codes for their organizations"
ON public.promo_codes FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert promo codes for their organizations"
ON public.promo_codes FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update promo codes for their organizations"
ON public.promo_codes FOR UPDATE
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete promo codes for their organizations"
ON public.promo_codes FOR DELETE
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
);

-- Also fix group_discount_tiers policy with the same issue
DROP POLICY IF EXISTS "Users can manage group discount tiers for their organizations" ON public.group_discount_tiers;

CREATE POLICY "Users can view group discount tiers for their organizations"
ON public.group_discount_tiers FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert group discount tiers for their organizations"
ON public.group_discount_tiers FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update group discount tiers for their organizations"
ON public.group_discount_tiers FOR UPDATE
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete group discount tiers for their organizations"
ON public.group_discount_tiers FOR DELETE
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
);
