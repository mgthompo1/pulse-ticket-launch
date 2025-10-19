-- Create error_logs table for centralized error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB,
  severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  function_name VARCHAR(100),
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_function ON error_logs(function_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(resolved) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id) WHERE user_id IS NOT NULL;

-- Add RLS policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert errors
CREATE POLICY "Service role can insert errors" ON error_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to view errors for their organization
CREATE POLICY "Authenticated users can view errors" ON error_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to mark errors as resolved
CREATE POLICY "Authenticated users can update errors" ON error_logs
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Comment on table
COMMENT ON TABLE error_logs IS 'Centralized error logging for application-wide error tracking and monitoring';
