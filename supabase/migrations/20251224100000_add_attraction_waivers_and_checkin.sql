-- Migration: Add waiver support for attractions and check-in tracking
-- This enables:
-- 1. Waivers to be configured per attraction (in addition to events)
-- 2. Waiver timing configuration (online, at_checkin, or both)
-- 3. Check-in tracking for attraction bookings
-- 4. RPC function to get attraction bookings for a date

-- ============================================
-- PART 1: Add attraction support to waiver_templates
-- ============================================

-- Add attraction_id column to waiver_templates
ALTER TABLE waiver_templates
ADD COLUMN IF NOT EXISTS attraction_id UUID REFERENCES attractions(id) ON DELETE CASCADE;

-- Add waiver_timing to control when waiver is collected
ALTER TABLE waiver_templates
ADD COLUMN IF NOT EXISTS waiver_timing TEXT DEFAULT 'at_checkin'
  CHECK (waiver_timing IN ('online', 'at_checkin', 'both'));

-- Create index for attraction lookups
CREATE INDEX IF NOT EXISTS idx_waiver_templates_attraction ON waiver_templates(attraction_id);

-- ============================================
-- PART 2: Add attraction support to waiver_signatures
-- ============================================

-- Add attraction_id column
ALTER TABLE waiver_signatures
ADD COLUMN IF NOT EXISTS attraction_id UUID REFERENCES attractions(id) ON DELETE CASCADE;

-- Add booking_id column for attraction bookings
ALTER TABLE waiver_signatures
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES attraction_bookings(id) ON DELETE CASCADE;

-- Make ticket_id and event_id nullable (they're required for events, but attractions use booking_id)
ALTER TABLE waiver_signatures ALTER COLUMN ticket_id DROP NOT NULL;
ALTER TABLE waiver_signatures ALTER COLUMN event_id DROP NOT NULL;

-- Drop the existing unique constraint if it exists
ALTER TABLE waiver_signatures DROP CONSTRAINT IF EXISTS waiver_signatures_ticket_id_waiver_template_id_key;

-- Add constraint: must have either (event_id, ticket_id) OR (attraction_id, booking_id)
ALTER TABLE waiver_signatures DROP CONSTRAINT IF EXISTS waiver_source_check;
ALTER TABLE waiver_signatures ADD CONSTRAINT waiver_source_check
CHECK (
  (event_id IS NOT NULL AND ticket_id IS NOT NULL) OR
  (attraction_id IS NOT NULL AND booking_id IS NOT NULL)
);

-- Create unique constraint for attraction waivers (one signature per booking per waiver)
CREATE UNIQUE INDEX IF NOT EXISTS idx_waiver_signatures_booking_unique
ON waiver_signatures(booking_id, waiver_template_id)
WHERE booking_id IS NOT NULL;

-- Keep unique constraint for event waivers
CREATE UNIQUE INDEX IF NOT EXISTS idx_waiver_signatures_ticket_unique
ON waiver_signatures(ticket_id, waiver_template_id)
WHERE ticket_id IS NOT NULL;

-- Create indexes for attraction lookups
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_attraction ON waiver_signatures(attraction_id);
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_booking ON waiver_signatures(booking_id);

-- ============================================
-- PART 3: Add check-in tracking to attraction_bookings
-- ============================================

-- Add check-in timestamp
ALTER TABLE attraction_bookings
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Add who checked in the guest
ALTER TABLE attraction_bookings
ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES auth.users(id);

-- Create index for check-in queries
CREATE INDEX IF NOT EXISTS idx_attraction_bookings_checked_in ON attraction_bookings(checked_in_at)
WHERE checked_in_at IS NOT NULL;

-- ============================================
-- PART 4: RPC function to get attraction bookings for a date
-- ============================================

CREATE OR REPLACE FUNCTION get_attraction_bookings_for_date(
  p_attraction_id UUID,
  p_date DATE
)
RETURNS TABLE (
  booking_id UUID,
  booking_reference TEXT,
  booking_status TEXT,
  payment_status TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  party_size INTEGER,
  total_amount NUMERIC,
  slot_start_time TIMESTAMPTZ,
  slot_end_time TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID,
  waiver_signed BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ab.id AS booking_id,
    ab.booking_reference,
    ab.booking_status,
    ab.payment_status,
    ab.customer_name,
    ab.customer_email,
    ab.customer_phone,
    ab.party_size,
    ab.total_amount,
    bs.start_time AS slot_start_time,
    bs.end_time AS slot_end_time,
    ab.checked_in_at,
    ab.checked_in_by,
    EXISTS (
      SELECT 1 FROM waiver_signatures ws
      WHERE ws.booking_id = ab.id
    ) AS waiver_signed,
    ab.created_at
  FROM attraction_bookings ab
  LEFT JOIN booking_slots bs ON ab.booking_slot_id = bs.id
  WHERE ab.attraction_id = p_attraction_id
    AND DATE(bs.start_time AT TIME ZONE 'UTC') = p_date
  ORDER BY bs.start_time, ab.customer_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_attraction_bookings_for_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_attraction_bookings_for_date(UUID, DATE) TO anon;

-- ============================================
-- PART 5: RPC function to check in an attraction guest
-- ============================================

CREATE OR REPLACE FUNCTION check_in_attraction_guest(
  p_booking_id UUID,
  p_checked_in_by UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  booking_reference TEXT,
  customer_name TEXT
) AS $$
DECLARE
  v_booking RECORD;
BEGIN
  -- Get the booking
  SELECT * INTO v_booking
  FROM attraction_bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Booking not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if already checked in
  IF v_booking.checked_in_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'Guest already checked in'::TEXT, v_booking.booking_reference, v_booking.customer_name;
    RETURN;
  END IF;

  -- Check booking status
  IF v_booking.booking_status != 'confirmed' THEN
    RETURN QUERY SELECT FALSE, ('Booking status is ' || v_booking.booking_status)::TEXT, v_booking.booking_reference, v_booking.customer_name;
    RETURN;
  END IF;

  -- Perform check-in
  UPDATE attraction_bookings
  SET
    checked_in_at = NOW(),
    checked_in_by = COALESCE(p_checked_in_by, auth.uid()),
    booking_status = 'checked_in'
  WHERE id = p_booking_id;

  RETURN QUERY SELECT TRUE, 'Guest checked in successfully'::TEXT, v_booking.booking_reference, v_booking.customer_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_in_attraction_guest(UUID, UUID) TO authenticated;

-- ============================================
-- PART 6: Update RLS policies for attraction waivers
-- ============================================

-- Update waiver_templates select policy to include attractions
DROP POLICY IF EXISTS "Organization members can view waiver templates" ON waiver_templates;
CREATE POLICY "Organization members can view waiver templates"
    ON waiver_templates
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE user_id = auth.uid()
        )
        OR
        -- Also allow viewing attraction waivers by attraction organization
        attraction_id IN (
            SELECT a.id FROM attractions a
            WHERE a.organization_id IN (
                SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                UNION
                SELECT id FROM organizations WHERE user_id = auth.uid()
            )
        )
    );

-- Update waiver_templates insert policy
DROP POLICY IF EXISTS "Organization members can create waiver templates" ON waiver_templates;
CREATE POLICY "Organization members can create waiver templates"
    ON waiver_templates
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE user_id = auth.uid()
        )
    );

-- Update waiver_templates update policy
DROP POLICY IF EXISTS "Organization members can update waiver templates" ON waiver_templates;
CREATE POLICY "Organization members can update waiver templates"
    ON waiver_templates
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE user_id = auth.uid()
        )
    );

-- Update waiver_templates delete policy
DROP POLICY IF EXISTS "Organization members can delete waiver templates" ON waiver_templates;
CREATE POLICY "Organization members can delete waiver templates"
    ON waiver_templates
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE user_id = auth.uid()
        )
    );

-- Update waiver_signatures select policy to include attraction waivers
DROP POLICY IF EXISTS "Organization members can view waiver signatures" ON waiver_signatures;
CREATE POLICY "Organization members can view waiver signatures"
    ON waiver_signatures
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE user_id = auth.uid()
        )
    );

-- Ensure anyone can still create waiver signatures (for check-in flow)
-- This policy should already exist from the original migration
