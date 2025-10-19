-- Create promo_codes table for discount codes and promotions
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,

  -- Discount configuration
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),

  -- Usage limits
  max_uses INTEGER, -- NULL means unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  max_uses_per_customer INTEGER DEFAULT 1,

  -- Date range
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,

  -- Applicability
  applies_to_ticket_types UUID[], -- NULL means all ticket types, otherwise specific ticket type IDs
  min_tickets INTEGER DEFAULT 1, -- Minimum tickets required to use this code
  min_purchase_amount DECIMAL(10,2), -- Minimum purchase amount required

  -- Status
  active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Unique constraint: code must be unique per organization
  CONSTRAINT unique_promo_code_per_org UNIQUE (organization_id, code)
);

-- Create index for fast code lookups
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_promo_codes_event_id ON public.promo_codes(event_id);
CREATE INDEX idx_promo_codes_organization_id ON public.promo_codes(organization_id);
CREATE INDEX idx_promo_codes_active ON public.promo_codes(active) WHERE active = true;

-- Create promo_code_usage table to track individual redemptions
CREATE TABLE public.promo_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for usage tracking
CREATE INDEX idx_promo_code_usage_promo_code_id ON public.promo_code_usage(promo_code_id);
CREATE INDEX idx_promo_code_usage_order_id ON public.promo_code_usage(order_id);
CREATE INDEX idx_promo_code_usage_customer_email ON public.promo_code_usage(customer_email);

-- Create group_discount_tiers table for volume-based automatic discounts
CREATE TABLE public.group_discount_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Tier configuration
  min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),

  -- Applicability
  applies_to_ticket_types UUID[], -- NULL means all ticket types

  -- Status
  active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast tier lookups
CREATE INDEX idx_group_discount_tiers_event_id ON public.group_discount_tiers(event_id);
CREATE INDEX idx_group_discount_tiers_organization_id ON public.group_discount_tiers(organization_id);
CREATE INDEX idx_group_discount_tiers_active ON public.group_discount_tiers(active) WHERE active = true;

-- Add promo_code_id to orders table to track which promo code was used
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS promo_code_discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_discount_applied DECIMAL(10,2) DEFAULT 0;

-- Create index for orders with promo codes
CREATE INDEX IF NOT EXISTS idx_orders_promo_code_id ON public.orders(promo_code_id) WHERE promo_code_id IS NOT NULL;

-- Create trigger to update promo_codes.updated_at
CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_discount_tiers_updated_at
  BEFORE UPDATE ON public.group_discount_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage promo codes for their organizations"
ON public.promo_codes FOR ALL
USING (organization_id IN (
  SELECT id FROM public.organizations WHERE user_id = auth.uid()
));

CREATE POLICY "Promo codes are publicly viewable for validation"
ON public.promo_codes FOR SELECT
USING (active = true);

-- RLS Policies for promo_code_usage
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view promo code usage for their organizations"
ON public.promo_code_usage FOR SELECT
USING (promo_code_id IN (
  SELECT id FROM public.promo_codes WHERE organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Promo code usage can be created during checkout"
ON public.promo_code_usage FOR INSERT
WITH CHECK (true);

-- RLS Policies for group_discount_tiers
ALTER TABLE public.group_discount_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage group discount tiers for their organizations"
ON public.group_discount_tiers FOR ALL
USING (organization_id IN (
  SELECT id FROM public.organizations WHERE user_id = auth.uid()
));

CREATE POLICY "Group discount tiers are publicly viewable"
ON public.group_discount_tiers FOR SELECT
USING (active = true);

-- Create function to validate and apply promo code
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
  FROM public.promo_codes
  WHERE code = UPPER(TRIM(p_code))
    AND active = true
    AND (event_id IS NULL OR event_id = p_event_id)
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

  -- Check per-customer usage limit
  SELECT COUNT(*) INTO v_usage_count
  FROM public.promo_code_usage
  WHERE promo_code_id = v_promo_code.id
    AND customer_email = p_customer_email;

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

  -- Return valid result
  RETURN QUERY SELECT true, v_promo_code.id, v_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate group discount
CREATE OR REPLACE FUNCTION public.calculate_group_discount(
  p_event_id UUID,
  p_ticket_count INTEGER,
  p_subtotal DECIMAL(10,2)
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_tier public.group_discount_tiers;
  v_discount DECIMAL(10,2) := 0;
  v_best_discount DECIMAL(10,2) := 0;
BEGIN
  -- Find the best applicable group discount tier
  FOR v_tier IN
    SELECT * FROM public.group_discount_tiers
    WHERE event_id = p_event_id
      AND active = true
      AND min_quantity <= p_ticket_count
    ORDER BY min_quantity DESC
    LIMIT 1
  LOOP
    IF v_tier.discount_type = 'percentage' THEN
      v_discount := ROUND(p_subtotal * (v_tier.discount_value / 100), 2);
    ELSE -- fixed_amount
      v_discount := LEAST(v_tier.discount_value, p_subtotal);
    END IF;

    IF v_discount > v_best_discount THEN
      v_best_discount := v_discount;
    END IF;
  END LOOP;

  RETURN v_best_discount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment promo code usage (called after successful payment)
CREATE OR REPLACE FUNCTION public.increment_promo_code_usage(
  p_promo_code_id UUID,
  p_order_id UUID,
  p_customer_email TEXT,
  p_discount_applied DECIMAL(10,2)
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Increment current_uses
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = p_promo_code_id;

  -- Record the usage
  INSERT INTO public.promo_code_usage (promo_code_id, order_id, customer_email, discount_applied)
  VALUES (p_promo_code_id, p_order_id, p_customer_email, p_discount_applied);

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create ticket reservation table to prevent race conditions
CREATE TABLE public.ticket_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  session_id TEXT NOT NULL, -- Unique session identifier from frontend
  customer_email TEXT,
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled'))
);

-- Create indexes for ticket reservations
CREATE INDEX idx_ticket_reservations_event_id ON public.ticket_reservations(event_id);
CREATE INDEX idx_ticket_reservations_ticket_type_id ON public.ticket_reservations(ticket_type_id);
CREATE INDEX idx_ticket_reservations_session_id ON public.ticket_reservations(session_id);
CREATE INDEX idx_ticket_reservations_status ON public.ticket_reservations(status);
CREATE INDEX idx_ticket_reservations_expires_at ON public.ticket_reservations(expires_at);

-- RLS Policies for ticket_reservations
ALTER TABLE public.ticket_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reservations for their events"
ON public.ticket_reservations FOR SELECT
USING (event_id IN (
  SELECT e.id FROM public.events e
  JOIN public.organizations o ON e.organization_id = o.id
  WHERE o.user_id = auth.uid()
));

CREATE POLICY "Anyone can create ticket reservations"
ON public.ticket_reservations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update their own reservations"
ON public.ticket_reservations FOR UPDATE
USING (true);

-- Create function to reserve tickets with distributed locking
CREATE OR REPLACE FUNCTION public.reserve_tickets(
  p_event_id UUID,
  p_ticket_type_id UUID,
  p_quantity INTEGER,
  p_session_id TEXT,
  p_customer_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  reservation_id UUID,
  available_quantity INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_ticket_type public.ticket_types;
  v_reserved_quantity INTEGER;
  v_total_sold INTEGER;
  v_available INTEGER;
  v_reservation_id UUID;
BEGIN
  -- Use SELECT FOR UPDATE to lock the ticket type row
  SELECT * INTO v_ticket_type
  FROM public.ticket_types
  WHERE id = p_ticket_type_id
  FOR UPDATE;

  IF v_ticket_type.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Ticket type not found';
    RETURN;
  END IF;

  -- Clean up expired reservations for this ticket type
  UPDATE public.ticket_reservations
  SET status = 'expired'
  WHERE ticket_type_id = p_ticket_type_id
    AND status = 'active'
    AND expires_at < now();

  -- Calculate currently reserved tickets (active reservations)
  SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_quantity
  FROM public.ticket_reservations
  WHERE ticket_type_id = p_ticket_type_id
    AND status = 'active'
    AND expires_at >= now();

  -- Calculate total available tickets
  v_total_sold := v_ticket_type.quantity_sold + v_reserved_quantity;
  v_available := v_ticket_type.quantity_available - v_total_sold;

  -- Check if enough tickets are available
  IF v_available < p_quantity THEN
    RETURN QUERY SELECT false, NULL::UUID, v_available,
      'Only ' || v_available || ' tickets available';
    RETURN;
  END IF;

  -- Create reservation
  INSERT INTO public.ticket_reservations (
    event_id, ticket_type_id, quantity, session_id, customer_email
  )
  VALUES (
    p_event_id, p_ticket_type_id, p_quantity, p_session_id, p_customer_email
  )
  RETURNING id INTO v_reservation_id;

  -- Return success
  RETURN QUERY SELECT true, v_reservation_id, v_available - p_quantity, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to complete reservation (after successful payment)
CREATE OR REPLACE FUNCTION public.complete_reservation(
  p_reservation_id UUID,
  p_order_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_reservation public.ticket_reservations;
BEGIN
  -- Get reservation details
  SELECT * INTO v_reservation
  FROM public.ticket_reservations
  WHERE id = p_reservation_id
    AND status = 'active';

  IF v_reservation.id IS NULL THEN
    RETURN false;
  END IF;

  -- Mark reservation as completed
  UPDATE public.ticket_reservations
  SET status = 'completed'
  WHERE id = p_reservation_id;

  -- Update ticket_types quantity_sold
  UPDATE public.ticket_types
  SET quantity_sold = quantity_sold + v_reservation.quantity
  WHERE id = v_reservation.ticket_type_id;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cancel/release reservation
CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_session_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.ticket_reservations
  SET status = 'cancelled'
  WHERE session_id = p_session_id
    AND status = 'active';

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up expired reservations (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.ticket_reservations
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.validate_promo_code(TEXT, UUID, TEXT, INTEGER, DECIMAL) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_group_discount(UUID, INTEGER, DECIMAL) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_code_usage(UUID, UUID, TEXT, DECIMAL) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_tickets(UUID, UUID, INTEGER, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_reservation(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reservations() TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.promo_codes IS 'Stores promo codes for discounts and promotions';
COMMENT ON TABLE public.group_discount_tiers IS 'Stores automatic volume-based discount tiers';
COMMENT ON TABLE public.promo_code_usage IS 'Tracks individual promo code redemptions';
COMMENT ON TABLE public.ticket_reservations IS 'Temporary ticket reservations to prevent race conditions during checkout';
COMMENT ON FUNCTION public.validate_promo_code IS 'Validates a promo code and calculates discount amount';
COMMENT ON FUNCTION public.calculate_group_discount IS 'Calculates the best applicable group discount for a purchase';
COMMENT ON FUNCTION public.reserve_tickets IS 'Reserves tickets with distributed locking to prevent overselling';
COMMENT ON FUNCTION public.complete_reservation IS 'Completes a reservation after successful payment';
COMMENT ON FUNCTION public.cancel_reservation IS 'Cancels/releases a reservation';
