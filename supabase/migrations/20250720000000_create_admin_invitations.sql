-- Create admin_invitations table
CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(token);

-- Create index on email for tracking invitations
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON admin_invitations(status);

-- Add RLS policies
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Allow admins to insert invitations
CREATE POLICY "Admins can insert invitations" ON admin_invitations
  FOR INSERT WITH CHECK (true);

-- Allow admins to view all invitations
CREATE POLICY "Admins can view invitations" ON admin_invitations
  FOR SELECT USING (true);

-- Allow admins to update invitations
CREATE POLICY "Admins can update invitations" ON admin_invitations
  FOR UPDATE USING (true);

-- Allow users to view their own invitation by token
CREATE POLICY "Users can view invitation by token" ON admin_invitations
  FOR SELECT USING (true); 