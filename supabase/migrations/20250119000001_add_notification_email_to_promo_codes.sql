-- Add notification_email field to promo_codes table
-- This allows third-party emails (e.g., church pastors) to receive notifications when their promo code is used

ALTER TABLE public.promo_codes
ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.promo_codes.notification_email IS 'Email address to notify when this promo code is used (e.g., partner/referral contact)';

-- Create index for notification emails
CREATE INDEX IF NOT EXISTS idx_promo_codes_notification_email
ON public.promo_codes(notification_email)
WHERE notification_email IS NOT NULL;
