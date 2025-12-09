-- Auto Group Invoice Processing Cron Job
-- Runs daily to check organizations with auto-invoicing enabled and generates invoices based on their configured frequency

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to call the edge function for processing auto invoices
CREATE OR REPLACE FUNCTION process_auto_group_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Get Supabase URL and service key from vault
  BEGIN
    SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'supabase_url';
    SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not read vault secrets: %', SQLERRM;
    RETURN;
  END;

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'Vault secrets not configured. Set supabase_url and supabase_service_role_key in vault.';
    RETURN;
  END IF;

  -- Call the edge function to process auto invoices
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/process-auto-group-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule to run daily at 6 AM UTC
-- The edge function checks each organization's frequency and only processes those due
SELECT cron.schedule(
  'process-auto-group-invoices',
  '0 6 * * *',  -- Every day at 6:00 AM UTC
  $$SELECT process_auto_group_invoices()$$
);

COMMENT ON FUNCTION process_auto_group_invoices IS 'Triggers the auto group invoice processing edge function daily';
