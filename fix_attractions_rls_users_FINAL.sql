-- =====================================================================
-- FIX ATTRACTIONS RLS POLICIES - FINAL VERSION
-- =====================================================================
-- This fixes the "permission denied for table users" error by using
-- auth.jwt() instead of querying auth.users table
-- =====================================================================

-- ============= ATTRACTIONS TABLE =============
DROP POLICY IF EXISTS "Users can manage attractions for their organizations" ON attractions;
DROP POLICY IF EXISTS "Published attractions are publicly viewable" ON attractions;
DROP POLICY IF EXISTS "attractions_public_view_active" ON attractions;
DROP POLICY IF EXISTS "attractions_select_org_members" ON attractions;
DROP POLICY IF EXISTS "attractions_insert_org_members" ON attractions;
DROP POLICY IF EXISTS "attractions_update_org_members" ON attractions;
DROP POLICY IF EXISTS "attractions_delete_org_members" ON attractions;

CREATE POLICY "attractions_public_view_active"
ON attractions FOR SELECT TO anon, authenticated
USING (status = 'active');

CREATE POLICY "attractions_select_org_members"
ON attractions FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND organization_id IN (
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "attractions_insert_org_members"
ON attractions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND organization_id IN (
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "attractions_update_org_members"
ON attractions FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND organization_id IN (
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "attractions_delete_org_members"
ON attractions FOR DELETE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND organization_id IN (
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  )
);

-- ============= ATTRACTION_BOOKINGS TABLE =============
DROP POLICY IF EXISTS "Organization owners can view their attraction bookings" ON attraction_bookings;
DROP POLICY IF EXISTS "Organization owners can update their attraction bookings" ON attraction_bookings;
DROP POLICY IF EXISTS "attraction_bookings_select_restricted" ON attraction_bookings;
DROP POLICY IF EXISTS "attraction_bookings_select_org_members" ON attraction_bookings;
DROP POLICY IF EXISTS "attraction_bookings_update_org_members" ON attraction_bookings;

-- Allow organization members to view bookings for their attractions
-- FIXED: Use auth.jwt() ->> 'email' instead of querying auth.users
CREATE POLICY "attraction_bookings_select_org_members"
ON attraction_bookings FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Customer can see their own bookings (using JWT email claim)
    (auth.jwt() ->> 'email') IS NOT NULL AND customer_email = (auth.jwt() ->> 'email')
    OR
    -- Organization members can see bookings for their attractions
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  )
);

-- Allow organization members to update bookings for their attractions
CREATE POLICY "attraction_bookings_update_org_members"
ON attraction_bookings FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND organization_id IN (
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  )
);

-- ============= ATTRACTION_RESOURCES TABLE =============
DROP POLICY IF EXISTS "Users can manage resources for their attractions" ON attraction_resources;
DROP POLICY IF EXISTS "Resources are publicly viewable for active attractions" ON attraction_resources;
DROP POLICY IF EXISTS "attraction_resources_public_view" ON attraction_resources;
DROP POLICY IF EXISTS "attraction_resources_manage_org_members" ON attraction_resources;

CREATE POLICY "attraction_resources_public_view"
ON attraction_resources FOR SELECT TO anon, authenticated
USING (attraction_id IN (SELECT id FROM attractions WHERE status = 'active'));

CREATE POLICY "attraction_resources_manage_org_members"
ON attraction_resources FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND attraction_id IN (
    SELECT a.id FROM attractions a
    WHERE a.organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  )
);

-- ============= BOOKING_SLOTS TABLE =============
DROP POLICY IF EXISTS "Users can manage slots for their attractions" ON booking_slots;
DROP POLICY IF EXISTS "Available slots are publicly viewable" ON booking_slots;
DROP POLICY IF EXISTS "booking_slots_public_view" ON booking_slots;
DROP POLICY IF EXISTS "booking_slots_manage_org_members" ON booking_slots;

CREATE POLICY "booking_slots_public_view"
ON booking_slots FOR SELECT TO anon, authenticated
USING (
  status = 'available'
  AND attraction_id IN (SELECT id FROM attractions WHERE status = 'active')
);

CREATE POLICY "booking_slots_manage_org_members"
ON booking_slots FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND attraction_id IN (
    SELECT a.id FROM attractions a
    WHERE a.organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  )
);

-- ============= BOOKING_ADD_ONS TABLE (if exists) =============
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'booking_add_ons') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Organization owners can manage booking add-ons" ON booking_add_ons';
    EXECUTE 'DROP POLICY IF EXISTS "booking_add_ons_manage_org_members" ON booking_add_ons';

    EXECUTE 'CREATE POLICY "booking_add_ons_manage_org_members"
    ON booking_add_ons FOR ALL TO authenticated
    USING (
      auth.uid() IS NOT NULL
      AND booking_id IN (
        SELECT ab.id FROM attraction_bookings ab
        WHERE ab.organization_id IN (
          SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
        )
      )
    )';
  END IF;
END $$;
