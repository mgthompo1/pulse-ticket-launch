-- Let's debug this step by step
-- First, check what users actually exist
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Let's also recreate the accept_invitation_and_signup function to make sure it's correct
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
  user_exists BOOLEAN;
BEGIN
  -- First check if the user actually exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User does not exist in auth.users'
    );
  END IF;
  
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