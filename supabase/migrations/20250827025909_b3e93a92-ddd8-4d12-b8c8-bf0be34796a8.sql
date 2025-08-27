-- Create a public function to get payment config for published events
CREATE OR REPLACE FUNCTION public.get_public_payment_config(p_event_id uuid)
RETURNS TABLE(
  payment_provider text,
  stripe_publishable_key text,
  windcave_enabled boolean,
  windcave_endpoint text,
  apple_pay_merchant_id text,
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
    o.currency,
    pc.credit_card_processing_fee_percentage
  FROM events e
  JOIN organizations o ON e.organization_id = o.id
  LEFT JOIN payment_credentials pc ON o.id = pc.organization_id
  WHERE e.id = p_event_id 
    AND e.status = 'published';
END;
$$;

-- Create a public function to get widget customization for published events
CREATE OR REPLACE FUNCTION public.get_public_widget_customization(p_event_id uuid)
RETURNS TABLE(
  widget_customization jsonb,
  ticket_customization jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return customization data for published events
  RETURN QUERY
  SELECT 
    e.widget_customization,
    e.ticket_customization
  FROM events e
  WHERE e.id = p_event_id 
    AND e.status = 'published';
END;
$$;

-- Fix RLS policy to allow organization members to update events
DROP POLICY IF EXISTS "Users can update their organization's events" ON public.events;

CREATE POLICY "Organization members can update their organization's events" 
ON public.events FOR UPDATE 
USING (
  organization_id IN (
    SELECT o.id FROM public.organizations o 
    WHERE o.user_id = auth.uid()  -- Organization owner
    UNION
    SELECT ou.organization_id FROM public.organization_users ou 
    WHERE ou.user_id = auth.uid()  -- Organization members
  )
);