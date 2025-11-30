-- Add deployment email alert settings to platform_config table
ALTER TABLE public.platform_config
ADD COLUMN IF NOT EXISTS deployment_email_alerts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deployment_alert_emails TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.platform_config.deployment_email_alerts_enabled IS 'Whether to send email alerts for code deployments';
COMMENT ON COLUMN public.platform_config.deployment_alert_emails IS 'Array of email addresses to receive deployment alerts';
