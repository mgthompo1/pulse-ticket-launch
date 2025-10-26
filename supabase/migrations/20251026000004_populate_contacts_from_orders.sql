-- ========================================
-- POPULATE CONTACTS FROM EXISTING ORDERS
-- This migration creates contact records from all existing orders
-- for organizations that have CRM enabled
-- ========================================

-- Create contacts from existing orders for CRM-enabled organizations
INSERT INTO contacts (
  organization_id,
  email,
  first_name,
  last_name,
  full_name,
  phone,
  created_at,
  updated_at
)
SELECT DISTINCT ON (e.organization_id, o.customer_email)
  e.organization_id,
  o.customer_email,
  -- Try to parse first name from customer_name
  CASE
    WHEN o.customer_name IS NOT NULL AND TRIM(o.customer_name) != ''
    THEN SPLIT_PART(TRIM(o.customer_name), ' ', 1)
    ELSE NULL
  END AS first_name,
  -- Try to parse last name from customer_name
  CASE
    WHEN o.customer_name IS NOT NULL AND TRIM(o.customer_name) != ''
    THEN SUBSTRING(TRIM(o.customer_name) FROM POSITION(' ' IN TRIM(o.customer_name)) + 1)
    ELSE NULL
  END AS last_name,
  o.customer_name,
  o.customer_phone,
  MIN(o.created_at) AS created_at,
  NOW() AS updated_at
FROM orders o
INNER JOIN events e ON o.event_id = e.id
INNER JOIN organizations org ON e.organization_id = org.id
WHERE org.crm_enabled = TRUE
  AND o.customer_email IS NOT NULL
  AND o.customer_email != ''
  -- Only insert if contact doesn't already exist
  AND NOT EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.organization_id = e.organization_id
    AND c.email = o.customer_email
  )
GROUP BY e.organization_id, o.customer_email, o.customer_name, o.customer_phone
ORDER BY e.organization_id, o.customer_email, MIN(o.created_at);

-- Create contact_events entries for all orders
INSERT INTO contact_events (
  contact_id,
  event_id,
  order_id,
  ticket_type,
  created_at
)
SELECT DISTINCT
  c.id AS contact_id,
  o.event_id,
  o.id AS order_id,
  'purchased' AS ticket_type,
  o.created_at
FROM orders o
INNER JOIN events e ON o.event_id = e.id
INNER JOIN organizations org ON e.organization_id = org.id
INNER JOIN contacts c ON c.organization_id = e.organization_id AND c.email = o.customer_email
WHERE org.crm_enabled = TRUE
  AND o.status IN ('paid', 'completed')
  -- Only insert if not already exists
  AND NOT EXISTS (
    SELECT 1 FROM contact_events ce
    WHERE ce.contact_id = c.id
    AND ce.event_id = o.event_id
    AND ce.order_id = o.id
  );

-- Update contact statistics from existing orders
-- This will trigger the update_contact_stats function for each contact
DO $$
DECLARE
  contact_record RECORD;
BEGIN
  FOR contact_record IN
    SELECT DISTINCT c.id, c.email, c.organization_id
    FROM contacts c
    INNER JOIN organizations org ON c.organization_id = org.id
    WHERE org.crm_enabled = TRUE
  LOOP
    -- Update total orders
    UPDATE contacts c
    SET
      total_orders = (
        SELECT COUNT(*)
        FROM orders o
        INNER JOIN events e ON o.event_id = e.id
        WHERE e.organization_id = contact_record.organization_id
          AND o.customer_email = contact_record.email
          AND o.status IN ('paid', 'completed')
      ),
      total_spent = (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        INNER JOIN events e ON o.event_id = e.id
        WHERE e.organization_id = contact_record.organization_id
          AND o.customer_email = contact_record.email
          AND o.status IN ('paid', 'completed')
      ),
      events_attended = (
        SELECT COUNT(DISTINCT ce.event_id)
        FROM contact_events ce
        WHERE ce.contact_id = contact_record.id
      ),
      last_order_date = (
        SELECT MAX(o.created_at)
        FROM orders o
        INNER JOIN events e ON o.event_id = e.id
        WHERE e.organization_id = contact_record.organization_id
          AND o.customer_email = contact_record.email
          AND o.status IN ('paid', 'completed')
      ),
      updated_at = NOW()
    WHERE c.id = contact_record.id;

    -- Update lifetime value
    UPDATE contacts
    SET lifetime_value = total_spent + total_donations
    WHERE id = contact_record.id;
  END LOOP;
END $$;

-- Log the results
DO $$
DECLARE
  total_contacts INTEGER;
  total_contact_events INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_contacts FROM contacts;
  SELECT COUNT(*) INTO total_contact_events FROM contact_events;

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Total contacts created: %', total_contacts;
  RAISE NOTICE 'Total contact-event relationships created: %', total_contact_events;
END $$;
