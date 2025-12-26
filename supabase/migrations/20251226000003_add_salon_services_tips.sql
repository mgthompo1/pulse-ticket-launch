-- ============================================================================
-- Multi-Vertical Booking System - Phase 3: Salon Services, Staff Schedules, Tips
-- For hair salons, spas, and other service-based businesses
-- ============================================================================

-- 1. Service Catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS salon_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,  -- 'haircut', 'color', 'treatment', 'styling', etc.

  -- Duration & Pricing
  base_duration INTEGER NOT NULL,  -- minutes
  base_price DECIMAL(10,2) NOT NULL,

  -- Variable duration/pricing based on factors
  variable_duration BOOLEAN DEFAULT false,
  variable_pricing JSONB DEFAULT '{}',  -- e.g., {"short": {"duration": 30, "price": 40}, "long": {"duration": 60, "price": 80}}

  -- Options
  options JSONB DEFAULT '[]',  -- e.g., [{"name": "Hair Length", "choices": ["Short", "Medium", "Long"]}]

  -- Buffer time
  buffer_before INTEGER DEFAULT 0,  -- minutes before for prep
  buffer_after INTEGER DEFAULT 0,   -- minutes after for cleanup

  -- Booking settings
  requires_consultation BOOLEAN DEFAULT false,
  requires_patch_test BOOLEAN DEFAULT false,
  patch_test_hours INTEGER DEFAULT 48,  -- hours before service
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(10,2),
  deposit_type TEXT CHECK (deposit_type IN ('fixed', 'percentage')),

  -- Availability
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  availability_rules JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_salon_services_attraction ON salon_services(attraction_id, is_active);
CREATE INDEX IF NOT EXISTS idx_salon_services_category ON salon_services(attraction_id, category);

COMMENT ON TABLE salon_services IS 'Service catalog for salons, spas, etc.';

-- RLS
ALTER TABLE salon_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active services" ON salon_services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage services" ON salon_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = salon_services.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 2. Staff-Service Mapping (which staff can perform which services)
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES attraction_resources(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES salon_services(id) ON DELETE CASCADE,

  -- Optional overrides for this staff member
  price_override DECIMAL(10,2),
  duration_override INTEGER,

  -- Skill level
  skill_level TEXT CHECK (skill_level IN ('junior', 'standard', 'senior', 'specialist')),

  is_active BOOLEAN DEFAULT true,

  UNIQUE(resource_id, service_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_services_resource ON staff_services(resource_id, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_services_service ON staff_services(service_id);

-- RLS
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active staff services" ON staff_services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage staff services" ON staff_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attraction_resources ar
      JOIN attractions a ON a.id = ar.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE ar.id = staff_services.resource_id
      AND ou.user_id = auth.uid()
    )
  );

-- 3. Staff Schedules (weekly working hours)
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES attraction_resources(id) ON DELETE CASCADE,

  -- Day of week (0 = Sunday, 6 = Saturday)
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

  -- Working hours
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_working BOOLEAN DEFAULT true,

  -- Breaks
  break_start TIME,
  break_end TIME,

  -- Effective dates (for seasonal schedules)
  effective_from DATE,
  effective_until DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_schedules_resource ON staff_schedules(resource_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_effective ON staff_schedules(effective_from, effective_until);

COMMENT ON TABLE staff_schedules IS 'Weekly working hours for staff members';

-- RLS
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view schedules" ON staff_schedules
  FOR SELECT USING (true);

CREATE POLICY "Org members can manage schedules" ON staff_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attraction_resources ar
      JOIN attractions a ON a.id = ar.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE ar.id = staff_schedules.resource_id
      AND ou.user_id = auth.uid()
    )
  );

-- 4. Staff Time Off (vacation, sick days, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES attraction_resources(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,  -- NULL = all day
  end_time TIME,    -- NULL = all day

  reason TEXT,
  time_off_type TEXT DEFAULT 'vacation' CHECK (time_off_type IN ('vacation', 'sick', 'personal', 'training', 'other')),

  -- Approval workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Impact on existing bookings
  bookings_affected INTEGER DEFAULT 0,
  bookings_rescheduled INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_time_off_resource ON staff_time_off(resource_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates ON staff_time_off(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_status ON staff_time_off(status) WHERE status = 'approved';

-- RLS
ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own time off" ON staff_time_off
  FOR SELECT USING (true);  -- TODO: Restrict to own or org member

CREATE POLICY "Org members can manage time off" ON staff_time_off
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attraction_resources ar
      JOIN attractions a ON a.id = ar.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE ar.id = staff_time_off.resource_id
      AND ou.user_id = auth.uid()
    )
  );

-- 5. Add service to bookings
-- ============================================================================
ALTER TABLE attraction_bookings
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES salon_services(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS service_options JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip_percent INTEGER,
ADD COLUMN IF NOT EXISTS tip_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tip_staff_id UUID REFERENCES attraction_resources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_service ON attraction_bookings(service_id);

-- 6. Recurring Appointments
-- ============================================================================
CREATE TABLE IF NOT EXISTS recurring_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,

  -- Preferred settings
  resource_id UUID REFERENCES attraction_resources(id) ON DELETE SET NULL,
  service_id UUID REFERENCES salon_services(id) ON DELETE SET NULL,

  -- Recurrence pattern
  recurrence_pattern TEXT NOT NULL CHECK (recurrence_pattern IN ('weekly', 'biweekly', 'every_3_weeks', 'monthly', 'every_6_weeks', 'every_8_weeks', 'quarterly')),
  preferred_day_of_week INTEGER CHECK (preferred_day_of_week >= 0 AND preferred_day_of_week <= 6),
  preferred_time TIME NOT NULL,

  -- Duration
  duration_minutes INTEGER NOT NULL,

  -- Auto-booking settings
  auto_book BOOLEAN DEFAULT false,
  auto_book_days_ahead INTEGER DEFAULT 14,  -- Days before to auto-create booking
  send_reminders BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3,

  -- Notes
  notes TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_scheduled_at TIMESTAMPTZ,
  next_booking_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_attraction ON recurring_appointments(attraction_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_client ON recurring_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_appointments(next_booking_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_resource ON recurring_appointments(resource_id);

COMMENT ON TABLE recurring_appointments IS 'Recurring appointment templates for repeat clients';

-- RLS
ALTER TABLE recurring_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own recurring" ON recurring_appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = recurring_appointments.client_id
      AND LOWER(cp.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Org members can manage recurring" ON recurring_appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = recurring_appointments.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 7. Link bookings to recurring appointments
-- ============================================================================
ALTER TABLE attraction_bookings
ADD COLUMN IF NOT EXISTS recurring_appointment_id UUID REFERENCES recurring_appointments(id) ON DELETE SET NULL;

-- 8. Function to check staff availability
-- ============================================================================
CREATE OR REPLACE FUNCTION is_staff_available(
  p_resource_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_schedule staff_schedules;
  v_has_time_off BOOLEAN;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  -- Check regular schedule
  SELECT * INTO v_schedule
  FROM staff_schedules
  WHERE resource_id = p_resource_id
    AND day_of_week = v_day_of_week
    AND is_working = true
    AND (effective_from IS NULL OR effective_from <= p_date)
    AND (effective_until IS NULL OR effective_until >= p_date)
  ORDER BY effective_from DESC NULLS LAST
  LIMIT 1;

  -- No schedule found or not working
  IF v_schedule.id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if requested time is within working hours
  IF p_start_time < v_schedule.start_time OR p_end_time > v_schedule.end_time THEN
    RETURN false;
  END IF;

  -- Check if requested time overlaps with break
  IF v_schedule.break_start IS NOT NULL AND v_schedule.break_end IS NOT NULL THEN
    IF p_start_time < v_schedule.break_end AND p_end_time > v_schedule.break_start THEN
      RETURN false;
    END IF;
  END IF;

  -- Check for approved time off
  SELECT EXISTS(
    SELECT 1 FROM staff_time_off
    WHERE resource_id = p_resource_id
      AND status = 'approved'
      AND p_date BETWEEN start_date AND end_date
      AND (
        start_time IS NULL  -- All day time off
        OR (p_start_time < COALESCE(end_time, '23:59') AND p_end_time > COALESCE(start_time, '00:00'))
      )
  ) INTO v_has_time_off;

  IF v_has_time_off THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Function to get service duration and price for a staff member
-- ============================================================================
CREATE OR REPLACE FUNCTION get_service_details_for_staff(
  p_service_id UUID,
  p_resource_id UUID
)
RETURNS TABLE (
  duration INTEGER,
  price DECIMAL,
  skill_level TEXT
) AS $$
DECLARE
  v_service salon_services;
  v_staff_service staff_services;
BEGIN
  SELECT * INTO v_service FROM salon_services WHERE id = p_service_id;
  SELECT * INTO v_staff_service FROM staff_services
  WHERE service_id = p_service_id AND resource_id = p_resource_id;

  RETURN QUERY SELECT
    COALESCE(v_staff_service.duration_override, v_service.base_duration),
    COALESCE(v_staff_service.price_override, v_service.base_price),
    v_staff_service.skill_level;
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. Function to calculate next recurring booking date
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_next_recurring_date(
  p_recurrence_pattern TEXT,
  p_last_date DATE,
  p_preferred_day INTEGER
)
RETURNS DATE AS $$
DECLARE
  v_next_date DATE;
  v_interval INTERVAL;
BEGIN
  -- Calculate base interval
  CASE p_recurrence_pattern
    WHEN 'weekly' THEN v_interval := INTERVAL '1 week';
    WHEN 'biweekly' THEN v_interval := INTERVAL '2 weeks';
    WHEN 'every_3_weeks' THEN v_interval := INTERVAL '3 weeks';
    WHEN 'monthly' THEN v_interval := INTERVAL '1 month';
    WHEN 'every_6_weeks' THEN v_interval := INTERVAL '6 weeks';
    WHEN 'every_8_weeks' THEN v_interval := INTERVAL '8 weeks';
    WHEN 'quarterly' THEN v_interval := INTERVAL '3 months';
    ELSE v_interval := INTERVAL '1 month';
  END CASE;

  v_next_date := p_last_date + v_interval;

  -- Adjust to preferred day of week if specified
  IF p_preferred_day IS NOT NULL THEN
    WHILE EXTRACT(DOW FROM v_next_date)::INTEGER != p_preferred_day LOOP
      v_next_date := v_next_date + INTERVAL '1 day';
    END LOOP;
  END IF;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 11. Function to update client stats with tip
-- ============================================================================
CREATE OR REPLACE FUNCTION update_client_stats_with_tip()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tip_amount IS NOT NULL AND NEW.tip_amount > 0 AND NEW.client_id IS NOT NULL THEN
    UPDATE client_attraction_stats
    SET
      total_spent = total_spent + NEW.tip_amount,
      updated_at = NOW()
    WHERE client_id = NEW.client_id
      AND attraction_id = NEW.attraction_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_client_stats_tip_trigger ON attraction_bookings;
CREATE TRIGGER update_client_stats_tip_trigger
  AFTER UPDATE ON attraction_bookings
  FOR EACH ROW
  WHEN (OLD.tip_amount IS DISTINCT FROM NEW.tip_amount)
  EXECUTE FUNCTION update_client_stats_with_tip();
