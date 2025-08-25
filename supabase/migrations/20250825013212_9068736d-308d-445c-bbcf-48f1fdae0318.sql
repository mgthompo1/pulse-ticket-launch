-- Create organization roles enum
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Create organization permissions enum  
CREATE TYPE organization_permission AS ENUM (
  'manage_events',
  'edit_events', 
  'view_events',
  'manage_payments',
  'view_payments',
  'manage_users',
  'view_analytics'
);

-- Create organization users table
CREATE TABLE organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'viewer',
  permissions organization_permission[] DEFAULT ARRAY[]::organization_permission[],
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Create organization invitations table
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role organization_role NOT NULL DEFAULT 'viewer',
  permissions organization_permission[] DEFAULT ARRAY[]::organization_permission[],
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_users
CREATE POLICY "Organization members can view other members"
ON organization_users FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT ou.organization_id 
    FROM organization_users ou 
    WHERE ou.user_id = auth.uid()
  )
  OR 
  organization_id IN (
    SELECT o.id 
    FROM organizations o 
    WHERE o.user_id = auth.uid()
  )
);

CREATE POLICY "Organization owners can manage users"
ON organization_users FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT o.id 
    FROM organizations o 
    WHERE o.user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT o.id 
    FROM organizations o 
    WHERE o.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join organizations via invitation"
ON organization_users FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS policies for organization_invitations  
CREATE POLICY "Organization owners can manage invitations"
ON organization_invitations FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT o.id 
    FROM organizations o 
    WHERE o.user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT o.id 
    FROM organizations o 
    WHERE o.user_id = auth.uid()
  )
);

CREATE POLICY "Invited users can view their invitations"
ON organization_invitations FOR SELECT
TO authenticated
USING (
  email IN (
    SELECT au.email 
    FROM auth.users au 
    WHERE au.id = auth.uid()
  )
);

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_permission organization_permission
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to get user role in organization
CREATE OR REPLACE FUNCTION get_user_organization_role(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS organization_role
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to accept invitation
CREATE OR REPLACE FUNCTION accept_organization_invitation(
  p_invitation_token TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Update updated_at columns automatically
CREATE TRIGGER update_organization_users_updated_at
  BEFORE UPDATE ON organization_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_invitations_updated_at
  BEFORE UPDATE ON organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();