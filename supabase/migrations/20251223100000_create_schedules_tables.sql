-- ============================================================================
-- Attraction Schedules and Blackouts
-- Operating hours and blocked dates for slot generation
-- ============================================================================

-- Attraction Schedules (operating hours by day of week)
CREATE TABLE IF NOT EXISTS attraction_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER NOT NULL DEFAULT 60, -- minutes
    slot_capacity INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attraction_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_schedules_attraction
    ON attraction_schedules(attraction_id, day_of_week);

-- Attraction Blackouts (blocked dates)
CREATE TABLE IF NOT EXISTS attraction_blackouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attraction_id, date)
);

CREATE INDEX IF NOT EXISTS idx_blackouts_attraction
    ON attraction_blackouts(attraction_id, date);

-- RLS Policies
ALTER TABLE attraction_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attraction_blackouts ENABLE ROW LEVEL SECURITY;

-- Schedules policies
CREATE POLICY "Public can view active schedules" ON attraction_schedules
    FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage schedules" ON attraction_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_schedules.attraction_id
            AND ou.user_id = auth.uid()
        )
    );

-- Blackouts policies
CREATE POLICY "Public can view blackouts" ON attraction_blackouts
    FOR SELECT USING (true);

CREATE POLICY "Org members can manage blackouts" ON attraction_blackouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_blackouts.attraction_id
            AND ou.user_id = auth.uid()
        )
    );

-- Updated at trigger
CREATE TRIGGER update_attraction_schedules_updated_at
    BEFORE UPDATE ON attraction_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function to generate slots from schedules
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_attraction_slots(
    p_attraction_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_current_date DATE;
    v_day_of_week INTEGER;
    v_schedule RECORD;
    v_slot_start TIMESTAMP WITH TIME ZONE;
    v_slot_end TIMESTAMP WITH TIME ZONE;
    v_slots_created INTEGER := 0;
    v_attraction RECORD;
BEGIN
    -- Get attraction details
    SELECT * INTO v_attraction FROM attractions WHERE id = p_attraction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attraction not found';
    END IF;

    -- Loop through each date
    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
        v_day_of_week := EXTRACT(DOW FROM v_current_date);

        -- Check if date is blacked out
        IF NOT EXISTS (
            SELECT 1 FROM attraction_blackouts
            WHERE attraction_id = p_attraction_id
            AND date = v_current_date
        ) THEN
            -- Get schedule for this day
            FOR v_schedule IN
                SELECT * FROM attraction_schedules
                WHERE attraction_id = p_attraction_id
                AND day_of_week = v_day_of_week
                AND is_active = true
            LOOP
                -- Generate slots for this schedule
                v_slot_start := v_current_date + v_schedule.start_time;

                WHILE v_slot_start + (v_schedule.slot_duration || ' minutes')::INTERVAL
                      <= v_current_date + v_schedule.end_time
                LOOP
                    v_slot_end := v_slot_start + (v_schedule.slot_duration || ' minutes')::INTERVAL;

                    -- Insert slot if it doesn't exist
                    INSERT INTO booking_slots (
                        attraction_id,
                        start_time,
                        end_time,
                        max_capacity,
                        status
                    )
                    VALUES (
                        p_attraction_id,
                        v_slot_start,
                        v_slot_end,
                        v_schedule.slot_capacity,
                        'available'
                    )
                    ON CONFLICT DO NOTHING;

                    IF FOUND THEN
                        v_slots_created := v_slots_created + 1;
                    END IF;

                    v_slot_start := v_slot_end;
                END LOOP;
            END LOOP;
        END IF;

        v_current_date := v_current_date + 1;
    END LOOP;

    RETURN v_slots_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_attraction_slots(UUID, DATE, DATE) TO authenticated;

-- Clean up duplicate booking slots before adding constraints
-- Keep only the first occurrence of each duplicate
DELETE FROM booking_slots a
USING booking_slots b
WHERE a.attraction_id = b.attraction_id
  AND a.start_time = b.start_time
  AND COALESCE(a.resource_id, '00000000-0000-0000-0000-000000000000') = COALESCE(b.resource_id, '00000000-0000-0000-0000-000000000000')
  AND a.ctid > b.ctid;

-- Add unique constraint on booking_slots to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_slots_unique
    ON booking_slots(attraction_id, resource_id, start_time)
    WHERE resource_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_slots_unique_no_resource
    ON booking_slots(attraction_id, start_time)
    WHERE resource_id IS NULL;
