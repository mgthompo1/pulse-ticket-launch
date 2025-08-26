-- Modify invitation system to automatically add users to organization_users when invitations are sent
-- Run this in your Supabase SQL Editor

-- First, let's see the current invitation sending function
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%invitation%' 
AND routine_schema = 'public';

-- Create a function that automatically adds users to organization_users when invitations are sent
CREATE OR REPLACE FUNCTION send_organization_invitation_with_user_add(
  p_organization_id UUID,
  p_email TEXT,
  p_role organization_role DEFAULT 'viewer',
  p_permissions organization_permission[] DEFAULT ARRAY[]::organization_permission[],
  p_invited_by UUID DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_token TEXT;
  new_invitation_id UUID;
BEGIN
  -- Generate a unique invitation token
  invitation_token := encode(gen_random_bytes(32), 'hex');
  
  -- Create the invitation
  INSERT INTO organization_invitations (
    organization_id,
    email,
    role,
    permissions,
    invited_by,
    invitation_token,
    expires_at,
    status
  ) VALUES (
    p_organization_id,
    p_email,
    p_role,
    p_permissions,
    COALESCE(p_invited_by, auth.uid()),
    invitation_token,
    now() + interval '7 days',
    'pending'
  ) RETURNING id INTO new_invitation_id;
  
  -- IMPORTANT: Automatically add a placeholder user to organization_users
  -- This ensures the user is already in the organization when they accept the invitation
  INSERT INTO organization_users (
    organization_id,
    user_id,
    role,
    permissions,
    invited_by
  ) VALUES (
    p_organization_id,
    -- Use a placeholder UUID that will be updated when the real user account is created
    gen_random_uuid(), -- This will be a temporary placeholder
    p_role,
    p_permissions,
    COALESCE(p_invited_by, auth.uid())
  ) ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = now();
  
  RETURN invitation_token;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_organization_invitation_with_user_add(UUID, TEXT, organization_role, organization_permission[], UUID) TO authenticated;

-- Also create a function to update the placeholder user_id when the real account is created
CREATE OR REPLACE FUNCTION update_organization_user_after_signup(
  p_invitation_token TEXT,
  p_real_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM organization_invitations
  WHERE invitation_token = p_invitation_token
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update the organization_users record with the real user_id
  UPDATE organization_users
  SET 
    user_id = p_real_user_id,
    updated_at = now()
  WHERE organization_id = invitation_record.organization_id
  AND role = invitation_record.role
  AND invited_by = invitation_record.invited_by;
  
  -- Mark invitation as accepted
  UPDATE organization_invitations
  SET 
    status = 'accepted',
    updated_at = now()
  WHERE id = invitation_record.id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_organization_user_after_signup(TEXT, UUID) TO authenticated;

-- Verify the functions were created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN (
  'send_organization_invitation_with_user_add',
  'update_organization_user_after_signup'
)
AND routine_schema = 'public';
