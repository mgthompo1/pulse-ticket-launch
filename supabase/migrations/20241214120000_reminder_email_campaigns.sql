-- Reminder Email Campaign System
-- Extends existing email template system for marketing reminders

-- Email reminder campaigns table
CREATE TABLE IF NOT EXISTS reminder_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Campaign details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),

  -- Email template (reuses existing email template structure)
  template JSONB NOT NULL, -- EmailTemplate type from existing system
  subject_line VARCHAR(500) NOT NULL,

  -- Scheduling configuration
  send_timing VARCHAR(50) NOT NULL CHECK (send_timing IN ('days_before', 'hours_before', 'specific_datetime')),
  send_value INTEGER, -- Number of days/hours before event, or NULL for specific datetime
  send_datetime TIMESTAMPTZ, -- Specific datetime to send, or calculated datetime
  timezone VARCHAR(100) DEFAULT 'UTC',

  -- Recipient configuration
  recipient_type VARCHAR(50) DEFAULT 'all_attendees' CHECK (recipient_type IN ('all_attendees', 'ticket_holders_only', 'custom_segment')),
  recipient_filter JSONB, -- Custom filters for recipient selection

  -- Tracking and analytics
  total_recipients INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure reasonable scheduling
  CONSTRAINT reasonable_timing CHECK (
    (send_timing IN ('days_before', 'hours_before') AND send_value IS NOT NULL AND send_value > 0) OR
    (send_timing = 'specific_datetime' AND send_datetime IS NOT NULL)
  )
);

-- Email campaign recipients tracking
CREATE TABLE IF NOT EXISTS reminder_email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES reminder_email_campaigns(id) ON DELETE CASCADE,

  -- Recipient information
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  email VARCHAR(320) NOT NULL,
  customer_name VARCHAR(255),

  -- Delivery tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed', 'unsubscribed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Email service tracking
  email_service_id VARCHAR(255), -- External email service message ID
  bounce_reason TEXT,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint to prevent duplicate sends
  UNIQUE(campaign_id, order_id)
);

-- Campaign automation jobs table for scheduling
CREATE TABLE IF NOT EXISTS reminder_email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES reminder_email_campaigns(id) ON DELETE CASCADE,

  -- Job configuration
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed', 'cancelled')),

  -- Execution tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  recipients_processed INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for job processing
  UNIQUE(campaign_id, scheduled_for)
);

-- Email campaign analytics aggregated data
CREATE TABLE IF NOT EXISTS reminder_email_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES reminder_email_campaigns(id) ON DELETE CASCADE,

  -- Daily analytics snapshot
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  bounces INTEGER DEFAULT 0,
  unsubscribes INTEGER DEFAULT 0,

  -- Rates (calculated fields)
  delivery_rate DECIMAL(5,2) DEFAULT 0, -- delivered/sent
  open_rate DECIMAL(5,2) DEFAULT 0, -- opened/delivered
  click_rate DECIMAL(5,2) DEFAULT 0, -- clicked/delivered
  bounce_rate DECIMAL(5,2) DEFAULT 0, -- bounced/sent

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, date)
);

-- Indexes for performance
CREATE INDEX idx_reminder_campaigns_org_event ON reminder_email_campaigns(organization_id, event_id);
CREATE INDEX idx_reminder_campaigns_status ON reminder_email_campaigns(status);
CREATE INDEX idx_reminder_campaigns_send_datetime ON reminder_email_campaigns(send_datetime) WHERE status IN ('scheduled', 'sending');

CREATE INDEX idx_reminder_recipients_campaign ON reminder_email_recipients(campaign_id);
CREATE INDEX idx_reminder_recipients_order ON reminder_email_recipients(order_id);
CREATE INDEX idx_reminder_recipients_status ON reminder_email_recipients(status);
CREATE INDEX idx_reminder_recipients_email ON reminder_email_recipients(email);

CREATE INDEX idx_reminder_jobs_scheduled ON reminder_email_jobs(scheduled_for, status);
CREATE INDEX idx_reminder_jobs_status ON reminder_email_jobs(status);

-- RLS (Row Level Security) policies
ALTER TABLE reminder_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_email_analytics ENABLE ROW LEVEL SECURITY;

-- Organizations can manage their own campaigns
CREATE POLICY "Organizations can manage reminder campaigns" ON reminder_email_campaigns
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can view reminder recipients" ON reminder_email_recipients
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM reminder_email_campaigns
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organizations can view reminder jobs" ON reminder_email_jobs
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM reminder_email_campaigns
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organizations can view reminder analytics" ON reminder_email_analytics
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM reminder_email_campaigns
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Functions for automatic calculations
CREATE OR REPLACE FUNCTION calculate_reminder_send_datetime()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.send_timing IN ('days_before', 'hours_before') THEN
    -- Get event datetime from events table
    SELECT
      CASE
        WHEN NEW.send_timing = 'days_before' THEN
          events.event_date - (NEW.send_value || ' days')::INTERVAL
        WHEN NEW.send_timing = 'hours_before' THEN
          events.event_date - (NEW.send_value || ' hours')::INTERVAL
      END
    INTO NEW.send_datetime
    FROM events
    WHERE events.id = NEW.event_id;
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_reminder_send_datetime
  BEFORE INSERT OR UPDATE ON reminder_email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION calculate_reminder_send_datetime();

-- Function to update analytics rates
CREATE OR REPLACE FUNCTION update_reminder_analytics_rates()
RETURNS TRIGGER AS $$
BEGIN
  NEW.delivery_rate = CASE WHEN NEW.emails_sent > 0 THEN (NEW.emails_delivered * 100.0 / NEW.emails_sent) ELSE 0 END;
  NEW.open_rate = CASE WHEN NEW.emails_delivered > 0 THEN (NEW.emails_opened * 100.0 / NEW.emails_delivered) ELSE 0 END;
  NEW.click_rate = CASE WHEN NEW.emails_delivered > 0 THEN (NEW.emails_clicked * 100.0 / NEW.emails_delivered) ELSE 0 END;
  NEW.bounce_rate = CASE WHEN NEW.emails_sent > 0 THEN (NEW.bounces * 100.0 / NEW.emails_sent) ELSE 0 END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reminder_analytics_rates
  BEFORE INSERT OR UPDATE ON reminder_email_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_analytics_rates();