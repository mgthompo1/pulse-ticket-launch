-- Fix abandoned cart cron: Add apikey header required by Supabase Edge Functions
-- The edge function was returning 401 because it needs both apikey and Authorization headers

-- Update the function to include apikey header
CREATE OR REPLACE FUNCTION process_ready_abandoned_carts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_anon_key TEXT;
  v_cart RECORD;
BEGIN
  -- Get Supabase URL and keys from vault
  BEGIN
    SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'supabase_url';
    SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';
    SELECT decrypted_secret INTO v_anon_key FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not read vault secrets: %', SQLERRM;
    RETURN;
  END;

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'Vault secrets not configured. Set supabase_url and supabase_service_role_key in vault.';
    RETURN;
  END IF;

  -- Use service key as apikey if anon key not set
  IF v_anon_key IS NULL THEN
    v_anon_key := v_service_key;
  END IF;

  -- Find carts ready for email (next_email_at has passed)
  FOR v_cart IN
    SELECT ac.id
    FROM abandoned_carts ac
    JOIN events e ON ac.event_id = e.id
    WHERE ac.next_email_at <= NOW()
      AND ac.status IN ('pending', 'email_sent')
      AND ac.emails_sent < 3
      AND ac.expires_at > NOW()
      AND e.abandoned_cart_enabled = true
    LIMIT 10
  LOOP
    -- Call edge function with both apikey and Authorization headers
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-abandoned-cart-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', v_anon_key,
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object('cart_id', v_cart.id)
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION process_ready_abandoned_carts IS 'Processes abandoned carts that are ready for recovery emails. Requires vault secrets: supabase_url, supabase_service_role_key, and optionally supabase_anon_key';
