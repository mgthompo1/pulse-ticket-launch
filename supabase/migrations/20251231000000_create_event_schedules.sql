-- Create event_schedules table for storing event timeline items
CREATE TABLE IF NOT EXISTS event_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    time TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    is_highlight BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by event
CREATE INDEX IF NOT EXISTS idx_event_schedules_event_id ON event_schedules(event_id);

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_event_schedules_sort_order ON event_schedules(event_id, sort_order);

-- Enable RLS
ALTER TABLE event_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view schedules for events in their organization
CREATE POLICY "Users can view event schedules" ON event_schedules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN organizations o ON e.organization_id = o.id
            WHERE e.id = event_schedules.event_id
            AND o.user_id = auth.uid()
        )
    );

-- Policy: Users can insert schedules for events in their organization
CREATE POLICY "Users can insert event schedules" ON event_schedules
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e
            JOIN organizations o ON e.organization_id = o.id
            WHERE e.id = event_schedules.event_id
            AND o.user_id = auth.uid()
        )
    );

-- Policy: Users can update schedules for events in their organization
CREATE POLICY "Users can update event schedules" ON event_schedules
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN organizations o ON e.organization_id = o.id
            WHERE e.id = event_schedules.event_id
            AND o.user_id = auth.uid()
        )
    );

-- Policy: Users can delete schedules for events in their organization
CREATE POLICY "Users can delete event schedules" ON event_schedules
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN organizations o ON e.organization_id = o.id
            WHERE e.id = event_schedules.event_id
            AND o.user_id = auth.uid()
        )
    );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_event_schedules_updated_at
    BEFORE UPDATE ON event_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_event_schedules_updated_at();
