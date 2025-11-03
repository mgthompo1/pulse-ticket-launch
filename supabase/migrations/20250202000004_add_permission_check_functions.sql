-- Create helper functions for permission checks in edge functions
-- These are used to validate user access before allowing payment operations

-- Check if user has access to manage a contact
CREATE OR REPLACE FUNCTION check_contact_access(
  p_contact_id UUID,
  p_user_id UUID,
  p_required_permission TEXT DEFAULT 'view_crm'
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = p_contact_id
    AND (
      -- Organization owner
      EXISTS (
        SELECT 1 FROM organizations org
        WHERE org.id = c.organization_id AND org.user_id = p_user_id
      )
      OR
      -- Organization member with permission
      EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = c.organization_id
        AND ou.user_id = p_user_id
        AND (
          ou.role IN ('owner', 'admin')
          OR p_required_permission = ANY(ou.permissions)
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has access to an event (for creating orders)
CREATE OR REPLACE FUNCTION check_event_access(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = p_event_id
    AND (
      -- Organization owner
      EXISTS (
        SELECT 1 FROM organizations org
        WHERE org.id = e.organization_id AND org.user_id = p_user_id
      )
      OR
      -- Organization member (any role can create orders)
      EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = e.organization_id
        AND ou.user_id = p_user_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION check_contact_access IS 'Validates if a user has permission to access a contact. Used by edge functions to enforce authorization.';
COMMENT ON FUNCTION check_event_access IS 'Validates if a user has permission to access an event. Used by edge functions to enforce authorization.';
