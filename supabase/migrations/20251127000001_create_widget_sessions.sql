-- Widget Sessions: Track visitor funnel on ticket widget
-- This enables analytics on widget visitors who didn't complete purchase

CREATE TABLE IF NOT EXISTS widget_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,  -- Anonymous browser session identifier

  -- Funnel step timestamps (NULL = step not reached)
  widget_loaded_at TIMESTAMPTZ DEFAULT NOW(),
  ticket_selected_at TIMESTAMPTZ,
  checkout_started_at TIMESTAMPTZ,
  payment_initiated_at TIMESTAMPTZ,
  purchase_completed_at TIMESTAMPTZ,

  -- Cart context
  tickets_selected JSONB,  -- [{ticket_type_id, name, quantity, price}]
  cart_value DECIMAL(10,2),

  -- Attribution & source tracking
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Device/browser info
  device_type TEXT,  -- 'mobile', 'tablet', 'desktop'
  browser TEXT,

  -- IP & Geolocation
  ip_address TEXT,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  visitor_timezone TEXT,

  -- Session metrics
  exit_step TEXT,  -- Last funnel step reached before abandonment
  time_on_widget_seconds INTEGER,
  page_views INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_widget_sessions_event_id ON widget_sessions(event_id);
CREATE INDEX idx_widget_sessions_created_at ON widget_sessions(created_at);
CREATE INDEX idx_widget_sessions_session_id ON widget_sessions(session_id);
CREATE INDEX idx_widget_sessions_exit_step ON widget_sessions(exit_step);
CREATE INDEX idx_widget_sessions_country_code ON widget_sessions(country_code);

-- RLS Policies
ALTER TABLE widget_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for tracking)
CREATE POLICY "Allow anonymous widget session inserts"
  ON widget_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anonymous updates (for updating funnel progress)
CREATE POLICY "Allow anonymous widget session updates"
  ON widget_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow organization owners to read their event's sessions
CREATE POLICY "Organization owners can view widget sessions"
  ON widget_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organizations o ON e.organization_id = o.id
      WHERE e.id = widget_sessions.event_id
      AND o.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_widget_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER widget_sessions_updated_at
  BEFORE UPDATE ON widget_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_widget_session_updated_at();

-- Add comment for documentation
COMMENT ON TABLE widget_sessions IS 'Tracks anonymous visitor sessions on ticket widgets for funnel analytics';
