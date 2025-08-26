-- Create function to add user to organization
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION add_user_to_organization(
  p_organization_id UUID,
  p_user_id UUID,
  p_role organization_role DEFAULT 'viewer',
  p_permissions organization_permission[] DEFAULT ARRAY[]::organization_permission[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_org_user_id UUID;
BEGIN
  -- Add user to organization_users table
  INSERT INTO organization_users (
    organization_id,
    user_id,
    role,
    permissions
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_role,
    p_permissions
  ) ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = now()
  RETURNING id INTO new_org_user_id;
  
  RETURN new_org_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_user_to_organization(UUID, UUID, organization_role, organization_permission[]) TO authenticated;

-- Function created successfully! You can now use it in your application.
