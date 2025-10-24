-- Create trigger function to send promo code notification emails
CREATE OR REPLACE FUNCTION public.send_promo_code_notification_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_notification_email TEXT;
BEGIN
  -- Get the notification email for this promo code
  SELECT notification_email INTO v_notification_email
  FROM public.promo_codes
  WHERE id = NEW.promo_code_id;

  -- Only proceed if notification email is set
  IF v_notification_email IS NOT NULL AND v_notification_email != '' THEN
    -- Get Supabase URL from environment
    v_supabase_url := current_setting('app.settings', true)::json->>'supabase_url';

    IF v_supabase_url IS NULL THEN
      v_supabase_url := 'https://yoxsewbpoqxscsutqlcb.supabase.co';
    END IF;

    -- Call the edge function asynchronously using pg_net
    -- This will not block the transaction
    BEGIN
      PERFORM
        net.http_post(
          url := v_supabase_url || '/functions/v1/send-promo-code-notification',
          headers := jsonb_build_object(
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object(
            'promoCodeId', NEW.promo_code_id,
            'orderId', NEW.order_id
          )
        );
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the transaction
      RAISE WARNING 'Failed to trigger promo code notification email: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on promo_code_usage table
DROP TRIGGER IF EXISTS trigger_send_promo_code_notification ON public.promo_code_usage;

CREATE TRIGGER trigger_send_promo_code_notification
  AFTER INSERT ON public.promo_code_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.send_promo_code_notification_trigger();

-- Add comment
COMMENT ON FUNCTION public.send_promo_code_notification_trigger IS 'Sends notification email when a promo code is used';
COMMENT ON TRIGGER trigger_send_promo_code_notification ON public.promo_code_usage IS 'Automatically sends notification email when promo code is used';
