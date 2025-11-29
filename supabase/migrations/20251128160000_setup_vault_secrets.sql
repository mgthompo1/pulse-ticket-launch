-- Setup vault secrets for abandoned cart recovery cron
-- These secrets allow pg_cron to call edge functions

-- First, ensure vault extension is enabled
CREATE EXTENSION IF NOT EXISTS vault;

-- Add supabase_url secret
SELECT vault.create_secret(
  'https://yoxsewbpoqxscsutqlcb.supabase.co',
  'supabase_url',
  'Supabase project URL for pg_cron edge function calls'
);

-- Add service role key secret
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQzNTg0OCwiZXhwIjoyMDY4MDExODQ4fQ.32zZKKaC-lI5TTVhTVnrSnyraUw6An7kRVP1_flL_i8',
  'supabase_service_role_key',
  'Service role key for pg_cron edge function authentication'
);
