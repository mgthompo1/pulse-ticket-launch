-- HubSpot Integration Schema
-- Stores OAuth connections, sync settings, and field mappings

-- HubSpot Connections table
CREATE TABLE IF NOT EXISTS hubspot_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- HubSpot account info
  hub_id TEXT NOT NULL, -- HubSpot portal ID
  hub_domain TEXT, -- e.g., "company.hubspot.com"
  user_email TEXT, -- Email of user who connected

  -- Connection status
  connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'token_expired')),
  last_error TEXT,

  -- Sync settings (manual sync only, no auto-sync)
  sync_settings JSONB NOT NULL DEFAULT '{
    "conflict_resolution": "ticketflo_wins",
    "create_custom_properties": true,
    "sync_tags": true,
    "include_order_history": true
  }'::jsonb,
  -- conflict_resolution options: "ticketflo_wins", "hubspot_wins", "most_recent_wins"

  -- Timestamps
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One connection per organization
  UNIQUE(organization_id)
);

-- HubSpot Field Mappings table
-- Allows organizations to customize how TFlo fields map to HubSpot properties
CREATE TABLE IF NOT EXISTS hubspot_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_connection_id UUID NOT NULL REFERENCES hubspot_connections(id) ON DELETE CASCADE,

  -- Mapping configuration
  ticketflo_field TEXT NOT NULL, -- e.g., 'first_name', 'total_spent', 'tags'
  hubspot_property TEXT NOT NULL, -- e.g., 'firstname', 'ticketflo_total_spent'
  sync_direction TEXT NOT NULL DEFAULT 'both' CHECK (sync_direction IN ('push', 'pull', 'both')),
  is_custom_property BOOLEAN NOT NULL DEFAULT false, -- If true, we created this property in HubSpot
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Transformation (optional)
  transform_type TEXT CHECK (transform_type IN ('none', 'currency', 'date', 'array_to_string', 'string_to_array')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(hubspot_connection_id, ticketflo_field)
);

-- HubSpot Sync Logs table
-- Track all sync operations for debugging and audit
CREATE TABLE IF NOT EXISTS hubspot_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_connection_id UUID NOT NULL REFERENCES hubspot_connections(id) ON DELETE CASCADE,

  -- Operation details
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'contact_push', 'contact_pull', 'contact_update',
    'bulk_push', 'bulk_pull',
    'property_create', 'list_sync',
    'token_refresh', 'connection_test'
  )),

  -- Entity tracking
  ticketflo_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  hubspot_contact_id TEXT, -- HubSpot VID or record ID

  -- Result
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Request/response data for debugging
  request_data JSONB,
  response_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HubSpot Contact Mapping table
-- Links TFlo contacts to HubSpot contacts for deduplication
CREATE TABLE IF NOT EXISTS hubspot_contact_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_connection_id UUID NOT NULL REFERENCES hubspot_connections(id) ON DELETE CASCADE,

  ticketflo_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  hubspot_contact_id TEXT NOT NULL, -- HubSpot record ID

  -- Sync metadata
  last_pushed_at TIMESTAMPTZ,
  last_pulled_at TIMESTAMPTZ,
  push_hash TEXT, -- Hash of last pushed data to detect changes

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(hubspot_connection_id, ticketflo_contact_id),
  UNIQUE(hubspot_connection_id, hubspot_contact_id)
);

-- Add hubspot_contact_id to contacts table for quick lookup
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS hubspot_contact_id TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hubspot_connections_org ON hubspot_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_connections_status ON hubspot_connections(connection_status);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_logs_connection ON hubspot_sync_logs(hubspot_connection_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_logs_status ON hubspot_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_logs_created ON hubspot_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hubspot_contact_mappings_tflo ON hubspot_contact_mappings(ticketflo_contact_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_contact_mappings_hs ON hubspot_contact_mappings(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_id ON contacts(hubspot_contact_id) WHERE hubspot_contact_id IS NOT NULL;

-- RLS Policies
ALTER TABLE hubspot_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubspot_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubspot_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubspot_contact_mappings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage HubSpot connections for their organizations
CREATE POLICY hubspot_connections_policy ON hubspot_connections
  FOR ALL USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY hubspot_field_mappings_policy ON hubspot_field_mappings
  FOR ALL USING (
    hubspot_connection_id IN (
      SELECT hc.id FROM hubspot_connections hc
      JOIN organization_members om ON om.organization_id = hc.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY hubspot_sync_logs_policy ON hubspot_sync_logs
  FOR ALL USING (
    hubspot_connection_id IN (
      SELECT hc.id FROM hubspot_connections hc
      JOIN organization_members om ON om.organization_id = hc.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY hubspot_contact_mappings_policy ON hubspot_contact_mappings
  FOR ALL USING (
    hubspot_connection_id IN (
      SELECT hc.id FROM hubspot_connections hc
      JOIN organization_members om ON om.organization_id = hc.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_hubspot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER hubspot_connections_updated_at
  BEFORE UPDATE ON hubspot_connections
  FOR EACH ROW EXECUTE FUNCTION update_hubspot_updated_at();

CREATE TRIGGER hubspot_field_mappings_updated_at
  BEFORE UPDATE ON hubspot_field_mappings
  FOR EACH ROW EXECUTE FUNCTION update_hubspot_updated_at();

CREATE TRIGGER hubspot_contact_mappings_updated_at
  BEFORE UPDATE ON hubspot_contact_mappings
  FOR EACH ROW EXECUTE FUNCTION update_hubspot_updated_at();

-- Insert default field mappings when a connection is created
CREATE OR REPLACE FUNCTION create_default_hubspot_mappings()
RETURNS TRIGGER AS $$
BEGIN
  -- Standard contact fields (bidirectional)
  INSERT INTO hubspot_field_mappings (hubspot_connection_id, ticketflo_field, hubspot_property, sync_direction, is_custom_property)
  VALUES
    (NEW.id, 'email', 'email', 'both', false),
    (NEW.id, 'first_name', 'firstname', 'both', false),
    (NEW.id, 'last_name', 'lastname', 'both', false),
    (NEW.id, 'phone', 'phone', 'both', false),
    (NEW.id, 'city', 'city', 'both', false),
    (NEW.id, 'country', 'country', 'both', false),
    -- TFlo-specific fields (push only, custom properties)
    (NEW.id, 'total_spent', 'ticketflo_total_spent', 'push', true),
    (NEW.id, 'total_orders', 'ticketflo_total_orders', 'push', true),
    (NEW.id, 'lifetime_value', 'ticketflo_lifetime_value', 'push', true),
    (NEW.id, 'events_attended', 'ticketflo_events_attended', 'push', true),
    (NEW.id, 'last_order_date', 'ticketflo_last_order_date', 'push', true),
    (NEW.id, 'tags', 'ticketflo_tags', 'push', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_hubspot_default_mappings
  AFTER INSERT ON hubspot_connections
  FOR EACH ROW EXECUTE FUNCTION create_default_hubspot_mappings();

-- Comments
COMMENT ON TABLE hubspot_connections IS 'Stores HubSpot OAuth connections per organization';
COMMENT ON TABLE hubspot_field_mappings IS 'Configurable field mappings between TicketFlo and HubSpot';
COMMENT ON TABLE hubspot_sync_logs IS 'Audit log of all HubSpot sync operations';
COMMENT ON TABLE hubspot_contact_mappings IS 'Links TicketFlo contacts to HubSpot contact records';
