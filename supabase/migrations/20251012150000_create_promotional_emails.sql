-- Create promotional_emails table
CREATE TABLE IF NOT EXISTS promotional_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),

  subject_line TEXT NOT NULL,
  description TEXT,
  template JSONB NOT NULL DEFAULT '{}'::jsonb,

  recipient_type TEXT NOT NULL DEFAULT 'all' CHECK (recipient_type IN ('all', 'past_attendees', 'interests', 'location')),

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),

  send_immediately BOOLEAN DEFAULT false,
  scheduled_send_time TIMESTAMPTZ,
  actual_send_time TIMESTAMPTZ,

  total_recipients INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_failed INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_promotional_emails_organization ON promotional_emails(organization_id);
CREATE INDEX IF NOT EXISTS idx_promotional_emails_event ON promotional_emails(event_id);
CREATE INDEX IF NOT EXISTS idx_promotional_emails_status ON promotional_emails(status);
CREATE INDEX IF NOT EXISTS idx_promotional_emails_scheduled_send ON promotional_emails(scheduled_send_time) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_promotional_emails_created_by ON promotional_emails(created_by);

-- Enable Row Level Security
ALTER TABLE promotional_emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view promotional emails for their organization"
  ON promotional_emails FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create promotional emails for their organization"
  ON promotional_emails FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can update promotional emails for their organization"
  ON promotional_emails FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can delete promotional emails for their organization"
  ON promotional_emails FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_promotional_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_promotional_emails_updated_at
  BEFORE UPDATE ON promotional_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_promotional_emails_updated_at();

-- Add comment to table
COMMENT ON TABLE promotional_emails IS 'Stores promotional email campaigns for events with customizable templates and scheduling';
