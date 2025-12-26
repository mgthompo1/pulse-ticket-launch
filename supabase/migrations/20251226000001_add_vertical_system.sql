-- ============================================================================
-- Multi-Vertical Booking System - Phase 1: Vertical System + Client Profiles
-- Supports golf, salon, spa, fitness, tours, rental verticals
-- ============================================================================

-- 1. Add vertical system to attractions
-- ============================================================================

-- Add vertical type and configuration to attractions
ALTER TABLE attractions
ADD COLUMN IF NOT EXISTS vertical_type TEXT DEFAULT 'general'
  CHECK (vertical_type IN ('general', 'golf', 'salon', 'fitness', 'tours', 'spa', 'rental')),
ADD COLUMN IF NOT EXISTS vertical_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS terminology JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS feature_overrides JSONB DEFAULT '{}';

-- Index for vertical filtering
CREATE INDEX IF NOT EXISTS idx_attractions_vertical ON attractions(vertical_type);

COMMENT ON COLUMN attractions.vertical_type IS 'Business vertical type - determines default behavior, UI, and terminology';
COMMENT ON COLUMN attractions.vertical_config IS 'Vertical-specific configuration (golf: tee intervals, salon: services, etc.)';
COMMENT ON COLUMN attractions.terminology IS 'Custom terminology overrides for this attraction';
COMMENT ON COLUMN attractions.feature_overrides IS 'Feature flag overrides - override vertical defaults';

-- 2. Vertical feature defaults table
-- ============================================================================
CREATE TABLE IF NOT EXISTS vertical_feature_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_type TEXT NOT NULL UNIQUE,
  features JSONB NOT NULL DEFAULT '{}',
  terminology JSONB NOT NULL DEFAULT '{}',
  default_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default feature configurations for each vertical
INSERT INTO vertical_feature_defaults (vertical_type, features, terminology, default_config)
VALUES
  ('general', '{
    "staffSelection": "optional",
    "serviceCatalog": false,
    "staffSchedules": false,
    "membershipPasses": false,
    "pricingTiers": false,
    "tipsEnabled": false,
    "productSales": false,
    "recurringBookings": false,
    "clientProfiles": false,
    "joinExisting": false,
    "variableDuration": false
  }', '{
    "booking": "Booking",
    "bookings": "Bookings",
    "resource": "Staff",
    "resources": "Staff",
    "customer": "Guest",
    "customers": "Guests",
    "partySize": "Party Size",
    "startTime": "Start Time",
    "duration": "Duration",
    "bookNow": "Book Now",
    "checkIn": "Check In"
  }', '{}'),

  ('golf', '{
    "staffSelection": "optional",
    "serviceCatalog": false,
    "staffSchedules": false,
    "membershipPasses": true,
    "pricingTiers": true,
    "tipsEnabled": false,
    "productSales": true,
    "recurringBookings": false,
    "clientProfiles": true,
    "joinExisting": true,
    "variableDuration": false
  }', '{
    "booking": "Tee Time",
    "bookings": "Tee Times",
    "resource": "Course",
    "resources": "Courses",
    "customer": "Player",
    "customers": "Players",
    "partySize": "Players",
    "startTime": "Tee Time",
    "duration": "Round Duration",
    "bookNow": "Book Tee Time",
    "checkIn": "Check In"
  }', '{
    "teeTimeInterval": 10,
    "defaultHoles": 18,
    "holesOptions": [9, 18],
    "maxPlayersPerTee": 4,
    "allowJoinExisting": true,
    "cartIncluded": false
  }'),

  ('salon', '{
    "staffSelection": "required",
    "serviceCatalog": true,
    "staffSchedules": true,
    "membershipPasses": false,
    "pricingTiers": false,
    "tipsEnabled": true,
    "productSales": true,
    "recurringBookings": true,
    "clientProfiles": true,
    "joinExisting": false,
    "variableDuration": true
  }', '{
    "booking": "Appointment",
    "bookings": "Appointments",
    "resource": "Stylist",
    "resources": "Stylists",
    "customer": "Client",
    "customers": "Clients",
    "partySize": "Guests",
    "startTime": "Appointment Time",
    "duration": "Service Duration",
    "bookNow": "Book Appointment",
    "checkIn": "Check In"
  }', '{
    "tipOptions": [15, 18, 20, 25],
    "defaultTipPercent": 18,
    "allowNoShow": true,
    "noShowFeePercent": 50,
    "requireDeposit": false,
    "depositPercent": 25
  }'),

  ('fitness', '{
    "staffSelection": "optional",
    "serviceCatalog": true,
    "staffSchedules": true,
    "membershipPasses": true,
    "pricingTiers": false,
    "tipsEnabled": false,
    "productSales": false,
    "recurringBookings": true,
    "clientProfiles": true,
    "joinExisting": true,
    "variableDuration": true
  }', '{
    "booking": "Class",
    "bookings": "Classes",
    "resource": "Instructor",
    "resources": "Instructors",
    "customer": "Member",
    "customers": "Members",
    "partySize": "Attendees",
    "startTime": "Class Time",
    "duration": "Class Duration",
    "bookNow": "Book Class",
    "checkIn": "Check In"
  }', '{
    "allowWaitlist": true,
    "waitlistMax": 5,
    "allowClassPass": true,
    "cancellationHours": 12
  }'),

  ('spa', '{
    "staffSelection": "optional",
    "serviceCatalog": true,
    "staffSchedules": true,
    "membershipPasses": true,
    "pricingTiers": false,
    "tipsEnabled": true,
    "productSales": true,
    "recurringBookings": true,
    "clientProfiles": true,
    "joinExisting": false,
    "variableDuration": true
  }', '{
    "booking": "Treatment",
    "bookings": "Treatments",
    "resource": "Therapist",
    "resources": "Therapists",
    "customer": "Guest",
    "customers": "Guests",
    "partySize": "Guests",
    "startTime": "Appointment Time",
    "duration": "Treatment Duration",
    "bookNow": "Book Treatment",
    "checkIn": "Check In"
  }', '{
    "tipOptions": [15, 18, 20, 25],
    "defaultTipPercent": 20,
    "bufferMinutes": 15,
    "couplesTreatments": true
  }'),

  ('tours', '{
    "staffSelection": "optional",
    "serviceCatalog": false,
    "staffSchedules": false,
    "membershipPasses": false,
    "pricingTiers": false,
    "tipsEnabled": false,
    "productSales": false,
    "recurringBookings": false,
    "clientProfiles": true,
    "joinExisting": true,
    "variableDuration": false
  }', '{
    "booking": "Tour",
    "bookings": "Tours",
    "resource": "Guide",
    "resources": "Guides",
    "customer": "Guest",
    "customers": "Guests",
    "partySize": "Group Size",
    "startTime": "Tour Time",
    "duration": "Tour Duration",
    "bookNow": "Book Tour",
    "checkIn": "Check In"
  }', '{
    "minGroupSize": 1,
    "privateToursAvailable": true,
    "childPricing": true
  }'),

  ('rental', '{
    "staffSelection": "none",
    "serviceCatalog": false,
    "staffSchedules": false,
    "membershipPasses": true,
    "pricingTiers": true,
    "tipsEnabled": false,
    "productSales": true,
    "recurringBookings": false,
    "clientProfiles": true,
    "joinExisting": false,
    "variableDuration": true
  }', '{
    "booking": "Rental",
    "bookings": "Rentals",
    "resource": "Equipment",
    "resources": "Equipment",
    "customer": "Renter",
    "customers": "Renters",
    "partySize": "Items",
    "startTime": "Pickup Time",
    "duration": "Rental Period",
    "bookNow": "Book Rental",
    "checkIn": "Pickup"
  }', '{
    "requireDeposit": true,
    "depositAmount": 100,
    "lateFeePerHour": 25,
    "requireID": true
  }')
ON CONFLICT (vertical_type) DO UPDATE SET
  features = EXCLUDED.features,
  terminology = EXCLUDED.terminology,
  default_config = EXCLUDED.default_config;

-- RLS for vertical_feature_defaults
ALTER TABLE vertical_feature_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vertical defaults" ON vertical_feature_defaults
  FOR SELECT USING (true);

-- 3. Client Profiles (shared across organization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  avatar_url TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  marketing_opt_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_profiles_org ON client_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_email ON client_profiles(email);
CREATE INDEX IF NOT EXISTS idx_client_profiles_phone ON client_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_client_profiles_name ON client_profiles(organization_id, last_name, first_name);

-- RLS
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view clients" ON client_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = client_profiles.organization_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage clients" ON client_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = client_profiles.organization_id
      AND ou.user_id = auth.uid()
    )
  );

-- 4. Client Stats per Attraction
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_attraction_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_no_shows INTEGER DEFAULT 0,
  total_cancellations INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  first_visit_at TIMESTAMPTZ,
  avg_party_size DECIMAL(3,1),
  preferred_staff_id UUID REFERENCES attraction_resources(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, attraction_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_stats_client ON client_attraction_stats(client_id);
CREATE INDEX IF NOT EXISTS idx_client_stats_attraction ON client_attraction_stats(attraction_id);
CREATE INDEX IF NOT EXISTS idx_client_stats_last_visit ON client_attraction_stats(last_visit_at DESC);

-- RLS
ALTER TABLE client_attraction_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view client stats" ON client_attraction_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = client_attraction_stats.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage client stats" ON client_attraction_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = client_attraction_stats.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 5. Link bookings to client profiles
-- ============================================================================
ALTER TABLE attraction_bookings
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client ON attraction_bookings(client_id);

-- 6. Function to auto-create/update client profile on booking
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_client_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_org_id UUID;
BEGIN
  -- Get organization ID from attraction
  SELECT organization_id INTO v_org_id
  FROM attractions
  WHERE id = NEW.attraction_id;

  -- Upsert client profile
  INSERT INTO client_profiles (organization_id, email, first_name, phone)
  VALUES (
    v_org_id,
    LOWER(TRIM(NEW.customer_email)),
    SPLIT_PART(NEW.customer_name, ' ', 1),
    NEW.customer_phone
  )
  ON CONFLICT (organization_id, email) DO UPDATE SET
    first_name = COALESCE(client_profiles.first_name, EXCLUDED.first_name),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), client_profiles.phone),
    updated_at = NOW()
  RETURNING id INTO v_client_id;

  -- Link booking to client
  NEW.client_id = v_client_id;

  -- Update or create stats
  INSERT INTO client_attraction_stats (client_id, attraction_id, total_bookings, total_spent, last_visit_at, first_visit_at)
  VALUES (v_client_id, NEW.attraction_id, 1, NEW.total_amount, NEW.created_at, NEW.created_at)
  ON CONFLICT (client_id, attraction_id) DO UPDATE SET
    total_bookings = client_attraction_stats.total_bookings + 1,
    total_spent = client_attraction_stats.total_spent + EXCLUDED.total_spent,
    last_visit_at = GREATEST(client_attraction_stats.last_visit_at, EXCLUDED.last_visit_at),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS upsert_client_on_booking_trigger ON attraction_bookings;
CREATE TRIGGER upsert_client_on_booking_trigger
  BEFORE INSERT ON attraction_bookings
  FOR EACH ROW
  EXECUTE FUNCTION upsert_client_on_booking();

-- 7. Function to update stats on booking status change
-- ============================================================================
CREATE OR REPLACE FUNCTION update_client_stats_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle no-show
  IF NEW.booking_status = 'no_show' AND OLD.booking_status != 'no_show' THEN
    UPDATE client_attraction_stats
    SET total_no_shows = total_no_shows + 1, updated_at = NOW()
    WHERE client_id = NEW.client_id AND attraction_id = NEW.attraction_id;
  END IF;

  -- Handle cancellation
  IF NEW.booking_status = 'cancelled' AND OLD.booking_status != 'cancelled' THEN
    UPDATE client_attraction_stats
    SET total_cancellations = total_cancellations + 1, updated_at = NOW()
    WHERE client_id = NEW.client_id AND attraction_id = NEW.attraction_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_client_stats_trigger ON attraction_bookings;
CREATE TRIGGER update_client_stats_trigger
  AFTER UPDATE ON attraction_bookings
  FOR EACH ROW
  WHEN (OLD.booking_status IS DISTINCT FROM NEW.booking_status)
  EXECUTE FUNCTION update_client_stats_on_status_change();

-- 8. Helper function to get effective features for an attraction
-- ============================================================================
CREATE OR REPLACE FUNCTION get_attraction_features(p_attraction_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_vertical_type TEXT;
  v_default_features JSONB;
  v_overrides JSONB;
BEGIN
  -- Get attraction's vertical type and overrides
  SELECT vertical_type, feature_overrides
  INTO v_vertical_type, v_overrides
  FROM attractions
  WHERE id = p_attraction_id;

  -- Get default features for this vertical
  SELECT features INTO v_default_features
  FROM vertical_feature_defaults
  WHERE vertical_type = v_vertical_type;

  -- Merge defaults with overrides (overrides take precedence)
  RETURN COALESCE(v_default_features, '{}'::jsonb) || COALESCE(v_overrides, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Helper function to get effective terminology for an attraction
-- ============================================================================
CREATE OR REPLACE FUNCTION get_attraction_terminology(p_attraction_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_vertical_type TEXT;
  v_default_terminology JSONB;
  v_overrides JSONB;
BEGIN
  -- Get attraction's vertical type and terminology overrides
  SELECT vertical_type, terminology
  INTO v_vertical_type, v_overrides
  FROM attractions
  WHERE id = p_attraction_id;

  -- Get default terminology for this vertical
  SELECT terminology INTO v_default_terminology
  FROM vertical_feature_defaults
  WHERE vertical_type = v_vertical_type;

  -- Merge defaults with overrides
  RETURN COALESCE(v_default_terminology, '{}'::jsonb) || COALESCE(v_overrides, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_attraction_features IS 'Returns merged feature flags for an attraction (vertical defaults + overrides)';
COMMENT ON FUNCTION get_attraction_terminology IS 'Returns merged terminology for an attraction (vertical defaults + overrides)';
