-- Update billing cycle to fortnightly (14 days) instead of monthly (30 days)

-- Change the default billing interval to 14 days
ALTER TABLE public.billing_customers 
ALTER COLUMN billing_interval_days SET DEFAULT 14;

-- Update existing customers to fortnightly billing (optional - only if you want to apply to existing customers)
-- Uncomment the line below if you want to update existing customers:
-- UPDATE public.billing_customers SET billing_interval_days = 14 WHERE billing_interval_days = 30;

-- Update the scheduled function name to reflect fortnightly billing (rename for clarity)
-- The function can still handle any interval, but the name should reflect the new default
COMMENT ON FUNCTION publish_monthly_billing() IS 'Processes billing for customers based on their billing_interval_days (default: fortnightly/14 days)';