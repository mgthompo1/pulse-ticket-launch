-- Fix security issue with contacts_limited view
-- Change from SECURITY DEFINER (implicit) to SECURITY INVOKER (explicit)
-- This ensures the view runs with the permissions of the querying user, not the creator

DROP VIEW IF EXISTS contacts_limited;

-- Recreate view with explicit SECURITY INVOKER
CREATE OR REPLACE VIEW contacts_limited
WITH (security_invoker = true)
AS
SELECT
  id,
  organization_id,
  -- Masked email: show only first 2 chars and domain
  CASE
    WHEN user_has_crm_access(organization_id, auth.uid()) THEN email
    ELSE SUBSTRING(email FROM 1 FOR 2) || '***@' || SUBSTRING(email FROM POSITION('@' IN email) + 1)
  END AS email,
  -- Show only first name initial for limited access
  CASE
    WHEN user_has_crm_access(organization_id, auth.uid()) THEN first_name
    ELSE SUBSTRING(first_name FROM 1 FOR 1) || '.'
  END AS first_name,
  CASE
    WHEN user_has_crm_access(organization_id, auth.uid()) THEN last_name
    ELSE SUBSTRING(last_name FROM 1 FOR 1) || '.'
  END AS last_name,
  -- Hide sensitive contact info
  CASE WHEN user_has_crm_access(organization_id, auth.uid()) THEN phone ELSE NULL END AS phone,
  CASE WHEN user_has_crm_access(organization_id, auth.uid()) THEN address ELSE NULL END AS address,
  city, -- City is okay to show
  CASE WHEN user_has_crm_access(organization_id, auth.uid()) THEN postal_code ELSE NULL END AS postal_code,
  country,
  tags,
  -- Stats are okay to show
  total_orders,
  total_spent,
  total_donations,
  lifetime_value,
  events_attended,
  last_order_date,
  last_event_date,
  created_at
FROM contacts
WHERE organization_id IN (
  SELECT organization_id FROM organization_users
  WHERE user_id = auth.uid()
);

-- Grant access to the view
GRANT SELECT ON contacts_limited TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW contacts_limited IS 'View with row-level security that masks PII for users without CRM access. Uses SECURITY INVOKER to enforce RLS policies of the querying user.';
