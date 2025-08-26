-- Fix the invitation system by creating a proper function that handles the signup and organization membership
-- First, let's create a function that handles the complete invitation acceptance flow

CREATE OR REPLACE FUNCTION accept_invitation_and_signup(
  p_invitation_token TEXT,
  p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
  result jsonb;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM organization_invitations
  WHERE invitation_token = p_invitation_token
  AND status = 'pending'
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;
  
  -- Add user to organization_users table
  INSERT INTO organization_users (
    organization_id,
    user_id,
    role,
    permissions,
    invited_by
  ) VALUES (
    invitation_record.organization_id,
    p_user_id,
    invitation_record.role,
    invitation_record.permissions,
    invitation_record.invited_by
  ) ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = now();
  
  -- Mark invitation as accepted
  UPDATE organization_invitations
  SET 
    status = 'accepted',
    updated_at = now()
  WHERE id = invitation_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', invitation_record.organization_id,
    'role', invitation_record.role,
    'permissions', invitation_record.permissions
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_invitation_and_signup(TEXT, UUID) TO authenticated;

-- Create a simplified function to get invitation details for display
CREATE OR REPLACE FUNCTION get_invitation_details(p_invitation_token TEXT)
RETURNS TABLE(
  id UUID,
  email TEXT,
  role organization_role,
  permissions organization_permission[],
  organization_id UUID,
  organization_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oi.id,
    oi.email,
    oi.role,
    oi.permissions,
    oi.organization_id,
    o.name as organization_name,
    oi.expires_at
  FROM organization_invitations oi
  JOIN organizations o ON oi.organization_id = o.id
  WHERE oi.invitation_token = p_invitation_token
  AND oi.status = 'pending'
  AND oi.expires_at > now();
END;
$$;

-- Grant execute permission to anonymous users (so they can view invitation details before signing up)
GRANT EXECUTE ON FUNCTION get_invitation_details(TEXT) TO anon, authenticated;