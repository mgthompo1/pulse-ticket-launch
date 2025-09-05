-- Add billing cycle columns to support fortnightly (14 days) billing

-- Add billing_interval_days column with default of 14 days (fortnightly)
ALTER TABLE public.billing_customers 
ADD COLUMN billing_interval_days INTEGER NOT NULL DEFAULT 14;

-- Add next_billing_at column to track next billing date
ALTER TABLE public.billing_customers 
ADD COLUMN next_billing_at TIMESTAMP WITH TIME ZONE;

-- Update existing customers to have a next billing date 14 days from now
UPDATE public.billing_customers 
SET next_billing_at = NOW() + INTERVAL '14 days'
WHERE next_billing_at IS NULL;

-- Update the scheduled function name to reflect fortnightly billing (rename for clarity)
-- The function can still handle any interval, but the name should reflect the new default
COMMENT ON FUNCTION publish_monthly_billing() IS 'Processes billing for customers based on their billing_interval_days (default: fortnightly/14 days)';