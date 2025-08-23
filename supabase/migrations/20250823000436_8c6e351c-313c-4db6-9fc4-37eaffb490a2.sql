-- Fix the search path security issue for the new function
CREATE OR REPLACE FUNCTION public.check_billing_setup(p_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_payment_method boolean := false;
BEGIN
  -- Check if organization has valid billing setup
  SELECT EXISTS(
    SELECT 1 
    FROM public.billing_customers bc
    WHERE bc.organization_id = p_organization_id
    AND bc.billing_status = 'active'
    AND bc.payment_method_id IS NOT NULL
  ) INTO has_payment_method;
  
  RETURN has_payment_method;
END;
$$;