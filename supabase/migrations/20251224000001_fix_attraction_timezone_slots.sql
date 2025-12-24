-- ============================================================================
-- Fix attraction slots timezone handling
-- Adds timezone support and fixes slot generation to use local times
-- ============================================================================

-- Add timezone column to attractions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'attractions' AND column_name = 'timezone') THEN
        ALTER TABLE attractions ADD COLUMN timezone VARCHAR(100) DEFAULT 'Pacific/Auckland';
    END IF;
END $$;

-- Drop and recreate the generate_attraction_slots function with timezone support
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
    v_timezone TEXT;
BEGIN
    -- Get attraction details including timezone
    SELECT *, COALESCE(timezone, 'Pacific/Auckland') as tz
    INTO v_attraction
    FROM attractions
    WHERE id = p_attraction_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attraction not found';
    END IF;

    v_timezone := v_attraction.tz;

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
                -- Create timestamp in the attraction's timezone, then convert to UTC for storage
                v_slot_start := (v_current_date::TEXT || ' ' || v_schedule.start_time::TEXT)::TIMESTAMP
                                AT TIME ZONE v_timezone;

                WHILE v_slot_start + (v_schedule.slot_duration || ' minutes')::INTERVAL
                      <= (v_current_date::TEXT || ' ' || v_schedule.end_time::TEXT)::TIMESTAMP
                         AT TIME ZONE v_timezone
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
