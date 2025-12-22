-- Fix RLS policy for integration_auth_codes to include direct org owners
-- The current policy only checks organization_users, but users can also own orgs
-- directly via organizations.user_id

-- Drop existing policies
DROP POLICY IF EXISTS "Org admins can view auth codes" ON integration_auth_codes;
DROP POLICY IF EXISTS "Org admins can create auth codes" ON integration_auth_codes;

-- Recreate with check for both organization_users AND direct ownership
CREATE POLICY "Org admins can view auth codes"
  ON integration_auth_codes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    organization_id IN (
      SELECT id FROM organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can create auth codes"
  ON integration_auth_codes FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    organization_id IN (
      SELECT id FROM organizations
      WHERE user_id = auth.uid()
    )
  );

-- Also fix the integration_tokens table policies for consistency
DROP POLICY IF EXISTS "Org admins can view integration tokens" ON integration_tokens;
DROP POLICY IF EXISTS "Org admins can create integration tokens" ON integration_tokens;
DROP POLICY IF EXISTS "Org admins can update integration tokens" ON integration_tokens;

CREATE POLICY "Org admins can view integration tokens"
  ON integration_tokens FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    organization_id IN (
      SELECT id FROM organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can create integration tokens"
  ON integration_tokens FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    organization_id IN (
      SELECT id FROM organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can update integration tokens"
  ON integration_tokens FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    organization_id IN (
      SELECT id FROM organizations
      WHERE user_id = auth.uid()
    )
  );
