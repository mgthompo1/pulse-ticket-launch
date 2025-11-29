-- Abandoned Cart Recovery - Event-Driven Email Processing
-- Emails are scheduled based on the exact time each cart was abandoned + configured delay

-- Enable pg_net for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add column to track when next email should be sent (calculated from created_at + delay)
ALTER TABLE abandoned_carts ADD COLUMN IF NOT EXISTS next_email_at TIMESTAMPTZ;

-- Function to calculate next_email_at based on event's delay setting
CREATE OR REPLACE FUNCTION calculate_next_email_at(
  p_cart_created_at TIMESTAMPTZ,
  p_emails_sent INT,
  p_last_email_sent_at TIMESTAMPTZ,
  p_delay_minutes INT
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  IF p_emails_sent = 0 THEN
    -- First email: created_at + delay_minutes
    RETURN p_cart_created_at + (COALESCE(p_delay_minutes, 60) * INTERVAL '1 minute');
  ELSIF p_emails_sent = 1 THEN
    -- Second email: 24 hours after first
    RETURN p_last_email_sent_at + INTERVAL '24 hours';
  ELSIF p_emails_sent = 2 THEN
    -- Third email: 48 hours after second
    RETURN p_last_email_sent_at + INTERVAL '48 hours';
  ELSE
    RETURN NULL; -- No more emails
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function: when cart is created/updated, calculate and set next_email_at
CREATE OR REPLACE FUNCTION update_abandoned_cart_schedule()
RETURNS TRIGGER AS $$
DECLARE
  v_delay_minutes INT;
  v_enabled BOOLEAN;
BEGIN
  -- Get event settings
  SELECT abandoned_cart_enabled, COALESCE(abandoned_cart_delay_minutes, 60)
  INTO v_enabled, v_delay_minutes
  FROM events WHERE id = NEW.event_id;

  -- Only schedule if enabled
  IF v_enabled THEN
    NEW.next_email_at := calculate_next_email_at(
      NEW.created_at,
      NEW.emails_sent,
      NEW.last_email_sent_at,
      v_delay_minutes
    );
  ELSE
    NEW.next_email_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_abandoned_cart_schedule ON abandoned_carts;
CREATE TRIGGER trigger_update_abandoned_cart_schedule
  BEFORE INSERT OR UPDATE ON abandoned_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_abandoned_cart_schedule();

-- Function to process carts that are ready for email (called by cron)
-- This is lightweight: only processes carts where next_email_at has passed
CREATE OR REPLACE FUNCTION process_ready_abandoned_carts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_cart RECORD;
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

  -- Find carts ready for email (next_email_at has passed)
  -- Uses the index, very efficient
  FOR v_cart IN
    SELECT ac.id
    FROM abandoned_carts ac
    JOIN events e ON ac.event_id = e.id
    WHERE ac.next_email_at <= NOW()
      AND ac.status IN ('pending', 'email_sent')
      AND ac.emails_sent < 3
      AND ac.expires_at > NOW()
      AND e.abandoned_cart_enabled = true
    LIMIT 10  -- Process max 10 at a time to avoid timeout
  LOOP
    -- Call edge function for each ready cart
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-abandoned-cart-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object('cart_id', v_cart.id)
    );
  END LOOP;
END;
$$;

-- Enable pg_cron extension (available on Supabase Pro)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule to run every minute - but only processes carts whose delay has passed
-- This respects your configured delay_minutes setting exactly
SELECT cron.schedule(
  'process-abandoned-cart-emails',
  '* * * * *',  -- Every minute
  $$SELECT process_ready_abandoned_carts()$$
);

COMMENT ON FUNCTION process_ready_abandoned_carts IS 'Processes abandoned carts that are ready for recovery emails based on configured delay';

-- Index for efficient querying of carts ready for email
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_next_email
ON abandoned_carts(next_email_at)
WHERE status IN ('pending', 'email_sent') AND emails_sent < 3;

-- Helper view to see cart status and timing
CREATE OR REPLACE VIEW abandoned_carts_status AS
SELECT
  ac.id,
  ac.customer_email,
  ac.customer_name,
  ac.cart_total,
  ac.status,
  ac.emails_sent,
  ac.created_at,
  ac.next_email_at,
  e.name as event_name,
  e.abandoned_cart_delay_minutes as delay_minutes,
  CASE
    WHEN ac.next_email_at IS NULL THEN 'complete'
    WHEN ac.next_email_at <= NOW() THEN 'ready'
    ELSE 'scheduled'
  END as email_status,
  CASE
    WHEN ac.next_email_at > NOW() THEN
      EXTRACT(EPOCH FROM (ac.next_email_at - NOW())) / 60
    ELSE 0
  END as minutes_until_email
FROM abandoned_carts ac
JOIN events e ON ac.event_id = e.id
WHERE e.abandoned_cart_enabled = true
ORDER BY ac.created_at DESC;

COMMENT ON VIEW abandoned_carts_status IS 'Shows abandoned carts with their email scheduling status';
COMMENT ON COLUMN abandoned_carts.next_email_at IS 'Timestamp when next recovery email should be sent (auto-calculated from delay settings)';
