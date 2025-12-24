-- ============================================================================
-- Attractions V3 Schema Enhancement
-- Premium booking system with staff profiles, add-ons, reviews, and more
-- ============================================================================

-- 1. Enhance attraction_resources for staff profiles
-- ============================================================================
ALTER TABLE attraction_resources
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_on_widget BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS booking_count INTEGER DEFAULT 0;

-- Index for display ordering
CREATE INDEX IF NOT EXISTS idx_attraction_resources_display
  ON attraction_resources(attraction_id, display_order, is_active);

-- 2. Add-ons catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS attraction_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    pricing_type VARCHAR(20) DEFAULT 'flat' CHECK (pricing_type IN ('flat', 'per_person', 'percentage')),
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    max_quantity INTEGER,
    min_quantity INTEGER DEFAULT 0,
    category VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    availability_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addons_attraction
  ON attraction_addons(attraction_id, is_active, display_order);

-- 3. Packages/bundles
-- ============================================================================
CREATE TABLE IF NOT EXISTS attraction_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    discount_label VARCHAR(50),
    included_addon_ids UUID[] DEFAULT '{}',
    duration_override INTEGER,
    party_size_min INTEGER DEFAULT 1,
    party_size_max INTEGER,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    validity_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_attraction
  ON attraction_packages(attraction_id, is_active, display_order);

-- 4. Reviews & ratings
-- ============================================================================
CREATE TABLE IF NOT EXISTS attraction_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES attraction_bookings(id) ON DELETE SET NULL,
    resource_id UUID REFERENCES attraction_resources(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,
    photos TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    admin_response TEXT,
    admin_response_at TIMESTAMP WITH TIME ZONE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_attraction
  ON attraction_reviews(attraction_id, is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_resource
  ON attraction_reviews(resource_id, is_published);

-- Materialized view for rating summary (for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS attraction_rating_summary AS
SELECT
    attraction_id,
    COUNT(*) as review_count,
    ROUND(AVG(rating)::DECIMAL, 2) as average_rating,
    COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
    COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
    COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
    COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
    COUNT(*) FILTER (WHERE rating = 1) as one_star_count
FROM attraction_reviews
WHERE is_published = true
GROUP BY attraction_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rating_summary_attraction
  ON attraction_rating_summary(attraction_id);

-- 5. Gallery images
-- ============================================================================
CREATE TABLE IF NOT EXISTS attraction_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text VARCHAR(255),
    caption TEXT,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_attraction
  ON attraction_gallery(attraction_id, display_order);

-- 6. Requirements & restrictions
-- ============================================================================
CREATE TABLE IF NOT EXISTS attraction_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN (
        'age_minimum', 'age_maximum', 'height_minimum', 'height_maximum',
        'health', 'equipment', 'skill_level', 'waiver', 'custom'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    value VARCHAR(100),
    unit VARCHAR(20),
    icon VARCHAR(50),
    is_blocking BOOLEAN DEFAULT false,
    acknowledgement_required BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requirements_attraction
  ON attraction_requirements(attraction_id, display_order);

-- 7. Custom booking form fields
-- ============================================================================
CREATE TABLE IF NOT EXISTS attraction_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    field_type VARCHAR(30) NOT NULL CHECK (field_type IN (
        'text', 'email', 'phone', 'number', 'select', 'multiselect',
        'checkbox', 'date', 'time', 'textarea', 'file'
    )),
    label VARCHAR(255) NOT NULL,
    placeholder VARCHAR(255),
    help_text TEXT,
    options JSONB,
    validation_rules JSONB DEFAULT '{}',
    default_value TEXT,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    show_on_confirmation BOOLEAN DEFAULT true,
    show_on_email BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    conditional_display JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_attraction
  ON attraction_custom_fields(attraction_id, is_active, display_order);

-- 8. Custom field responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_custom_field_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES attraction_bookings(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES attraction_custom_fields(id) ON DELETE CASCADE,
    field_label VARCHAR(255) NOT NULL,
    field_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_responses_booking
  ON booking_custom_field_responses(booking_id);

-- 9. Enhance booking_add_ons to link to catalog
-- ============================================================================
ALTER TABLE booking_add_ons
  ADD COLUMN IF NOT EXISTS addon_id UUID REFERENCES attraction_addons(id),
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES attraction_packages(id);

-- 10. Add urgency/social proof settings to attractions
-- ============================================================================
ALTER TABLE attractions
  ADD COLUMN IF NOT EXISTS urgency_settings JSONB DEFAULT '{
    "enabled": true,
    "showSpotsLeft": true,
    "lowAvailabilityThreshold": 3,
    "criticalAvailabilityThreshold": 1,
    "showRecentBookings": true,
    "recentBookingsWindow": 24
  }',
  ADD COLUMN IF NOT EXISTS social_proof_settings JSONB DEFAULT '{
    "showRatings": true,
    "showReviewCount": true,
    "showFeaturedReviews": true,
    "maxFeaturedReviews": 3,
    "showBookingCount": true
  }',
  ADD COLUMN IF NOT EXISTS booking_flow_settings JSONB DEFAULT '{
    "steps": ["date", "time", "details", "payment"],
    "requireStaffSelection": false,
    "showAddOns": true,
    "showPackages": true,
    "showRequirements": true,
    "collectPhone": true,
    "collectSpecialRequests": true
  }',
  ADD COLUMN IF NOT EXISTS hero_settings JSONB DEFAULT '{
    "layout": "fullwidth",
    "showGallery": true,
    "showRating": true,
    "showBookingCount": true,
    "overlayOpacity": 0.5
  }';

-- 11. RLS Policies for new tables
-- ============================================================================

-- attraction_addons policies
ALTER TABLE attraction_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active addons" ON attraction_addons
    FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage addons" ON attraction_addons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_addons.attraction_id
            AND ou.user_id = auth.uid()
        )
    );

-- attraction_packages policies
ALTER TABLE attraction_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active packages" ON attraction_packages
    FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage packages" ON attraction_packages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_packages.attraction_id
            AND ou.user_id = auth.uid()
        )
    );

-- attraction_reviews policies
ALTER TABLE attraction_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published reviews" ON attraction_reviews
    FOR SELECT USING (is_published = true);

CREATE POLICY "Org members can manage reviews" ON attraction_reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_reviews.attraction_id
            AND ou.user_id = auth.uid()
        )
    );

-- attraction_gallery policies
ALTER TABLE attraction_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view gallery" ON attraction_gallery
    FOR SELECT USING (true);

CREATE POLICY "Org members can manage gallery" ON attraction_gallery
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_gallery.attraction_id
            AND ou.user_id = auth.uid()
        )
    );

-- attraction_requirements policies
ALTER TABLE attraction_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view requirements" ON attraction_requirements
    FOR SELECT USING (true);

CREATE POLICY "Org members can manage requirements" ON attraction_requirements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_requirements.attraction_id
            AND ou.user_id = auth.uid()
        )
    );

-- attraction_custom_fields policies
ALTER TABLE attraction_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active custom fields" ON attraction_custom_fields
    FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage custom fields" ON attraction_custom_fields
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_custom_fields.attraction_id
            AND ou.user_id = auth.uid()
        )
    );

-- booking_custom_field_responses policies
ALTER TABLE booking_custom_field_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking owners can view responses" ON booking_custom_field_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM attraction_bookings ab
            WHERE ab.id = booking_custom_field_responses.booking_id
            AND ab.customer_email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Org members can manage responses" ON booking_custom_field_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM attraction_bookings ab
            JOIN attractions a ON a.id = ab.attraction_id
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE ab.id = booking_custom_field_responses.booking_id
            AND ou.user_id = auth.uid()
        )
    );

-- 12. Function to refresh rating summary
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_attraction_rating_summary()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY attraction_rating_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh on review changes
DROP TRIGGER IF EXISTS refresh_rating_summary_trigger ON attraction_reviews;
CREATE TRIGGER refresh_rating_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON attraction_reviews
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_attraction_rating_summary();

-- 13. Function to update resource booking count and rating
-- ============================================================================
CREATE OR REPLACE FUNCTION update_resource_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update booking count
    UPDATE attraction_resources
    SET booking_count = (
        SELECT COUNT(*) FROM attraction_bookings ab
        JOIN booking_slots bs ON bs.id = ab.booking_slot_id
        WHERE bs.resource_id = NEW.resource_id
        AND ab.booking_status IN ('confirmed', 'completed')
    )
    WHERE id = NEW.resource_id;

    -- Update average rating
    UPDATE attraction_resources
    SET rating_average = (
        SELECT ROUND(AVG(rating)::DECIMAL, 2)
        FROM attraction_reviews
        WHERE resource_id = NEW.resource_id
        AND is_published = true
    )
    WHERE id = NEW.resource_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
