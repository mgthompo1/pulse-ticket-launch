-- =====================================================================
-- FIX ALL RLS PERFORMANCE ISSUES
-- =====================================================================
-- Wraps all auth.uid() and auth.<function>() calls in subqueries to
-- prevent per-row re-evaluation and improve query performance at scale.
--
-- Performance Impact: Reduces function calls from O(n) to O(1) per query
-- Example: 10,000 rows = 4 calls instead of 20,000 calls
-- =====================================================================

-- ============= EVENTS TABLE =============
DROP POLICY IF EXISTS "Users can view their organization's events" ON public.events;

CREATE POLICY "Users can view their organization's events"
ON public.events
FOR SELECT
USING (organization_id IN (
  SELECT id FROM organizations
  WHERE user_id = (select auth.uid())
));

-- ============= CONTACT_ENQUIRIES TABLE =============
DROP POLICY IF EXISTS "Organizations can create their own support tickets" ON public.contact_enquiries;

CREATE POLICY "Organizations can create their own support tickets"
ON public.contact_enquiries
FOR INSERT
WITH CHECK (
  enquiry_type = 'support'
  AND organization_id IS NOT NULL
  AND organization_id IN (
    SELECT id FROM organizations WHERE user_id = (select auth.uid())
  )
);

-- ============= PAYMENT_CREDENTIALS TABLE =============
DROP POLICY IF EXISTS "payment_credentials_update_org_owners_only" ON public.payment_credentials;

CREATE POLICY "payment_credentials_update_org_owners_only"
ON public.payment_credentials
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND organization_id IN (
    SELECT o.id
    FROM public.organizations o
    WHERE o.user_id = (select auth.uid())
  )
);

-- ============= USAGE_RECORDS TABLE =============
DROP POLICY IF EXISTS "usage_records_select_org_owners_only" ON public.usage_records;

CREATE POLICY "usage_records_select_org_owners_only"
ON public.usage_records
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND organization_id IN (
    SELECT o.id
    FROM public.organizations o
    WHERE o.user_id = (select auth.uid())
  )
);

-- ============= BILLING_CUSTOMERS TABLE =============
DROP POLICY IF EXISTS "billing_customers_select_org_owners_only" ON public.billing_customers;

CREATE POLICY "billing_customers_select_org_owners_only"
ON public.billing_customers
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND organization_id IN (
    SELECT o.id
    FROM public.organizations o
    WHERE o.user_id = (select auth.uid())
  )
);

-- ============= SEATS TABLE =============
DROP POLICY IF EXISTS "Users can manage seats for their events" ON public.seats;

CREATE POLICY "Users can manage seats for their events"
ON public.seats
FOR ALL
USING (
  seat_map_id IN (
    SELECT sm.id FROM seat_maps sm
    JOIN events e ON sm.event_id = e.id
    JOIN organizations o ON e.organization_id = o.id
    WHERE o.user_id = (select auth.uid())
  )
);

-- ============= SEAT_MAPS TABLE =============
DROP POLICY IF EXISTS "Users can manage seat maps for their events" ON public.seat_maps;

CREATE POLICY "Users can manage seat maps for their events"
ON public.seat_maps
FOR ALL
USING (
  event_id IN (
    SELECT e.id FROM events e
    JOIN organizations o ON e.organization_id = o.id
    WHERE o.user_id = (select auth.uid())
  )
);

-- ============= CHECK_INS TABLE =============
-- Fix the helper function used by check_ins policy
CREATE OR REPLACE FUNCTION public.user_can_access_ticket(ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tickets t
    JOIN order_items oi ON t.order_item_id = oi.id
    JOIN orders ord ON oi.order_id = ord.id
    JOIN events e ON ord.event_id = e.id
    JOIN organizations org ON e.organization_id = org.id
    WHERE t.id = ticket_id AND org.user_id = (select auth.uid())
  );
$$;

-- Also fix user_can_access_event function if it exists
CREATE OR REPLACE FUNCTION public.user_can_access_event(event_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e
    JOIN organizations o ON e.organization_id = o.id
    WHERE e.id = event_id AND o.user_id = (select auth.uid())
  );
$$;

-- ============= EMAIL_NOTIFICATIONS TABLE =============
DROP POLICY IF EXISTS "Organizers can view emails for their events" ON public.email_notifications;

CREATE POLICY "Organizers can view emails for their events"
ON public.email_notifications
FOR SELECT
USING (
  order_id IN (
    SELECT o.id
    FROM orders o
    JOIN events e ON o.event_id = e.id
    JOIN organizations org ON e.organization_id = org.id
    WHERE org.user_id = (select auth.uid())
  )
);

-- ============= CHAT_SESSIONS TABLE =============
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;

CREATE POLICY "Users can view their own chat sessions"
ON public.chat_sessions
FOR SELECT
USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create their own chat sessions"
ON public.chat_sessions
FOR INSERT
WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own chat sessions"
ON public.chat_sessions
FOR UPDATE
USING (user_id = (select auth.uid()));

-- ============= TICKETS TABLE (fix policies from security migration) =============
-- Update the tickets policies from the security fix migration
DROP POLICY IF EXISTS "tickets_select_event_organizers_only" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_for_validation" ON public.tickets;

CREATE POLICY "tickets_select_event_organizers_only"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND (
    -- Event organizers can view tickets for their events
    order_item_id IN (
      SELECT oi.id FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      JOIN public.events e ON o.event_id = e.id
      JOIN public.organizations org ON e.organization_id = org.id
      JOIN public.organization_users ou ON org.id = ou.organization_id
      WHERE ou.user_id = (select auth.uid())
    )
  )
);

CREATE POLICY "tickets_update_for_validation"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND order_item_id IN (
    SELECT oi.id FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    JOIN public.events e ON o.event_id = e.id
    JOIN public.organizations org ON e.organization_id = org.id
    JOIN public.organization_users ou ON org.id = ou.organization_id
    WHERE ou.user_id = (select auth.uid())
  )
);

-- ============= ADDITIONAL POLICIES FROM SECURITY FIX =============
-- Update orders policies from security fix
DROP POLICY IF EXISTS "orders_select_event_organizers_only" ON public.orders;
DROP POLICY IF EXISTS "orders_update_event_organizers_only" ON public.orders;

CREATE POLICY "orders_select_event_organizers_only"
ON public.orders
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND event_id IN (
    SELECT e.id
    FROM public.events e
    JOIN public.organizations o ON e.organization_id = o.id
    JOIN public.organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = (select auth.uid())
  )
);

CREATE POLICY "orders_update_event_organizers_only"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND event_id IN (
    SELECT e.id
    FROM public.events e
    JOIN public.organizations o ON e.organization_id = o.id
    JOIN public.organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = (select auth.uid())
  )
);

-- Update order_items policies
DROP POLICY IF EXISTS "order_items_select_event_organizers_only" ON public.order_items;

CREATE POLICY "order_items_select_event_organizers_only"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.events e ON o.event_id = e.id
    JOIN public.organizations org ON e.organization_id = org.id
    JOIN public.organization_users ou ON org.id = ou.organization_id
    WHERE ou.user_id = (select auth.uid())
  )
);

-- Update contacts policies
DROP POLICY IF EXISTS "contacts_select_org_members_with_crm" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_org_members_with_crm" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_org_members" ON public.contacts;

CREATE POLICY "contacts_select_org_members_with_crm"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND organization_id IN (
    SELECT ou.organization_id
    FROM public.organization_users ou
    WHERE ou.user_id = (select auth.uid())
  )
);

CREATE POLICY "contacts_insert_org_members_with_crm"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND organization_id IN (
    SELECT ou.organization_id
    FROM public.organization_users ou
    WHERE ou.user_id = (select auth.uid())
  )
);

CREATE POLICY "contacts_update_org_members"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND organization_id IN (
    SELECT ou.organization_id
    FROM public.organization_users ou
    WHERE ou.user_id = (select auth.uid())
  )
);

-- Add performance optimization comments
COMMENT ON FUNCTION public.user_can_access_ticket IS
'Helper function for RLS - optimized with subquery wrapping of auth.uid()';

COMMENT ON FUNCTION public.user_can_access_event IS
'Helper function for RLS - optimized with subquery wrapping of auth.uid()';

COMMENT ON POLICY "Users can view their organization's events" ON public.events IS
'Optimized RLS policy - auth.uid() wrapped in subquery for performance';

COMMENT ON POLICY "billing_customers_select_org_owners_only" ON public.billing_customers IS
'Restricts billing information access to organization owners only - optimized for performance';
