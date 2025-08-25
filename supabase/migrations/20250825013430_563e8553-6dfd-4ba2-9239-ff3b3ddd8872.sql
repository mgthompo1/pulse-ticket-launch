-- Fix search path warnings for the new functions
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_permission organization_permission
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is organization owner
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = p_organization_id AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has specific permission
  RETURN EXISTS (
    SELECT 1 FROM organization_users 
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND (role = 'admin' OR p_permission = ANY(permissions))
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_user_organization_role(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS organization_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role organization_role;
BEGIN
  -- Check if user is organization owner
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = p_organization_id AND user_id = p_user_id
  ) THEN
    RETURN 'owner';
  END IF;
  
  -- Get user role from organization_users
  SELECT role INTO user_role
  FROM organization_users 
  WHERE user_id = p_user_id AND organization_id = p_organization_id;
  
  RETURN COALESCE(user_role, 'viewer');
END;
$$;

CREATE OR REPLACE FUNCTION accept_organization_invitation(
  p_invitation_token TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
  new_user_id UUID;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM organization_invitations
  WHERE invitation_token = p_invitation_token
  AND status = 'pending'
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Get current user
  SELECT auth.uid() INTO new_user_id;
  
  IF new_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to accept invitation';
  END IF;
  
  -- Check if user email matches invitation
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = new_user_id 
    AND email = invitation_record.email
  ) THEN
    RAISE EXCEPTION 'User email does not match invitation';
  END IF;
  
  -- Add user to organization
  INSERT INTO organization_users (
    organization_id,
    user_id,
    role,
    permissions,
    invited_by
  ) VALUES (
    invitation_record.organization_id,
    new_user_id,
    invitation_record.role,
    invitation_record.permissions,
    invitation_record.invited_by
  ) ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = now();
  
  -- Mark invitation as accepted
  UPDATE organization_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_record.id;
  
  RETURN invitation_record.organization_id;
END;
$$;