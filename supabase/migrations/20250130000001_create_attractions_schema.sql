-- Create attractions table (similar to events but for ongoing bookable attractions)
CREATE TABLE attractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    venue VARCHAR(255),
    logo_url TEXT,
    featured_image_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    
    -- Attractions-specific fields
    attraction_type VARCHAR(50) NOT NULL, -- 'golf_simulator', 'karaoke_room', 'tour', 'workshop', etc.
    duration_minutes INTEGER NOT NULL DEFAULT 60, -- default session duration
    advance_booking_days INTEGER DEFAULT 30, -- how far in advance can people book
    max_concurrent_bookings INTEGER DEFAULT 1, -- how many can run simultaneously
    
    -- Pricing
    base_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NZD',
    
    -- Availability
    operating_hours JSONB, -- e.g., {"monday": {"open": "09:00", "close": "17:00"}, ...}
    blackout_dates JSONB, -- array of dates when attraction is unavailable
    
    -- Customization (similar to events)
    widget_customization JSONB,
    email_customization JSONB,
    booking_customization JSONB, -- attraction-specific customization
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attraction resources table (for attractions with multiple resources, e.g., multiple golf simulators)
CREATE TABLE attraction_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Simulator 1", "Room A", "Guide John"
    description TEXT,
    capacity INTEGER DEFAULT 1, -- how many people can use this resource at once
    is_active BOOLEAN DEFAULT true,
    
    -- Resource-specific settings
    resource_data JSONB, -- flexible field for resource-specific info
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking slots table (replaces the event-based ticketing with time-slot booking)
CREATE TABLE booking_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES attraction_resources(id) ON DELETE CASCADE,
    
    -- Time slot details
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Booking status
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked', 'maintenance')),
    
    -- Capacity management
    max_capacity INTEGER NOT NULL DEFAULT 1,
    current_bookings INTEGER DEFAULT 0,
    
    -- Pricing (can override attraction base price)
    price_override DECIMAL(10,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table (replaces orders for attractions)
CREATE TABLE attraction_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    booking_slot_id UUID NOT NULL REFERENCES booking_slots(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Customer details
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    
    -- Booking details
    party_size INTEGER NOT NULL DEFAULT 1,
    special_requests TEXT,
    
    -- Payment
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NZD',
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    
    -- Status
    booking_status VARCHAR(20) DEFAULT 'confirmed' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    
    -- Metadata
    booking_reference VARCHAR(20) UNIQUE NOT NULL, -- human-readable booking reference
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking add-ons table (for additional services/products)
CREATE TABLE booking_add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES attraction_bookings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_attractions_organization ON attractions(organization_id);
CREATE INDEX idx_attractions_status ON attractions(status);
CREATE INDEX idx_attraction_resources_attraction ON attraction_resources(attraction_id);
CREATE INDEX idx_booking_slots_attraction ON booking_slots(attraction_id);
CREATE INDEX idx_booking_slots_time ON booking_slots(start_time, end_time);
CREATE INDEX idx_booking_slots_status ON booking_slots(status);
CREATE INDEX idx_attraction_bookings_attraction ON attraction_bookings(attraction_id);
CREATE INDEX idx_attraction_bookings_customer ON attraction_bookings(customer_email);
CREATE INDEX idx_attraction_bookings_status ON attraction_bookings(booking_status);
CREATE INDEX idx_attraction_bookings_payment ON attraction_bookings(payment_status);
CREATE INDEX idx_attraction_bookings_reference ON attraction_bookings(booking_reference);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attractions_updated_at BEFORE UPDATE ON attractions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attraction_resources_updated_at BEFORE UPDATE ON attraction_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_booking_slots_updated_at BEFORE UPDATE ON booking_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attraction_bookings_updated_at BEFORE UPDATE ON attraction_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate booking reference function
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_reference IS NULL THEN
        NEW.booking_reference := 'BK-' || upper(substring(NEW.id::text, 1, 8));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_booking_reference_trigger 
    BEFORE INSERT ON attraction_bookings 
    FOR EACH ROW EXECUTE FUNCTION generate_booking_reference();

-- Comments for documentation
COMMENT ON TABLE attractions IS 'Ongoing bookable attractions like golf simulators, karaoke rooms, tours, etc.';
COMMENT ON TABLE attraction_resources IS 'Individual resources within an attraction (e.g., specific rooms, equipment, guides)';
COMMENT ON TABLE booking_slots IS 'Available time slots for booking attractions';
COMMENT ON TABLE attraction_bookings IS 'Customer bookings for attraction time slots';
COMMENT ON TABLE booking_add_ons IS 'Additional services or products added to bookings';
