-- Add CRM-specific permissions to the organization_permission enum
ALTER TYPE organization_permission ADD VALUE IF NOT EXISTS 'manage_crm';
ALTER TYPE organization_permission ADD VALUE IF NOT EXISTS 'view_crm';

-- Create a function to check if user has CRM access
CREATE OR REPLACE FUNCTION user_has_crm_access(org_id UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_users om
    WHERE om.organization_id = org_id
      AND om.user_id = user_id_param
      AND (
        om.role IN ('owner', 'admin')
        OR 'manage_crm' = ANY(om.permissions)
        OR 'view_crm' = ANY(om.permissions)
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user can manage CRM data
CREATE OR REPLACE FUNCTION user_can_manage_crm(org_id UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_users om
    WHERE om.organization_id = org_id
      AND om.user_id = user_id_param
      AND (
        om.role IN ('owner', 'admin')
        OR 'manage_crm' = ANY(om.permissions)
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for contacts with limited PII (for users without full CRM access)
CREATE OR REPLACE VIEW contacts_limited AS
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
