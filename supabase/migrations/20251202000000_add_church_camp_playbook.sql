-- Migration: Add Church Camp playbook type and waiver support
-- This adds the church_camp playbook type and waiver-related columns to event_invites

-- Step 1: Alter the playbook_type check constraint to include church_camp
-- First drop the old constraint
ALTER TABLE event_playbooks DROP CONSTRAINT IF EXISTS event_playbooks_playbook_type_check;

-- Add new constraint with church_camp included
ALTER TABLE event_playbooks ADD CONSTRAINT event_playbooks_playbook_type_check
CHECK (playbook_type IN (
  'prospect_event',
  'customer_event',
  'partner_summit',
  'product_launch',
  'webinar',
  'church_camp',
  'custom'
));

-- Step 2: Add waiver-related columns to event_invites
ALTER TABLE event_invites
ADD COLUMN IF NOT EXISTS waiver_status TEXT DEFAULT 'not_required' CHECK (waiver_status IN (
  'not_required',    -- No waiver needed
  'pending',         -- Waiver sent, awaiting signature
  'signed',          -- Waiver has been signed
  'expired'          -- Waiver signature has expired
)),
ADD COLUMN IF NOT EXISTS waiver_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS waiver_signed_by TEXT,           -- Name of person who signed (parent/guardian)
ADD COLUMN IF NOT EXISTS waiver_document_id TEXT,         -- Reference to signed document
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
ADD COLUMN IF NOT EXISTS medical_notes TEXT,              -- Allergies, medications, etc.
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dietary_requirements TEXT,
ADD COLUMN IF NOT EXISTS special_needs TEXT;

-- Step 3: Add waiver settings to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS require_waiver BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS waiver_template_id TEXT,
ADD COLUMN IF NOT EXISTS waiver_instructions TEXT,
ADD COLUMN IF NOT EXISTS collect_emergency_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS collect_medical_info BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS collect_dietary_requirements BOOLEAN DEFAULT false;

-- Step 4: Create index for waiver status queries
CREATE INDEX IF NOT EXISTS idx_event_invites_waiver_status ON event_invites(waiver_status);
CREATE INDEX IF NOT EXISTS idx_event_invites_group ON event_invites(group_id);

-- Step 5: Update the create_default_playbooks_for_org function to include Church Camp
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

  -- Church Camp (NEW)
  INSERT INTO event_playbooks (organization_id, name, description, playbook_type, icon, color, is_system_template)
  VALUES (
    p_organization_id,
    'Church Camp',
    'Organize youth camps, retreats, and ministry events with waivers, groups, and seamless check-in.',
    'church_camp',
    '⛪',
    '#f59e0b',
    false
  ) ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Add RLS policies for the new columns (inherits existing event_invites policies)
-- No additional policies needed as they inherit from the table-level policies

COMMENT ON COLUMN event_invites.waiver_status IS 'Status of waiver signing: not_required, pending, signed, expired';
COMMENT ON COLUMN event_invites.group_id IS 'Reference to group/cabin assignment for camps';
COMMENT ON COLUMN event_invites.emergency_contact_name IS 'Emergency contact for minors attending camps';
COMMENT ON COLUMN events.require_waiver IS 'Whether this event requires attendees to sign a waiver';
