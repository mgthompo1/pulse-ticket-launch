-- Add Givvv integration fields to organizations table
-- This links a TicketFlo organization to a Givvv organization for donation features

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS givvv_organization_id UUID;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_givvv_org_id
ON organizations(givvv_organization_id)
WHERE givvv_organization_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN organizations.givvv_organization_id IS 'Links to Givvv organization for donation widget integration';
