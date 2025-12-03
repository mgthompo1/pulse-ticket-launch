-- Migration: Ticket Lifecycle Features
-- Features: Waitlist, Ticket Transfers, Self-Service Refunds, Ticket Upgrades, Vouchers/Credits, Recurring Events

-- ============================================
-- SECTION 1: WAITLIST SYSTEM
-- ============================================

-- Waitlist entries table
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN (
    'waiting',      -- Actively waiting
    'offered',      -- Ticket offered, awaiting response
    'converted',    -- Successfully purchased
    'expired',      -- Offer expired
    'cancelled'     -- User cancelled
  )),
  offer_sent_at TIMESTAMPTZ,
  offer_expires_at TIMESTAMPTZ,
  offer_token TEXT UNIQUE,
  converted_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  position INTEGER,  -- Position in queue (auto-calculated)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waitlist settings on events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS waitlist_message TEXT,
ADD COLUMN IF NOT EXISTS waitlist_offer_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS waitlist_auto_offer BOOLEAN DEFAULT true;

-- Index for efficient waitlist queries
CREATE INDEX IF NOT EXISTS idx_waitlist_event ON waitlist_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_entries(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_offer_token ON waitlist_entries(offer_token);

-- ============================================
-- SECTION 2: TICKET TRANSFERS
-- ============================================

-- Ticket transfer requests
CREATE TABLE IF NOT EXISTS ticket_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Original holder
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,

  -- New holder
  to_email TEXT NOT NULL,
  to_name TEXT NOT NULL,
  to_phone TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Transfer initiated, awaiting acceptance
    'accepted',     -- New holder accepted
    'declined',     -- New holder declined
    'completed',    -- Transfer complete
    'cancelled',    -- Original holder cancelled
    'expired'       -- Accept link expired
  )),

  transfer_token TEXT UNIQUE NOT NULL,
  accept_url TEXT,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- New ticket info (after transfer)
  new_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  new_ticket_code TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfer settings on events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS transfers_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS transfer_deadline_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS transfer_fee NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transfer_fee_type TEXT DEFAULT 'fixed' CHECK (transfer_fee_type IN ('fixed', 'percentage'));

-- Index for transfer lookups
CREATE INDEX IF NOT EXISTS idx_transfers_ticket ON ticket_transfers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_transfers_event ON ticket_transfers(event_id);
CREATE INDEX IF NOT EXISTS idx_transfers_token ON ticket_transfers(transfer_token);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON ticket_transfers(status);

-- ============================================
-- SECTION 3: REFUND SYSTEM
-- ============================================

-- Refund requests table
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Requester info
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,

  -- What's being refunded
  refund_type TEXT NOT NULL CHECK (refund_type IN (
    'full',         -- Full order refund
    'partial',      -- Specific tickets only
    'ticket'        -- Single ticket
  )),
  ticket_ids UUID[],  -- Array of ticket IDs if partial

  -- Amounts
  requested_amount NUMERIC(10,2) NOT NULL,
  approved_amount NUMERIC(10,2),
  refund_method TEXT CHECK (refund_method IN (
    'original_payment',  -- Back to card
    'voucher',           -- Store credit
    'bank_transfer'      -- Manual bank transfer
  )),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',       -- Awaiting review
    'approved',      -- Approved, processing
    'processed',     -- Refund completed
    'rejected',      -- Request denied
    'cancelled'      -- Requester cancelled
  )),

  -- Reason and notes
  reason TEXT NOT NULL,
  reason_category TEXT CHECK (reason_category IN (
    'cannot_attend',
    'event_cancelled',
    'event_changed',
    'duplicate_purchase',
    'wrong_tickets',
    'other'
  )),
  customer_notes TEXT,
  admin_notes TEXT,

  -- Processing
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  stripe_refund_id TEXT,
  voucher_id UUID,  -- If refunded to voucher

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refund policy settings on events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS refund_policy TEXT DEFAULT 'no_refunds' CHECK (refund_policy IN (
  'no_refunds',           -- No refunds allowed
  'full_refund',          -- Full refund anytime
  'deadline_based',       -- Refund until X hours before
  'tiered',               -- Different amounts at different times
  'request_only'          -- Manual approval required
)),
ADD COLUMN IF NOT EXISTS refund_deadline_hours INTEGER DEFAULT 48,
ADD COLUMN IF NOT EXISTS refund_percentage INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS refund_to_voucher_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS refund_policy_text TEXT;

-- Index for refund queries
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_event ON refund_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refunds_email ON refund_requests(customer_email);

-- ============================================
-- SECTION 4: TICKET UPGRADES
-- ============================================

-- Ticket upgrade requests
CREATE TABLE IF NOT EXISTS ticket_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Customer
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,

  -- Ticket type change
  from_ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  to_ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,

  -- Pricing
  original_price NUMERIC(10,2) NOT NULL,
  new_price NUMERIC(10,2) NOT NULL,
  price_difference NUMERIC(10,2) NOT NULL,
  upgrade_fee NUMERIC(10,2) DEFAULT 0,
  total_to_pay NUMERIC(10,2) NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',        -- Awaiting payment
    'paid',           -- Payment received
    'completed',      -- Upgrade complete
    'cancelled',      -- Cancelled
    'failed'          -- Payment failed
  )),

  -- Payment
  stripe_payment_intent_id TEXT,
  payment_url TEXT,
  payment_token TEXT UNIQUE,

  -- New ticket info
  new_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  new_ticket_code TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Upgrade settings on events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS upgrades_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS upgrade_deadline_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS upgrade_fee NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS upgrade_fee_type TEXT DEFAULT 'fixed' CHECK (upgrade_fee_type IN ('fixed', 'percentage'));

-- Upgrade paths - which ticket types can upgrade to which
CREATE TABLE IF NOT EXISTS ticket_upgrade_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  to_ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  custom_fee NUMERIC(10,2),  -- Override event-level fee
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, from_ticket_type_id, to_ticket_type_id)
);

-- Index for upgrade queries
CREATE INDEX IF NOT EXISTS idx_upgrades_ticket ON ticket_upgrades(ticket_id);
CREATE INDEX IF NOT EXISTS idx_upgrades_event ON ticket_upgrades(event_id);
CREATE INDEX IF NOT EXISTS idx_upgrades_status ON ticket_upgrades(status);
CREATE INDEX IF NOT EXISTS idx_upgrade_paths_event ON ticket_upgrade_paths(event_id);

-- ============================================
-- SECTION 5: VOUCHERS/CREDITS SYSTEM
-- ============================================

-- Vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Voucher details
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'credit',         -- Store credit (fixed amount)
    'percentage',     -- Percentage discount
    'free_ticket'     -- Free ticket(s)
  )),

  -- Value
  original_value NUMERIC(10,2) NOT NULL,
  remaining_value NUMERIC(10,2) NOT NULL,
  percentage_value INTEGER,  -- For percentage type
  free_ticket_count INTEGER, -- For free_ticket type

  -- Restrictions
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,  -- Null = all events
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL,
  min_purchase_amount NUMERIC(10,2),
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,

  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Owner
  customer_email TEXT,
  customer_name TEXT,

  -- Source tracking
  source TEXT CHECK (source IN (
    'refund',         -- Created from refund
    'compensation',   -- Customer service
    'promotion',      -- Marketing
    'gift',           -- Gift voucher purchase
    'reward',         -- Loyalty reward
    'manual'          -- Manual creation
  )),
  source_refund_id UUID REFERENCES refund_requests(id) ON DELETE SET NULL,
  source_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'used',
    'expired',
    'cancelled'
  )),

  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, code)
);

-- Voucher usage tracking
CREATE TABLE IF NOT EXISTS voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount_used NUMERIC(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add voucher reference to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS voucher_discount NUMERIC(10,2) DEFAULT 0;

-- Index for voucher queries
CREATE INDEX IF NOT EXISTS idx_vouchers_org ON vouchers(organization_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_email ON vouchers(customer_email);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher ON voucher_usage(voucher_id);

-- ============================================
-- SECTION 6: RECURRING EVENTS
-- ============================================

-- Event series (parent container for recurring events)
CREATE TABLE IF NOT EXISTS event_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Series info
  name TEXT NOT NULL,
  description TEXT,

  -- Recurrence pattern
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN (
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'custom'
  )),
  recurrence_interval INTEGER DEFAULT 1,  -- Every X days/weeks/months
  recurrence_days INTEGER[],  -- For weekly: [0=Sun, 1=Mon, ..., 6=Sat]
  recurrence_day_of_month INTEGER,  -- For monthly: 1-31
  recurrence_week_of_month INTEGER, -- For monthly: 1-5 (5=last)

  -- Date boundaries
  series_start_date DATE NOT NULL,
  series_end_date DATE,
  max_occurrences INTEGER,

  -- Template settings (copied to child events)
  template_venue TEXT,
  template_capacity INTEGER DEFAULT 100,
  template_description TEXT,
  template_logo_url TEXT,
  template_widget_customization JSONB,
  template_ticket_types JSONB,  -- Array of ticket type templates

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'paused',
    'completed',
    'cancelled'
  )),

  -- Auto-generation settings
  auto_generate_events BOOLEAN DEFAULT true,
  generate_ahead_days INTEGER DEFAULT 30,  -- Generate events X days ahead

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link events to series
ALTER TABLE events
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES event_series(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS series_occurrence_number INTEGER,
ADD COLUMN IF NOT EXISTS is_series_template BOOLEAN DEFAULT false;

-- Series passes (buy once, attend multiple)
CREATE TABLE IF NOT EXISTS series_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES event_series(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,

  -- Pass type
  pass_type TEXT NOT NULL CHECK (pass_type IN (
    'unlimited',      -- Attend all events in series
    'fixed_count',    -- Attend X events
    'date_range'      -- Attend any events in date range
  )),

  -- Limits based on pass_type
  event_count INTEGER,  -- For fixed_count
  valid_from DATE,
  valid_until DATE,

  -- Availability
  quantity_available INTEGER,
  quantity_sold INTEGER DEFAULT 0,

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold_out', 'expired', 'disabled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Series pass purchases
CREATE TABLE IF NOT EXISTS series_pass_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_pass_id UUID NOT NULL REFERENCES series_passes(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,

  -- Usage tracking
  events_attended INTEGER DEFAULT 0,
  events_remaining INTEGER,  -- For fixed_count passes

  -- Pass code
  pass_code TEXT UNIQUE NOT NULL,

  status TEXT DEFAULT 'active' CHECK (status IN (
    'active',
    'used',       -- All uses consumed
    'expired',
    'cancelled'
  )),

  valid_from DATE,
  valid_until DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which events a pass holder has attended
CREATE TABLE IF NOT EXISTS series_pass_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_holder_id UUID NOT NULL REFERENCES series_pass_holders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(pass_holder_id, event_id)
);

-- Indexes for recurring events
CREATE INDEX IF NOT EXISTS idx_event_series_org ON event_series(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_series ON events(series_id);
CREATE INDEX IF NOT EXISTS idx_series_passes_series ON series_passes(series_id);
CREATE INDEX IF NOT EXISTS idx_pass_holders_email ON series_pass_holders(customer_email);
CREATE INDEX IF NOT EXISTS idx_pass_holders_code ON series_pass_holders(pass_code);
CREATE INDEX IF NOT EXISTS idx_pass_checkins_holder ON series_pass_checkins(pass_holder_id);

-- ============================================
-- SECTION 7: RLS POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_upgrade_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_pass_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_pass_checkins ENABLE ROW LEVEL SECURITY;

-- Waitlist policies
CREATE POLICY "Users can view waitlist for their org events" ON waitlist_entries
  FOR SELECT USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN organization_users ou ON e.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage waitlist for their org events" ON waitlist_entries
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN organization_users ou ON e.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Public can join waitlist
CREATE POLICY "Public can join waitlist" ON waitlist_entries
  FOR INSERT WITH CHECK (true);

-- Transfer policies
CREATE POLICY "Users can view transfers for their org events" ON ticket_transfers
  FOR SELECT USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN organization_users ou ON e.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage transfers for their org events" ON ticket_transfers
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN organization_users ou ON e.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Refund policies
CREATE POLICY "Users can view refunds for their org events" ON refund_requests
  FOR SELECT USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN organization_users ou ON e.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage refunds for their org events" ON refund_requests
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN organization_users ou ON e.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Public can request refunds
CREATE POLICY "Public can request refunds" ON refund_requests
  FOR INSERT WITH CHECK (true);

-- Upgrade policies
CREATE POLICY "Users can view upgrades for their org events" ON ticket_upgrades
  FOR SELECT USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN organization_users ou ON e.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage upgrades for their org events" ON ticket_upgrades
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN organization_users ou ON e.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Upgrade paths policies
CREATE POLICY "Users can manage upgrade paths for their org events" ON ticket_upgrade_paths
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN organization_users ou ON e.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Voucher policies
CREATE POLICY "Users can view vouchers for their org" ON vouchers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage vouchers for their org" ON vouchers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Voucher usage policies
CREATE POLICY "Users can view voucher usage for their org" ON voucher_usage
  FOR SELECT USING (
    voucher_id IN (
      SELECT v.id FROM vouchers v
      JOIN organization_users ou ON v.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Event series policies
CREATE POLICY "Users can view series for their org" ON event_series
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage series for their org" ON event_series
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Series passes policies
CREATE POLICY "Users can manage series passes" ON series_passes
  FOR ALL USING (
    series_id IN (
      SELECT es.id FROM event_series es
      JOIN organization_users ou ON es.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Series pass holders policies
CREATE POLICY "Users can view pass holders for their org" ON series_pass_holders
  FOR SELECT USING (
    series_pass_id IN (
      SELECT sp.id FROM series_passes sp
      JOIN event_series es ON sp.series_id = es.id
      JOIN organization_users ou ON es.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Series pass checkins policies
CREATE POLICY "Users can manage pass checkins" ON series_pass_checkins
  FOR ALL USING (
    pass_holder_id IN (
      SELECT sph.id FROM series_pass_holders sph
      JOIN series_passes sp ON sph.series_pass_id = sp.id
      JOIN event_series es ON sp.series_id = es.id
      JOIN organization_users ou ON es.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- ============================================
-- SECTION 8: HELPER FUNCTIONS
-- ============================================

-- Function to process waitlist when tickets become available
CREATE OR REPLACE FUNCTION process_waitlist_offers(p_event_id UUID, p_ticket_type_id UUID, p_available_count INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_offered_count INTEGER := 0;
  v_entry RECORD;
  v_offer_hours INTEGER;
BEGIN
  -- Get offer duration from event
  SELECT waitlist_offer_hours INTO v_offer_hours
  FROM events WHERE id = p_event_id;

  v_offer_hours := COALESCE(v_offer_hours, 24);

  -- Find waiting entries and offer tickets
  FOR v_entry IN
    SELECT * FROM waitlist_entries
    WHERE event_id = p_event_id
      AND (ticket_type_id = p_ticket_type_id OR ticket_type_id IS NULL)
      AND status = 'waiting'
    ORDER BY position NULLS LAST, created_at
    LIMIT p_available_count
  LOOP
    UPDATE waitlist_entries
    SET
      status = 'offered',
      offer_sent_at = NOW(),
      offer_expires_at = NOW() + (v_offer_hours || ' hours')::INTERVAL,
      offer_token = encode(gen_random_bytes(32), 'hex'),
      updated_at = NOW()
    WHERE id = v_entry.id;

    v_offered_count := v_offered_count + 1;
  END LOOP;

  RETURN v_offered_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate voucher code
CREATE OR REPLACE FUNCTION generate_voucher_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := upper(substring(encode(gen_random_bytes(6), 'hex') from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM vouchers WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create voucher from refund
CREATE OR REPLACE FUNCTION create_refund_voucher(
  p_refund_id UUID,
  p_organization_id UUID,
  p_amount NUMERIC,
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_valid_days INTEGER DEFAULT 365
)
RETURNS UUID AS $$
DECLARE
  v_voucher_id UUID;
  v_code TEXT;
BEGIN
  v_code := generate_voucher_code();

  INSERT INTO vouchers (
    organization_id,
    code,
    type,
    original_value,
    remaining_value,
    customer_email,
    customer_name,
    source,
    source_refund_id,
    valid_until,
    status
  ) VALUES (
    p_organization_id,
    v_code,
    'credit',
    p_amount,
    p_amount,
    p_customer_email,
    p_customer_name,
    'refund',
    p_refund_id,
    NOW() + (p_valid_days || ' days')::INTERVAL,
    'active'
  ) RETURNING id INTO v_voucher_id;

  RETURN v_voucher_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate series events
CREATE OR REPLACE FUNCTION generate_series_events(p_series_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_series RECORD;
  v_current_date DATE;
  v_events_created INTEGER := 0;
  v_occurrence INTEGER;
  v_event_id UUID;
BEGIN
  SELECT * INTO v_series FROM event_series WHERE id = p_series_id;

  IF v_series IS NULL OR v_series.status != 'active' THEN
    RETURN 0;
  END IF;

  -- Get next occurrence number
  SELECT COALESCE(MAX(series_occurrence_number), 0) + 1 INTO v_occurrence
  FROM events WHERE series_id = p_series_id;

  -- Generate events up to generate_ahead_days
  v_current_date := GREATEST(v_series.series_start_date, CURRENT_DATE);

  WHILE v_current_date <= CURRENT_DATE + v_series.generate_ahead_days
    AND (v_series.series_end_date IS NULL OR v_current_date <= v_series.series_end_date)
    AND (v_series.max_occurrences IS NULL OR v_occurrence <= v_series.max_occurrences)
  LOOP
    -- Check if event for this date already exists
    IF NOT EXISTS (
      SELECT 1 FROM events
      WHERE series_id = p_series_id
      AND DATE(event_date) = v_current_date
    ) THEN
      -- Create the event
      INSERT INTO events (
        organization_id,
        series_id,
        series_occurrence_number,
        name,
        description,
        venue,
        capacity,
        event_date,
        logo_url,
        widget_customization,
        status
      ) VALUES (
        v_series.organization_id,
        p_series_id,
        v_occurrence,
        v_series.name || ' #' || v_occurrence,
        COALESCE(v_series.template_description, v_series.description),
        v_series.template_venue,
        COALESCE(v_series.template_capacity, 100),
        v_current_date::TIMESTAMPTZ,
        v_series.template_logo_url,
        v_series.template_widget_customization,
        'draft'
      ) RETURNING id INTO v_event_id;

      v_events_created := v_events_created + 1;
      v_occurrence := v_occurrence + 1;
    END IF;

    -- Move to next date based on recurrence type
    CASE v_series.recurrence_type
      WHEN 'daily' THEN
        v_current_date := v_current_date + v_series.recurrence_interval;
      WHEN 'weekly' THEN
        v_current_date := v_current_date + (v_series.recurrence_interval * 7);
      WHEN 'biweekly' THEN
        v_current_date := v_current_date + 14;
      WHEN 'monthly' THEN
        v_current_date := v_current_date + (v_series.recurrence_interval || ' months')::INTERVAL;
      ELSE
        v_current_date := v_current_date + 7; -- Default weekly
    END CASE;
  END LOOP;

  RETURN v_events_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 9: TRIGGERS
-- ============================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waitlist_entries_updated_at
  BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_transfers_updated_at
  BEFORE UPDATE ON ticket_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refund_requests_updated_at
  BEFORE UPDATE ON refund_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_upgrades_updated_at
  BEFORE UPDATE ON ticket_upgrades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_series_updated_at
  BEFORE UPDATE ON event_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_series_passes_updated_at
  BEFORE UPDATE ON series_passes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_series_pass_holders_updated_at
  BEFORE UPDATE ON series_pass_holders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE waitlist_entries IS 'Waitlist entries for sold-out events or ticket types';
COMMENT ON TABLE ticket_transfers IS 'Ticket transfer requests between attendees';
COMMENT ON TABLE refund_requests IS 'Refund requests from customers';
COMMENT ON TABLE ticket_upgrades IS 'Ticket upgrade requests (e.g., GA to VIP)';
COMMENT ON TABLE vouchers IS 'Store credits and vouchers';
COMMENT ON TABLE event_series IS 'Recurring event series definitions';
COMMENT ON TABLE series_passes IS 'Multi-event passes for series';
COMMENT ON TABLE series_pass_holders IS 'Customers who hold series passes';
