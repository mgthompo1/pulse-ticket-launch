-- =====================================================
-- PART 1: Add attraction support to promo_codes
-- =====================================================

-- Add attraction_id to promo_codes table
ALTER TABLE public.promo_codes
ADD COLUMN IF NOT EXISTS attraction_id UUID REFERENCES public.attractions(id) ON DELETE CASCADE;

-- Add index for attraction promo codes
CREATE INDEX IF NOT EXISTS idx_promo_codes_attraction_id ON public.promo_codes(attraction_id);

-- Add promo code tracking to attraction_bookings
ALTER TABLE public.attraction_bookings
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS promo_code_discount DECIMAL(10,2) DEFAULT 0;

-- Create index for bookings with promo codes
CREATE INDEX IF NOT EXISTS idx_attraction_bookings_promo_code_id
ON public.attraction_bookings(promo_code_id) WHERE promo_code_id IS NOT NULL;

-- Create function to validate attraction promo code
CREATE OR REPLACE FUNCTION public.validate_attraction_promo_code(
  p_code TEXT,
  p_attraction_id UUID,
  p_customer_email TEXT,
  p_party_size INTEGER,
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
  v_attraction public.attractions;
BEGIN
  -- Get attraction to find organization_id
  SELECT * INTO v_attraction FROM public.attractions WHERE id = p_attraction_id;

  IF v_attraction.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(10,2), 'Attraction not found';
    RETURN;
  END IF;

  -- Find the promo code (must match attraction OR be org-wide with no attraction_id)
  SELECT * INTO v_promo_code
  FROM public.promo_codes
  WHERE code = UPPER(TRIM(p_code))
    AND active = true
    AND organization_id = v_attraction.organization_id
    AND (attraction_id IS NULL OR attraction_id = p_attraction_id)
    AND (event_id IS NULL) -- Exclude event-specific codes
    AND valid_from <= now()
    AND (valid_until IS NULL OR valid_until >= now());

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

  -- Check per-customer usage limit (check attraction_bookings instead of promo_code_usage)
  SELECT COUNT(*) INTO v_usage_count
  FROM public.attraction_bookings
  WHERE promo_code_id = v_promo_code.id
    AND customer_email = p_customer_email
    AND booking_status != 'cancelled';

  IF v_promo_code.max_uses_per_customer IS NOT NULL
    AND v_usage_count >= v_promo_code.max_uses_per_customer THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(10,2), 'You have already used this promo code';
    RETURN;
  END IF;

  -- Check minimum party size (use min_tickets as min party size for attractions)
  IF v_promo_code.min_tickets IS NOT NULL AND p_party_size < v_promo_code.min_tickets THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(10,2),
      'This promo code requires a minimum of ' || v_promo_code.min_tickets || ' guests';
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

  -- Return valid result
  RETURN QUERY SELECT true, v_promo_code.id, v_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_attraction_promo_code(TEXT, UUID, TEXT, INTEGER, DECIMAL) TO anon, authenticated;

-- =====================================================
-- PART 2: Add atomic slot reservation to prevent race conditions
-- =====================================================

-- Create slot reservation table for attractions
CREATE TABLE IF NOT EXISTS public.attraction_slot_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attraction_id UUID NOT NULL REFERENCES public.attractions(id) ON DELETE CASCADE,
  booking_slot_id UUID NOT NULL REFERENCES public.booking_slots(id) ON DELETE CASCADE,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  session_id TEXT NOT NULL,
  customer_email TEXT,
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attraction_slot_reservations_slot ON public.attraction_slot_reservations(booking_slot_id);
CREATE INDEX IF NOT EXISTS idx_attraction_slot_reservations_session ON public.attraction_slot_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_attraction_slot_reservations_status ON public.attraction_slot_reservations(status);
CREATE INDEX IF NOT EXISTS idx_attraction_slot_reservations_expires ON public.attraction_slot_reservations(expires_at);

-- RLS policies
ALTER TABLE public.attraction_slot_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create slot reservations"
ON public.attraction_slot_reservations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view their own reservations"
ON public.attraction_slot_reservations FOR SELECT
USING (true);

CREATE POLICY "Anyone can update their own reservations"
ON public.attraction_slot_reservations FOR UPDATE
USING (true);

-- Create atomic slot reservation function with row-level locking
CREATE OR REPLACE FUNCTION public.reserve_attraction_slot(
  p_attraction_id UUID,
  p_booking_slot_id UUID,
  p_party_size INTEGER,
  p_session_id TEXT,
  p_customer_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  reservation_id UUID,
  available_capacity INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_slot public.booking_slots;
  v_reserved_capacity INTEGER;
  v_available INTEGER;
  v_reservation_id UUID;
BEGIN
  -- Use SELECT FOR UPDATE to lock the slot row
  SELECT * INTO v_slot
  FROM public.booking_slots
  WHERE id = p_booking_slot_id
    AND attraction_id = p_attraction_id
    AND status = 'available'
  FOR UPDATE;

  IF v_slot.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Slot not found or unavailable';
    RETURN;
  END IF;

  -- Clean up expired reservations for this slot
  UPDATE public.attraction_slot_reservations
  SET status = 'expired'
  WHERE booking_slot_id = p_booking_slot_id
    AND status = 'active'
    AND expires_at < now();

  -- Calculate currently reserved capacity (active reservations not yet completed)
  SELECT COALESCE(SUM(party_size), 0) INTO v_reserved_capacity
  FROM public.attraction_slot_reservations
  WHERE booking_slot_id = p_booking_slot_id
    AND status = 'active'
    AND expires_at >= now();

  -- Calculate available capacity
  v_available := v_slot.max_capacity - v_slot.current_bookings - v_reserved_capacity;

  -- Check if enough capacity
  IF v_available < p_party_size THEN
    RETURN QUERY SELECT false, NULL::UUID, v_available,
      CASE
        WHEN v_available <= 0 THEN 'This time slot is fully booked'
        ELSE 'Only ' || v_available || ' spots available in this time slot'
      END;
    RETURN;
  END IF;

  -- Create reservation
  INSERT INTO public.attraction_slot_reservations (
    attraction_id, booking_slot_id, party_size, session_id, customer_email
  )
  VALUES (
    p_attraction_id, p_booking_slot_id, p_party_size, p_session_id, p_customer_email
  )
  RETURNING id INTO v_reservation_id;

  -- Return success
  RETURN QUERY SELECT true, v_reservation_id, v_available - p_party_size, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to complete slot reservation (after successful payment)
CREATE OR REPLACE FUNCTION public.complete_attraction_reservation(
  p_reservation_id UUID,
  p_booking_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_reservation public.attraction_slot_reservations;
BEGIN
  -- Get reservation details
  SELECT * INTO v_reservation
  FROM public.attraction_slot_reservations
  WHERE id = p_reservation_id
    AND status = 'active';

  IF v_reservation.id IS NULL THEN
    RETURN false;
  END IF;

  -- Mark reservation as completed
  UPDATE public.attraction_slot_reservations
  SET status = 'completed'
  WHERE id = p_reservation_id;

  -- Update slot current_bookings
  UPDATE public.booking_slots
  SET current_bookings = current_bookings + v_reservation.party_size
  WHERE id = v_reservation.booking_slot_id;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cancel/release slot reservation
CREATE OR REPLACE FUNCTION public.cancel_attraction_reservation(
  p_session_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.attraction_slot_reservations
  SET status = 'cancelled'
  WHERE session_id = p_session_id
    AND status = 'active';

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reserve_attraction_slot(UUID, UUID, INTEGER, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_attraction_reservation(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_attraction_reservation(TEXT) TO anon, authenticated;

-- =====================================================
-- PART 3: Add refund tracking to attraction_bookings
-- =====================================================

-- Add refund columns to attraction_bookings
ALTER TABLE public.attraction_bookings
ADD COLUMN IF NOT EXISTS refund_status TEXT CHECK (refund_status IN ('none', 'partial', 'full')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES auth.users(id);

-- Create index for refund tracking
CREATE INDEX IF NOT EXISTS idx_attraction_bookings_refund_status
ON public.attraction_bookings(refund_status) WHERE refund_status != 'none';

-- =====================================================
-- PART 4: Cleanup function for expired reservations
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_attraction_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.attraction_slot_reservations
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_attraction_reservations() TO authenticated;

-- Add comments
COMMENT ON COLUMN public.promo_codes.attraction_id IS 'Optional: Link promo code to specific attraction';
COMMENT ON TABLE public.attraction_slot_reservations IS 'Temporary slot reservations to prevent race conditions during checkout';
COMMENT ON FUNCTION public.validate_attraction_promo_code IS 'Validates a promo code for attraction bookings';
COMMENT ON FUNCTION public.reserve_attraction_slot IS 'Reserves an attraction slot with distributed locking to prevent overbooking';
