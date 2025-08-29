-- Add Apple Pay and Google Pay enable flags to public payment config function
-- This migration updates the get_public_payment_config function to return the enable flags
-- that are needed for the Apple Pay and Google Pay toggles to work in the ticket widget

CREATE OR REPLACE FUNCTION public.get_public_payment_config(p_event_id uuid)
RETURNS TABLE(
  payment_provider text,
  stripe_publishable_key text,
  windcave_enabled boolean,
  windcave_endpoint text,
  apple_pay_merchant_id text,
  enable_apple_pay boolean,
  enable_google_pay boolean,
  currency text,
  credit_card_processing_fee_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return payment config for published events
  RETURN QUERY
  SELECT 
    o.payment_provider,
    pc.stripe_publishable_key,
    pc.windcave_enabled,
    pc.windcave_endpoint,
    pc.apple_pay_merchant_id,
    pc.enable_apple_pay,
    pc.enable_google_pay,
    o.currency,
    pc.credit_card_processing_fee_percentage
  FROM events e
  JOIN organizations o ON e.organization_id = o.id
  LEFT JOIN payment_credentials pc ON o.id = pc.organization_id
  WHERE e.id = p_event_id 
    AND e.status = 'published';
END;
$$;
