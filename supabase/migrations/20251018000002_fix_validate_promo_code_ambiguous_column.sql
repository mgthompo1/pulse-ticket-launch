-- Fix ambiguous column reference in validate_promo_code function
-- The issue is that both the RETURN TABLE and the promo_code_usage table have a column named "promo_code_id"
-- PostgreSQL doesn't know which one we're referring to, so we need to qualify them properly

DROP FUNCTION IF EXISTS public.validate_promo_code(TEXT, UUID, TEXT, INTEGER, DECIMAL);

CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code TEXT,
  p_event_id UUID,
  p_customer_email TEXT,
  p_ticket_count INTEGER,
  p_subtotal DECIMAL(10,2)
)
RETURNS TABLE (
  valid BOOLEAN,
  promo_code_id UUID,
  discount_amount DECIMAL(10,2),
  error_message TEXT
) AS $$
DECLARE
  v_promo_code public.promo_codes;
  v_usage_count INTEGER;
  v_discount DECIMAL(10,2);
BEGIN
  -- Find the promo code
  SELECT * INTO v_promo_code
  FROM public.promo_codes pc
  WHERE pc.code = UPPER(TRIM(p_code))
    AND pc.active = true
    AND (pc.event_id IS NULL OR pc.event_id = p_event_id)
    AND pc.valid_from <= now()
    AND (pc.valid_until IS NULL OR pc.valid_until >= now());

  -- Check if promo code exists
  IF v_promo_code.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(10,2), 'Invalid or expired promo code';
    RETURN;
  END IF;

  -- Check max uses
  IF v_promo_code.max_uses IS NOT NULL AND v_promo_code.current_uses >= v_promo_code.max_uses THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(10,2), 'This promo code has reached its usage limit';
    RETURN;
  END IF;

  -- Check per-customer usage limit (using table alias to avoid ambiguity)
  SELECT COUNT(*) INTO v_usage_count
  FROM public.promo_code_usage pcu
  WHERE pcu.promo_code_id = v_promo_code.id
    AND pcu.customer_email = p_customer_email;

  IF v_promo_code.max_uses_per_customer IS NOT NULL
    AND v_usage_count >= v_promo_code.max_uses_per_customer THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(10,2), 'You have already used this promo code';
    RETURN;
  END IF;

  -- Check minimum tickets
  IF v_promo_code.min_tickets IS NOT NULL AND p_ticket_count < v_promo_code.min_tickets THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(10,2),
      'This promo code requires a minimum of ' || v_promo_code.min_tickets || ' tickets';
    RETURN;
  END IF;

  -- Check minimum purchase amount
  IF v_promo_code.min_purchase_amount IS NOT NULL AND p_subtotal < v_promo_code.min_purchase_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(10,2),
      'This promo code requires a minimum purchase of $' || v_promo_code.min_purchase_amount;
    RETURN;
  END IF;

  -- Calculate discount
  IF v_promo_code.discount_type = 'percentage' THEN
    v_discount := ROUND(p_subtotal * (v_promo_code.discount_value / 100), 2);
  ELSE -- fixed_amount
    v_discount := LEAST(v_promo_code.discount_value, p_subtotal);
  END IF;

  -- Return valid result (v_promo_code.id is unambiguous since it's from the variable)
  RETURN QUERY SELECT true, v_promo_code.id, v_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
