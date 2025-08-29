-- Fix Apple Pay and Google Pay configuration in public payment config function
-- Run this SQL in your Supabase SQL editor to fix the issue where Apple Pay/Google Pay toggles don't work

-- Update the get_public_payment_config function to include the enable flags
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

-- Verify the function was updated
SELECT 
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_public_payment_config';

-- Test the function with a sample event ID (replace with an actual event ID from your database)
-- SELECT * FROM get_public_payment_config('your-event-id-here');
