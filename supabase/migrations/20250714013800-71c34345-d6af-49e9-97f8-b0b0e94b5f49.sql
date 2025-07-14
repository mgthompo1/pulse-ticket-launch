-- Enable pg_cron and pg_net extensions for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to generate monthly invoices on the 1st of each month at 9 AM UTC
SELECT cron.schedule(
  'generate-monthly-platform-invoices',
  '0 9 1 * *', -- At 9:00 AM on the 1st day of every month
  $$
  SELECT
    net.http_post(
        url:='https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/generate-monthly-invoices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k"}'::jsonb,
        body:=concat('{"scheduled_run": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);