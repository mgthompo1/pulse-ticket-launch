-- Fix RLS policies for crm_emails to include organization owners
-- The original policies only checked organization_users table but missed organization owners

-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can view crm emails" ON crm_emails;
DROP POLICY IF EXISTS "Organization members can send crm emails" ON crm_emails;
DROP POLICY IF EXISTS "Organization members can update crm emails" ON crm_emails;

-- Recreate SELECT policy to include both owners and members
CREATE POLICY "Organization members can view crm emails"
    ON crm_emails
    FOR SELECT
    USING (
        organization_id IN (
            -- Check if user is a member
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()

            UNION

            -- Check if user is the owner
            SELECT id
            FROM organizations
            WHERE user_id = auth.uid()
        )
    );

-- Recreate INSERT policy to include both owners and members
CREATE POLICY "Organization members can send crm emails"
    ON crm_emails
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            -- Check if user is a member
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()

            UNION

            -- Check if user is the owner
            SELECT id
            FROM organizations
            WHERE user_id = auth.uid()
        )
    );

-- Recreate UPDATE policy to include both owners and members
CREATE POLICY "Organization members can update crm emails"
    ON crm_emails
    FOR UPDATE
    USING (
        organization_id IN (
            -- Check if user is a member
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()

            UNION

            -- Check if user is the owner
            SELECT id
            FROM organizations
            WHERE user_id = auth.uid()
        )
    );
