-- Fix function search path security warnings

-- Update create_order_secure function to set search_path properly
CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_event_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_total_amount NUMERIC,
  p_custom_answers JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_order_id UUID;
  v_event_status TEXT;
BEGIN
  -- Verify event is published
  SELECT status INTO v_event_status
  FROM public.events
  WHERE id = p_event_id;
  
  IF v_event_status != 'published' THEN
    RAISE EXCEPTION 'Cannot create order for unpublished event';
  END IF;
  
  -- Create the order
  INSERT INTO public.orders (
    event_id,
    customer_name,
    customer_email,
    customer_phone,
    total_amount,
    custom_answers,
    status
  ) VALUES (
    p_event_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_total_amount,
    p_custom_answers,
    'pending'
  ) RETURNING id INTO v_order_id;
  
  -- Log the order creation for security audit
  INSERT INTO public.security_audit_log (
    event_type,
    event_data
  ) VALUES (
    'order_created',
    jsonb_build_object(
      'order_id', v_order_id,
      'event_id', p_event_id,
      'amount', p_total_amount
    )
  );
  
  RETURN v_order_id;
END;
$$;

-- Update check_billing_setup function to fix search_path
CREATE OR REPLACE FUNCTION public.check_billing_setup(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;