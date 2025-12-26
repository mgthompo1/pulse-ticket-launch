-- Abandoned Cart Recovery System for Attractions
-- Tracks incomplete attraction bookings and enables recovery emails

-- Create attraction_abandoned_carts table
CREATE TABLE IF NOT EXISTS public.attraction_abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES public.attractions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Customer info captured during checkout
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,

  -- Cart contents
  booking_slot_id UUID REFERENCES public.booking_slots(id) ON DELETE SET NULL,
  party_size INTEGER NOT NULL DEFAULT 1,
  selected_addons JSONB DEFAULT '[]',
  cart_total DECIMAL(10,2) DEFAULT 0,
  promo_code TEXT,

  -- Slot details for email
  slot_date DATE,
  slot_start_time TIME,
  slot_end_time TIME,

  -- Tracking
  session_id TEXT,
  source_url TEXT,
  device_type TEXT,

  -- Recovery status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'email_sent', 'recovered', 'expired', 'unsubscribed')),
  emails_sent INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  recovered_booking_id UUID REFERENCES public.attraction_bookings(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Unique constraint
  UNIQUE(attraction_id, customer_email, session_id)
);

-- Create indexes
CREATE INDEX idx_attraction_abandoned_carts_attraction ON public.attraction_abandoned_carts(attraction_id);
CREATE INDEX idx_attraction_abandoned_carts_org ON public.attraction_abandoned_carts(organization_id);
CREATE INDEX idx_attraction_abandoned_carts_status ON public.attraction_abandoned_carts(status);
CREATE INDEX idx_attraction_abandoned_carts_email ON public.attraction_abandoned_carts(customer_email);
CREATE INDEX idx_attraction_abandoned_carts_created ON public.attraction_abandoned_carts(created_at);

-- Enable RLS
ALTER TABLE public.attraction_abandoned_carts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizations can view their attraction abandoned carts"
  ON public.attraction_abandoned_carts FOR SELECT
  USING (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert attraction abandoned carts"
  ON public.attraction_abandoned_carts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update attraction abandoned carts"
  ON public.attraction_abandoned_carts FOR UPDATE
  USING (true);

-- Add abandoned cart settings to attractions table
ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS abandoned_cart_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS abandoned_cart_delay_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS abandoned_cart_email_subject TEXT DEFAULT 'Complete your booking!',
ADD COLUMN IF NOT EXISTS abandoned_cart_email_content TEXT,
ADD COLUMN IF NOT EXISTS abandoned_cart_discount_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS abandoned_cart_discount_code TEXT,
ADD COLUMN IF NOT EXISTS abandoned_cart_discount_percent INTEGER DEFAULT 10;

-- Create function to mark attraction cart as recovered when booking is confirmed
CREATE OR REPLACE FUNCTION mark_attraction_cart_recovered()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on status change to confirmed
  IF NEW.booking_status = 'confirmed' AND (OLD.booking_status IS NULL OR OLD.booking_status != 'confirmed') THEN
    UPDATE public.attraction_abandoned_carts
    SET
      status = 'recovered',
      recovered_at = NOW(),
      recovered_booking_id = NEW.id,
      updated_at = NOW()
    WHERE
      attraction_id = NEW.attraction_id
      AND customer_email = NEW.customer_email
      AND status IN ('pending', 'email_sent');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_mark_attraction_cart_recovered ON public.attraction_bookings;
CREATE TRIGGER trigger_mark_attraction_cart_recovered
  AFTER INSERT OR UPDATE ON public.attraction_bookings
  FOR EACH ROW
  EXECUTE FUNCTION mark_attraction_cart_recovered();

-- Create function to capture abandoned cart when booking is left pending
CREATE OR REPLACE FUNCTION capture_attraction_abandoned_cart()
RETURNS TRIGGER AS $$
DECLARE
  v_slot RECORD;
  v_attraction RECORD;
BEGIN
  -- Only capture if booking is pending and abandoned cart is enabled
  IF NEW.booking_status = 'pending' THEN
    -- Get attraction settings
    SELECT * INTO v_attraction FROM public.attractions WHERE id = NEW.attraction_id;

    IF v_attraction.abandoned_cart_enabled THEN
      -- Get slot details
      SELECT
        start_time::date as slot_date,
        start_time::time as slot_start_time,
        end_time::time as slot_end_time
      INTO v_slot
      FROM public.booking_slots
      WHERE id = NEW.booking_slot_id;

      -- Insert or update abandoned cart
      INSERT INTO public.attraction_abandoned_carts (
        attraction_id,
        organization_id,
        customer_email,
        customer_name,
        customer_phone,
        booking_slot_id,
        party_size,
        cart_total,
        slot_date,
        slot_start_time,
        slot_end_time,
        session_id
      ) VALUES (
        NEW.attraction_id,
        NEW.organization_id,
        NEW.customer_email,
        NEW.customer_name,
        NEW.customer_phone,
        NEW.booking_slot_id,
        NEW.party_size,
        NEW.total_amount,
        v_slot.slot_date,
        v_slot.slot_start_time,
        v_slot.slot_end_time,
        'booking_' || NEW.id::text
      )
      ON CONFLICT (attraction_id, customer_email, session_id)
      DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        party_size = EXCLUDED.party_size,
        cart_total = EXCLUDED.cart_total,
        booking_slot_id = EXCLUDED.booking_slot_id,
        slot_date = EXCLUDED.slot_date,
        slot_start_time = EXCLUDED.slot_start_time,
        slot_end_time = EXCLUDED.slot_end_time,
        updated_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for capturing abandoned carts
DROP TRIGGER IF EXISTS trigger_capture_attraction_abandoned_cart ON public.attraction_bookings;
CREATE TRIGGER trigger_capture_attraction_abandoned_cart
  AFTER INSERT ON public.attraction_bookings
  FOR EACH ROW
  EXECUTE FUNCTION capture_attraction_abandoned_cart();

-- Add comment
COMMENT ON TABLE public.attraction_abandoned_carts IS 'Tracks incomplete attraction bookings for recovery email campaigns';

-- Add modification settings to attractions
ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS allow_modifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS modification_deadline_hours INTEGER DEFAULT 24;

COMMENT ON COLUMN public.attractions.allow_modifications IS 'Whether customers can modify their bookings';
COMMENT ON COLUMN public.attractions.modification_deadline_hours IS 'Hours before booking when modifications are no longer allowed';
