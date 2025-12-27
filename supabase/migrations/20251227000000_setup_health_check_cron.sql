-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule health check every 5 minutes
SELECT cron.schedule(
  'health-check-heartbeat',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/system-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k'
    ),
    body := '{}'::jsonb
  );
  $$
);
