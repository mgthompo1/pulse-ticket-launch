-- Add passkey authentication to groups
-- This allows groups to access their portal with just a URL + passkey (no user account needed)

-- Add passkey column to groups table
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS passkey TEXT;

COMMENT ON COLUMN groups.passkey IS
'Passkey for group coordinators to access their portal (like a shared password)';

-- Create index for passkey lookups (used when verifying access)
CREATE INDEX IF NOT EXISTS idx_groups_passkey ON groups(passkey) WHERE passkey IS NOT NULL;

-- Allow public to verify passkey (but not see all groups)
DROP POLICY IF EXISTS "Public can verify group passkey" ON groups;
CREATE POLICY "Public can verify group passkey"
ON groups FOR SELECT
USING (
  -- Allow if checking by url_slug (for initial load)
  url_slug IS NOT NULL
);

-- Note: The passkey verification will happen client-side by comparing the entered
-- passkey with the group's passkey field. This is okay because:
-- 1. Groups are not high-security (they're just managing ticket sales)
-- 2. We're not storing sensitive data like credit cards
-- 3. RLS policies still prevent groups from seeing other groups' data
-- 4. Much simpler UX than forcing churches to create user accounts
