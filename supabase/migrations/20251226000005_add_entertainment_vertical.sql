-- ============================================================================
-- Add Entertainment Vertical Type
-- For bowling, karaoke, VR, escape rooms, laser tag, etc.
-- ============================================================================

-- 1. Update the vertical_type check constraint on attractions table
ALTER TABLE attractions DROP CONSTRAINT IF EXISTS attractions_vertical_type_check;
ALTER TABLE attractions ADD CONSTRAINT attractions_vertical_type_check
  CHECK (vertical_type IN ('general', 'golf', 'salon', 'fitness', 'tours', 'spa', 'rental', 'entertainment'));

-- 2. Add entertainment to vertical_feature_defaults
INSERT INTO vertical_feature_defaults (vertical_type, features, terminology, default_config)
VALUES (
  'entertainment',
  '{
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
    "variableDuration": true,
    "packages": true,
    "partyBookings": true,
    "resourceBooking": true,
    "foodAndBeverage": true
  }'::jsonb,
  '{
    "booking": "Booking",
    "bookings": "Bookings",
    "slot": "Session",
    "slots": "Sessions",
    "resource": "Lane",
    "resources": "Lanes",
    "guest": "Guest",
    "guests": "Guests",
    "party": "Party",
    "duration": "Duration",
    "package": "Package",
    "addOn": "Extra"
  }'::jsonb,
  '{
    "defaultDuration": 60,
    "durationOptions": [30, 60, 90, 120],
    "minGroupSize": 1,
    "maxGroupSize": 8,
    "resourceLabel": "Lane",
    "showPackages": true,
    "allowPartyBookings": true,
    "requireDeposit": true,
    "depositPercent": 25
  }'::jsonb
)
ON CONFLICT (vertical_type) DO UPDATE SET
  features = EXCLUDED.features,
  terminology = EXCLUDED.terminology,
  default_config = EXCLUDED.default_config;

-- 3. Create entertainment_config table for venue-specific settings
CREATE TABLE IF NOT EXISTS entertainment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE UNIQUE,

  -- Resource settings (lanes, rooms, stations)
  resource_label TEXT DEFAULT 'Lane',  -- 'Lane', 'Room', 'Station', 'Pod', 'Court'
  total_resources INTEGER DEFAULT 4,

  -- Duration settings
  duration_options INTEGER[] DEFAULT '{30, 60, 90, 120}',
  default_duration INTEGER DEFAULT 60,
  buffer_between INTEGER DEFAULT 10,  -- minutes between bookings

  -- Group settings
  min_per_resource INTEGER DEFAULT 1,
  max_per_resource INTEGER DEFAULT 8,

  -- Pricing
  price_per_duration BOOLEAN DEFAULT true,  -- price per hour vs per session
  equipment_included BOOLEAN DEFAULT true,
  equipment_fee DECIMAL(10,2),

  -- Party settings
  party_packages_enabled BOOLEAN DEFAULT true,
  min_party_size INTEGER DEFAULT 6,
  party_deposit_percent INTEGER DEFAULT 25,

  -- Food & beverage
  fnb_enabled BOOLEAN DEFAULT true,
  fnb_required_for_parties BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_entertainment_config_attraction ON entertainment_config(attraction_id);

COMMENT ON TABLE entertainment_config IS 'Entertainment venue-specific configuration (bowling, karaoke, VR, etc.)';

-- RLS
ALTER TABLE entertainment_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view entertainment config" ON entertainment_config
  FOR SELECT USING (true);

CREATE POLICY "Org members can manage entertainment config" ON entertainment_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = entertainment_config.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 4. Create party_packages table for birthday/corporate packages
CREATE TABLE IF NOT EXISTS party_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Package contents
  duration_minutes INTEGER NOT NULL,
  num_resources INTEGER DEFAULT 1,  -- how many lanes/rooms included
  min_guests INTEGER,
  max_guests INTEGER,

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  price_per_extra_guest DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),

  -- Inclusions
  inclusions JSONB DEFAULT '[]',  -- ["2 hours bowling", "Shoe rental", "Pizza & drinks", "Party host"]

  -- Add-on options
  available_addons UUID[] DEFAULT '{}',  -- references to attraction_addons

  -- Availability
  available_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',  -- days of week
  available_start_time TIME,
  available_end_time TIME,
  blackout_dates DATE[] DEFAULT '{}',

  -- Settings
  advance_booking_days INTEGER DEFAULT 30,  -- how far in advance required
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_party_packages_attraction ON party_packages(attraction_id, is_active);

COMMENT ON TABLE party_packages IS 'Party/event packages for entertainment venues';

-- RLS
ALTER TABLE party_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active packages" ON party_packages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage packages" ON party_packages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = party_packages.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 5. Add package_id to bookings for party package bookings
ALTER TABLE attraction_bookings
ADD COLUMN IF NOT EXISTS party_package_id UUID REFERENCES party_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS resource_ids UUID[] DEFAULT '{}',  -- which lanes/rooms booked
ADD COLUMN IF NOT EXISTS is_party_booking BOOLEAN DEFAULT false;
