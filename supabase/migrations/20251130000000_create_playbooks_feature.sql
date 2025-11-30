-- Event Marketing Playbooks Feature
-- CRM-agnostic architecture supporting HubSpot, Pipedrive, Salesforce, or standalone mode

-- =============================================================================
-- ORGANIZATION SETTINGS
-- =============================================================================

-- Add playbooks feature toggle to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS playbooks_enabled BOOLEAN DEFAULT FALSE;

-- Add playbooks T&Cs acceptance tracking
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS playbooks_terms_accepted_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS playbooks_terms_accepted_by UUID REFERENCES auth.users(id);

-- =============================================================================
-- CRM INTEGRATIONS (Abstract Layer)
-- =============================================================================

-- Generic CRM connections table (extends existing hubspot_connections pattern)
-- This allows multiple CRM types with a unified interface
CREATE TABLE IF NOT EXISTS crm_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- CRM Type
  crm_type TEXT NOT NULL CHECK (crm_type IN ('hubspot', 'pipedrive', 'salesforce', 'none')),

  -- OAuth tokens (encrypted in practice)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- CRM account info (generic)
  external_account_id TEXT,        -- Portal ID, Account ID, etc.
  external_account_name TEXT,      -- Company name in CRM
  connected_user_email TEXT,       -- Who connected it

  -- Connection status
  connection_status TEXT NOT NULL DEFAULT 'connected'
    CHECK (connection_status IN ('connected', 'disconnected', 'error', 'token_expired')),
  last_error TEXT,

  -- Feature flags for this connection
  sync_contacts_enabled BOOLEAN DEFAULT TRUE,
  sync_timeline_enabled BOOLEAN DEFAULT TRUE,
  sync_lists_enabled BOOLEAN DEFAULT TRUE,

  -- Timestamps
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active connection per CRM type per org
  UNIQUE(organization_id, crm_type)
);

-- =============================================================================
-- PLAYBOOK TEMPLATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Playbook Identity
  name TEXT NOT NULL,
  description TEXT,
  playbook_type TEXT NOT NULL CHECK (playbook_type IN (
    'prospect_event',      -- Invite prospects, identify hot leads
    'customer_event',      -- Customer appreciation, upsell opportunities
    'partner_summit',      -- Partner engagement, training
    'product_launch',      -- Generate buzz, capture interest
    'webinar',             -- Virtual events, registration tracking
    'custom'               -- User-defined
  )),

  -- Visual
  icon TEXT,               -- Emoji or icon name
  color TEXT,              -- Brand color for the playbook

  -- Default Event Settings
  default_settings JSONB NOT NULL DEFAULT '{
    "access_type": "invite_only",
    "allow_waitlist": true,
    "require_approval": false,
    "track_engagement": true,
    "enable_notes": true,
    "enable_tagging": true
  }'::jsonb,

  -- CRM Integration Settings (optional - works without CRM too)
  crm_settings JSONB DEFAULT '{
    "import_source": null,
    "sync_registrations": true,
    "sync_attendance": true,
    "sync_notes": false,
    "sync_outcomes": true,
    "create_timeline_events": true
  }'::jsonb,

  -- Outcome Tags Configuration
  outcome_tags JSONB NOT NULL DEFAULT '[
    {"id": "hot_lead", "label": "Hot Lead", "icon": "flame", "color": "red"},
    {"id": "warm", "label": "Warm", "icon": "thermometer", "color": "orange"},
    {"id": "cold", "label": "Cold", "icon": "snowflake", "color": "blue"},
    {"id": "follow_up", "label": "Follow Up Needed", "icon": "phone", "color": "purple"},
    {"id": "not_interested", "label": "Not Interested", "icon": "x", "color": "gray"}
  ]'::jsonb,

  -- Follow-up Configuration
  follow_up_settings JSONB DEFAULT '{
    "auto_segment_attendees": true,
    "auto_segment_no_shows": true,
    "trigger_workflows": false
  }'::jsonb,

  -- Is this a system template or user-created?
  is_system_template BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- EVENT EXTENSIONS FOR PLAYBOOKS
-- =============================================================================

-- Add playbook-related fields to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS playbook_id UUID REFERENCES event_playbooks(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'public'
  CHECK (access_type IN ('public', 'invite_only', 'password', 'approval_required'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS access_password TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS invite_capacity INTEGER;  -- Can exceed ticket capacity
ALTER TABLE events ADD COLUMN IF NOT EXISTS track_engagement BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS engagement_tracking_consent_text TEXT;

-- =============================================================================
-- EVENT INVITES (The Guest List)
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Contact Reference (flexible - can be TFlo contact, CRM reference, or standalone)
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- CRM Reference (generic - works with any CRM)
  crm_type TEXT,                   -- 'hubspot', 'pipedrive', 'salesforce', null
  crm_contact_id TEXT,             -- External CRM contact ID

  -- Contact Info (denormalized for standalone mode & display)
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  job_title TEXT,
  phone TEXT,

  -- CRM Context (imported from CRM if available)
  crm_context JSONB DEFAULT '{}',  -- Deal stage, lifecycle, owner, custom fields, etc.

  -- Invite Tracking
  invite_status TEXT NOT NULL DEFAULT 'pending' CHECK (invite_status IN (
    'pending',      -- Not yet invited
    'invited',      -- Invite sent
    'opened',       -- Email opened (if tracked)
    'clicked',      -- Link clicked
    'registered',   -- Registered for event
    'waitlisted',   -- On waitlist
    'declined',     -- Declined invite
    'cancelled'     -- Registration cancelled
  )),

  invite_sent_at TIMESTAMPTZ,
  invite_sent_via TEXT,            -- 'email', 'crm', 'manual', 'sms'
  invite_opened_at TIMESTAMPTZ,
  invite_clicked_at TIMESTAMPTZ,
  unique_invite_code TEXT UNIQUE,  -- For tracked invite links

  -- Registration
  registered_at TIMESTAMPTZ,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  registration_source TEXT,        -- 'invite_link', 'direct', 'crm_form'

  -- Attendance
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id),
  check_in_method TEXT,            -- 'scan', 'manual', 'self'

  -- Engagement & Outcomes
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  outcome_tag TEXT,                -- References playbook outcome_tags
  outcome_tagged_at TIMESTAMPTZ,
  outcome_tagged_by UUID REFERENCES auth.users(id),
  follow_up_priority TEXT CHECK (follow_up_priority IN ('high', 'medium', 'low', 'none')),
  follow_up_owner UUID REFERENCES auth.users(id),
  follow_up_date DATE,

  -- Privacy & Consent
  tracking_consent BOOLEAN DEFAULT FALSE,
  tracking_consent_at TIMESTAMPTZ,
  data_processing_consent BOOLEAN DEFAULT FALSE,

  -- CRM Sync Status
  crm_synced_at TIMESTAMPTZ,
  crm_sync_status TEXT DEFAULT 'pending' CHECK (crm_sync_status IN ('pending', 'synced', 'error', 'skipped')),
  crm_sync_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One invite per email per event
  UNIQUE(event_id, email)
);

-- =============================================================================
-- ATTENDEE NOTES & INTERACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_attendee_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_invite_id UUID NOT NULL REFERENCES event_invites(id) ON DELETE CASCADE,

  -- Note Content
  note_type TEXT NOT NULL CHECK (note_type IN (
    'conversation',    -- General conversation notes
    'interest',        -- Product/service interest noted
    'objection',       -- Objection or concern raised
    'follow_up',       -- Follow-up action needed
    'introduction',    -- Introduced to someone
    'feedback',        -- Product/event feedback
    'observation',     -- General observation
    'custom'           -- User-defined
  )),
  content TEXT NOT NULL,

  -- Context
  noted_by UUID NOT NULL REFERENCES auth.users(id),
  noted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optional: Location/Session context
  session_name TEXT,
  location TEXT,

  -- Privacy flag
  is_private BOOLEAN DEFAULT FALSE,  -- If true, don't sync to CRM

  -- CRM Sync
  crm_synced BOOLEAN DEFAULT FALSE,
  crm_engagement_id TEXT,           -- ID in the CRM system

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- EVENT SUMMARY & ANALYTICS
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_playbook_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,

  -- Attendance Metrics
  total_invited INTEGER DEFAULT 0,
  total_registered INTEGER DEFAULT 0,
  total_attended INTEGER DEFAULT 0,
  total_no_show INTEGER DEFAULT 0,
  total_declined INTEGER DEFAULT 0,

  -- Outcome Metrics (JSONB for flexible outcome tags)
  outcome_counts JSONB DEFAULT '{}',  -- {"hot_lead": 5, "warm": 12, ...}

  -- Engagement Metrics
  avg_engagement_score DECIMAL(5,2),

  -- Pipeline Impact (if CRM connected)
  total_deal_value DECIMAL(15,2),
  attended_deal_value DECIMAL(15,2),
  hot_leads_deal_value DECIMAL(15,2),

  -- Follow-up Metrics
  total_follow_ups_scheduled INTEGER DEFAULT 0,
  follow_ups_completed INTEGER DEFAULT 0,

  -- CRM Sync Status
  last_crm_sync_at TIMESTAMPTZ,
  crm_sync_status TEXT,

  -- Calculated at
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_crm_connections_org ON crm_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_connections_type ON crm_connections(crm_type);
CREATE INDEX IF NOT EXISTS idx_event_playbooks_org ON event_playbooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_playbooks_type ON event_playbooks(playbook_type);
CREATE INDEX IF NOT EXISTS idx_event_invites_event ON event_invites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invites_email ON event_invites(email);
CREATE INDEX IF NOT EXISTS idx_event_invites_status ON event_invites(invite_status);
CREATE INDEX IF NOT EXISTS idx_event_invites_outcome ON event_invites(outcome_tag);
CREATE INDEX IF NOT EXISTS idx_event_invites_crm ON event_invites(crm_type, crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_event_attendee_notes_invite ON event_attendee_notes(event_invite_id);
CREATE INDEX IF NOT EXISTS idx_events_playbook ON events(playbook_id);
CREATE INDEX IF NOT EXISTS idx_events_access_type ON events(access_type);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_playbook_summaries ENABLE ROW LEVEL SECURITY;

-- CRM Connections: Org owners and admins only
CREATE POLICY crm_connections_policy ON crm_connections
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
    OR organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Event Playbooks: Org members can view, owners/admins can modify
CREATE POLICY event_playbooks_select ON event_playbooks
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
    OR organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY event_playbooks_modify ON event_playbooks
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
    OR organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Event Invites: Org members can access
CREATE POLICY event_invites_policy ON event_invites
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
      )
      OR e.organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Attendee Notes: Org members can access
CREATE POLICY event_attendee_notes_policy ON event_attendee_notes
  FOR ALL USING (
    event_invite_id IN (
      SELECT ei.id FROM event_invites ei
      JOIN events e ON e.id = ei.event_id
      WHERE e.organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
      )
      OR e.organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Playbook Summaries: Org members can access
CREATE POLICY event_playbook_summaries_policy ON event_playbook_summaries
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
      )
      OR e.organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_playbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_connections_updated_at
  BEFORE UPDATE ON crm_connections
  FOR EACH ROW EXECUTE FUNCTION update_playbooks_updated_at();

CREATE TRIGGER event_playbooks_updated_at
  BEFORE UPDATE ON event_playbooks
  FOR EACH ROW EXECUTE FUNCTION update_playbooks_updated_at();

CREATE TRIGGER event_invites_updated_at
  BEFORE UPDATE ON event_invites
  FOR EACH ROW EXECUTE FUNCTION update_playbooks_updated_at();

CREATE TRIGGER event_playbook_summaries_updated_at
  BEFORE UPDATE ON event_playbook_summaries
  FOR EACH ROW EXECUTE FUNCTION update_playbooks_updated_at();

-- =============================================================================
-- SEED SYSTEM PLAYBOOK TEMPLATES
-- =============================================================================

-- These are "template" playbooks that orgs can copy/customize
-- They have a NULL organization_id to indicate they're system templates
-- Note: We'll insert these via a function that checks if they exist

CREATE OR REPLACE FUNCTION seed_system_playbooks()
RETURNS void AS $$
BEGIN
  -- Only insert if no system templates exist
  IF NOT EXISTS (SELECT 1 FROM event_playbooks WHERE is_system_template = true LIMIT 1) THEN

    -- Note: System templates need a valid org_id due to FK constraint
    -- We'll handle this differently - templates will be created per-org when they enable playbooks

  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to create default playbooks when org enables the feature
CREATE OR REPLACE FUNCTION create_default_playbooks_for_org(p_organization_id UUID)
RETURNS void AS $$
BEGIN
  -- Prospect Event
  INSERT INTO event_playbooks (organization_id, name, description, playbook_type, icon, color, is_system_template)
  VALUES (
    p_organization_id,
    'Prospect Event',
    'Invite prospects to an exclusive event, track engagement, and identify hot leads for follow-up.',
    'prospect_event',
    '🎯',
    '#ef4444',
    false
  ) ON CONFLICT DO NOTHING;

  -- Customer Appreciation
  INSERT INTO event_playbooks (organization_id, name, description, playbook_type, icon, color, is_system_template)
  VALUES (
    p_organization_id,
    'Customer Appreciation',
    'Strengthen customer relationships, gather feedback, and identify upsell opportunities.',
    'customer_event',
    '💝',
    '#ec4899',
    false
  ) ON CONFLICT DO NOTHING;

  -- Partner Summit
  INSERT INTO event_playbooks (organization_id, name, description, playbook_type, icon, color, is_system_template)
  VALUES (
    p_organization_id,
    'Partner Summit',
    'Engage partners, deliver training, and strengthen strategic relationships.',
    'partner_summit',
    '🤝',
    '#8b5cf6',
    false
  ) ON CONFLICT DO NOTHING;

  -- Product Launch
  INSERT INTO event_playbooks (organization_id, name, description, playbook_type, icon, color, is_system_template)
  VALUES (
    p_organization_id,
    'Product Launch',
    'Generate buzz, capture interest, and accelerate your sales pipeline.',
    'product_launch',
    '🚀',
    '#3b82f6',
    false
  ) ON CONFLICT DO NOTHING;

  -- Webinar
  INSERT INTO event_playbooks (organization_id, name, description, playbook_type, icon, color, is_system_template)
  VALUES (
    p_organization_id,
    'Webinar',
    'Virtual events with registration tracking, attendance monitoring, and follow-up automation.',
    'webinar',
    '🎥',
    '#10b981',
    false
  ) ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate event summary
CREATE OR REPLACE FUNCTION calculate_event_playbook_summary(p_event_id UUID)
RETURNS void AS $$
DECLARE
  v_summary RECORD;
BEGIN
  -- Calculate summary metrics
  SELECT
    COUNT(*) as total_invited,
    COUNT(*) FILTER (WHERE invite_status = 'registered') as total_registered,
    COUNT(*) FILTER (WHERE checked_in = true) as total_attended,
    COUNT(*) FILTER (WHERE invite_status = 'registered' AND checked_in = false) as total_no_show,
    COUNT(*) FILTER (WHERE invite_status = 'declined') as total_declined,
    AVG(engagement_score) FILTER (WHERE engagement_score > 0) as avg_engagement,
    jsonb_object_agg(
      COALESCE(outcome_tag, 'untagged'),
      COUNT(*) FILTER (WHERE outcome_tag IS NOT NULL OR outcome_tag IS NULL)
    ) as outcomes
  INTO v_summary
  FROM event_invites
  WHERE event_id = p_event_id;

  -- Upsert summary
  INSERT INTO event_playbook_summaries (
    event_id,
    total_invited,
    total_registered,
    total_attended,
    total_no_show,
    total_declined,
    avg_engagement_score,
    outcome_counts,
    calculated_at
  )
  VALUES (
    p_event_id,
    COALESCE(v_summary.total_invited, 0),
    COALESCE(v_summary.total_registered, 0),
    COALESCE(v_summary.total_attended, 0),
    COALESCE(v_summary.total_no_show, 0),
    COALESCE(v_summary.total_declined, 0),
    v_summary.avg_engagement,
    COALESCE(v_summary.outcomes, '{}'),
    NOW()
  )
  ON CONFLICT (event_id) DO UPDATE SET
    total_invited = EXCLUDED.total_invited,
    total_registered = EXCLUDED.total_registered,
    total_attended = EXCLUDED.total_attended,
    total_no_show = EXCLUDED.total_no_show,
    total_declined = EXCLUDED.total_declined,
    avg_engagement_score = EXCLUDED.avg_engagement_score,
    outcome_counts = EXCLUDED.outcome_counts,
    calculated_at = EXCLUDED.calculated_at,
    updated_at = NOW();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE crm_connections IS 'Generic CRM connection storage supporting multiple CRM types';
COMMENT ON TABLE event_playbooks IS 'Playbook templates for different event marketing scenarios';
COMMENT ON TABLE event_invites IS 'Guest list for playbook events with full lifecycle tracking';
COMMENT ON TABLE event_attendee_notes IS 'Notes and observations captured during events';
COMMENT ON TABLE event_playbook_summaries IS 'Aggregated metrics for playbook events';
COMMENT ON COLUMN event_invites.tracking_consent IS 'Whether the invitee consented to engagement tracking';
COMMENT ON COLUMN event_attendee_notes.is_private IS 'If true, note will not be synced to external CRM';
