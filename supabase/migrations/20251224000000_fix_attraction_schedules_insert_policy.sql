-- ============================================================================
-- Fix attraction_schedules and attraction_blackouts INSERT policies
-- The original policy used FOR ALL USING but INSERT requires WITH CHECK
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Org members can manage schedules" ON attraction_schedules;
DROP POLICY IF EXISTS "Org members can manage blackouts" ON attraction_blackouts;

-- Recreate with proper WITH CHECK for INSERT operations
CREATE POLICY "Org members can manage schedules" ON attraction_schedules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_schedules.attraction_id
            AND ou.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_id
            AND ou.user_id = auth.uid()
        )
    );

CREATE POLICY "Org members can manage blackouts" ON attraction_blackouts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_blackouts.attraction_id
            AND ou.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM attractions a
            JOIN organization_users ou ON ou.organization_id = a.organization_id
            WHERE a.id = attraction_id
            AND ou.user_id = auth.uid()
        )
    );
