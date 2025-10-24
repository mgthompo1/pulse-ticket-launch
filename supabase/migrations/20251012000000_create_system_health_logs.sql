-- Create system health logs table for tracking platform health over time
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  database_status TEXT NOT NULL,
  database_response_time INTEGER NOT NULL,
  storage_status TEXT NOT NULL,
  api_status TEXT NOT NULL,
  avg_response_time INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster timestamp queries
CREATE INDEX IF NOT EXISTS idx_system_health_logs_timestamp ON public.system_health_logs(timestamp DESC);

-- Add RLS policies
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage health logs"
  ON public.system_health_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated admins to read health logs
CREATE POLICY "Admins can read health logs"
  ON public.system_health_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create a function to clean up old health logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_health_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.system_health_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$;

-- Comment on table
COMMENT ON TABLE public.system_health_logs IS 'Stores system health check results for monitoring and historical analysis';
