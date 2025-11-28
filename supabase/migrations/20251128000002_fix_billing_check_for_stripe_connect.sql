-- Fix check_billing_setup to handle Stripe Connect with booking fees enabled
-- If organization has Stripe Connect with booking fees passed to customer, they don't need billing card
-- Windcave organizations and Stripe without booking fees still need valid billing card

CREATE OR REPLACE FUNCTION public.check_billing_setup(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  has_payment_method boolean := false;
  has_stripe_connect_with_fees boolean := false;
BEGIN
  -- Check if organization has Stripe Connect with booking fees enabled
  -- If so, fees are passed to customer and org doesn't need billing card
  SELECT EXISTS(
    SELECT 1
    FROM public.organizations o
    WHERE o.id = p_organization_id
    AND o.stripe_account_id IS NOT NULL
    AND o.stripe_booking_fee_enabled = true
  ) INTO has_stripe_connect_with_fees;

  -- If Stripe Connect with booking fees enabled, billing is not required
  IF has_stripe_connect_with_fees THEN
    RETURN true;
  END IF;

  -- Otherwise, check if organization has valid billing setup (credit card on file)
  -- This applies to:
  -- 1. Windcave organizations (must have billing card)
  -- 2. Stripe without Connect (must have billing card)
  -- 3. Stripe Connect without booking fees enabled (must have billing card)
  SELECT EXISTS(
    SELECT 1
    FROM public.billing_customers bc
    WHERE bc.organization_id = p_organization_id
    AND bc.billing_status = 'active'
    AND bc.payment_method_id IS NOT NULL
  ) INTO has_payment_method;

  RETURN has_payment_method;
END;
$function$;

-- Add comment explaining the logic
COMMENT ON FUNCTION public.check_billing_setup(uuid) IS
'Checks if organization can publish events based on billing setup.
Returns true if:
1. Organization has Stripe Connect with booking fees enabled (fees passed to customer), OR
2. Organization has active billing customer with valid payment method (credit card)
Windcave organizations must have a valid credit card since fees cannot be passed to customer.';
