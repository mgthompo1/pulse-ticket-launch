-- Fix security vulnerability in orders table RLS policies
-- Ensure customer data is properly protected and only accessible to authorized users

-- Drop the overly permissive INSERT policy that allows anyone to create orders
DROP POLICY IF EXISTS "Orders can be created by anyone" ON public.orders;

-- Create a more secure INSERT policy that only allows creating orders for published events
CREATE POLICY "Orders can be created for published events only" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  event_id IN (
    SELECT id 
    FROM public.events 
    WHERE status = 'published'
  )
);

-- Drop the existing SELECT policy and replace with a more secure one
DROP POLICY IF EXISTS "Users can view orders for their events" ON public.orders;

-- Create a more restrictive SELECT policy that ensures only event organizers can access customer data
CREATE POLICY "Event organizers can view orders for their events only" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND event_id IN (
    SELECT e.id
    FROM public.events e
    JOIN public.organizations o ON e.organization_id = o.id
    WHERE o.user_id = auth.uid()
  )
);

-- Update the UPDATE policy to be more explicit about authorization
DROP POLICY IF EXISTS "Orders can be updated by event organizers" ON public.orders;

CREATE POLICY "Event organizers can update their event orders" 
ON public.orders 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND event_id IN (
    SELECT e.id
    FROM public.events e
    JOIN public.organizations o ON e.organization_id = o.id
    WHERE o.user_id = auth.uid()
  )
);

-- Create a secure function for payment processing that doesn't expose customer data
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
SET search_path = public
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

-- Grant execute permission to authenticated users for the secure function
GRANT EXECUTE ON FUNCTION public.create_order_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_secure TO anon;