-- Fix RLS policies to include organization owners (via organizations.user_id)
-- The original policies only checked organization_users table

-- Drop existing policies
DROP POLICY IF EXISTS "Users with CRM access can view contacts" ON contacts;
DROP POLICY IF EXISTS "Users with manage CRM permission can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Users with manage CRM permission can update contacts" ON contacts;
DROP POLICY IF EXISTS "Only owners and admins can delete contacts" ON contacts;

DROP POLICY IF EXISTS "Users with CRM access can view donations" ON donations;
DROP POLICY IF EXISTS "Users with manage CRM permission can insert donations" ON donations;
DROP POLICY IF EXISTS "Users with manage CRM permission can update donations" ON donations;

DROP POLICY IF EXISTS "Users with CRM access can view contact events" ON contact_events;
DROP POLICY IF EXISTS "Users with manage CRM permission can insert contact events" ON contact_events;
DROP POLICY IF EXISTS "Users with manage CRM permission can update contact events" ON contact_events;

-- Recreate contacts policies with organization owner check
CREATE POLICY "Users with CRM access can view contacts"
  ON contacts FOR SELECT
  USING (
    -- Organization owner
    EXISTS (
      SELECT 1 FROM organizations org
      WHERE org.id = contacts.organization_id
        AND org.user_id = auth.uid()
    )
    OR
    -- Organization members with CRM access
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = contacts.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
          OR 'view_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can insert contacts"
  ON contacts FOR INSERT
  WITH CHECK (
    -- Organization owner
    EXISTS (
      SELECT 1 FROM organizations org
      WHERE org.id = contacts.organization_id
        AND org.user_id = auth.uid()
    )
    OR
    -- Organization members with CRM manage permission
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = contacts.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can update contacts"
  ON contacts FOR UPDATE
  USING (
    -- Organization owner
    EXISTS (
      SELECT 1 FROM organizations org
      WHERE org.id = contacts.organization_id
        AND org.user_id = auth.uid()
    )
    OR
    -- Organization members with CRM manage permission
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = contacts.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Only owners and admins can delete contacts"
  ON contacts FOR DELETE
  USING (
    -- Organization owner
    EXISTS (
      SELECT 1 FROM organizations org
      WHERE org.id = contacts.organization_id
        AND org.user_id = auth.uid()
    )
    OR
    -- Organization members with owner/admin role
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = contacts.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Recreate donations policies with organization owner check
CREATE POLICY "Users with CRM access can view donations"
  ON donations FOR SELECT
  USING (
    -- Organization owner
    EXISTS (
      SELECT 1 FROM organizations org
      WHERE org.id = donations.organization_id
        AND org.user_id = auth.uid()
    )
    OR
    -- Organization members with CRM access
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = donations.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
          OR 'view_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can insert donations"
  ON donations FOR INSERT
  WITH CHECK (
    -- Organization owner
    EXISTS (
      SELECT 1 FROM organizations org
      WHERE org.id = donations.organization_id
        AND org.user_id = auth.uid()
    )
    OR
    -- Organization members with CRM manage permission
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = donations.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can update donations"
  ON donations FOR UPDATE
  USING (
    -- Organization owner
    EXISTS (
      SELECT 1 FROM organizations org
      WHERE org.id = donations.organization_id
        AND org.user_id = auth.uid()
    )
    OR
    -- Organization members with CRM manage permission
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = donations.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

-- Recreate contact_events policies with organization owner check
CREATE POLICY "Users with CRM access can view contact events"
  ON contact_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN organizations org ON org.id = c.organization_id
      WHERE c.id = contact_events.contact_id
        AND org.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN organization_users om ON om.organization_id = c.organization_id
      WHERE c.id = contact_events.contact_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
          OR 'view_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can insert contact events"
  ON contact_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN organizations org ON org.id = c.organization_id
      WHERE c.id = contact_events.contact_id
        AND org.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN organization_users om ON om.organization_id = c.organization_id
      WHERE c.id = contact_events.contact_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can update contact events"
  ON contact_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN organizations org ON org.id = c.organization_id
      WHERE c.id = contact_events.contact_id
        AND org.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN organization_users om ON om.organization_id = c.organization_id
      WHERE c.id = contact_events.contact_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );
