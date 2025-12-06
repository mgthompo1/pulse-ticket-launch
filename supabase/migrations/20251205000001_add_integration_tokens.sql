-- Integration tokens table for cross-platform authentication
-- Allows Givvv to securely access TicketFlo data

CREATE TABLE IF NOT EXISTS integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_platform TEXT NOT NULL, -- 'givvv', 'other_platform', etc.
  partner_organization_id TEXT, -- The org ID on the partner platform
  access_token TEXT NOT NULL UNIQUE, -- The token Givvv will use
  token_hash TEXT NOT NULL, -- SHA256 hash for secure lookup
  scopes TEXT[] DEFAULT ARRAY['events:read', 'orders:read'], -- What this token can access
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ, -- NULL = never expires
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,

  -- Only one active token per org/platform combo
  CONSTRAINT unique_active_integration UNIQUE (organization_id, partner_platform, is_active)
);

-- Pending authorization codes (temporary, for OAuth flow)
CREATE TABLE IF NOT EXISTS integration_auth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_platform TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  state TEXT, -- CSRF protection
  scopes TEXT[] DEFAULT ARRAY['events:read', 'orders:read'],
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_tokens_org ON integration_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_tokens_hash ON integration_tokens(token_hash) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_integration_tokens_partner ON integration_tokens(partner_platform, is_active);
CREATE INDEX IF NOT EXISTS idx_integration_auth_codes_code ON integration_auth_codes(code) WHERE used_at IS NULL;

-- RLS policies
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_auth_codes ENABLE ROW LEVEL SECURITY;

-- Org admins can manage their integration tokens
CREATE POLICY "Org admins can view integration tokens"
  ON integration_tokens FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org admins can create integration tokens"
  ON integration_tokens FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org admins can update integration tokens"
  ON integration_tokens FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Auth codes - org admins only
CREATE POLICY "Org admins can view auth codes"
  ON integration_auth_codes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org admins can create auth codes"
  ON integration_auth_codes FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Add comment for documentation
COMMENT ON TABLE integration_tokens IS 'Stores API tokens for partner platform integrations (e.g., Givvv)';
COMMENT ON TABLE integration_auth_codes IS 'Temporary OAuth authorization codes for partner integrations';
