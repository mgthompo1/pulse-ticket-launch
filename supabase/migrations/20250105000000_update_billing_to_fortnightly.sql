-- Update billing cycle to fortnightly (14 days) instead of monthly (30 days)

-- First ensure the billing_interval_days column exists (in case previous migrations weren't applied)
ALTER TABLE public.billing_customers
ADD COLUMN IF NOT EXISTS billing_interval_days INTEGER NOT NULL DEFAULT 30;

-- Add other billing schedule fields if they don't exist
ALTER TABLE public.billing_customers
ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMPTZ;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_billing_customers_next_billing
  ON public.billing_customers(next_billing_at)
  WHERE next_billing_at IS NOT NULL;

-- Now change the default billing interval to 14 days (fortnightly)
ALTER TABLE public.billing_customers 
ALTER COLUMN billing_interval_days SET DEFAULT 14;

-- Update existing customers to fortnightly billing (optional - only if you want to apply to existing customers)
-- Uncomment the line below if you want to update existing customers:
-- UPDATE public.billing_customers SET billing_interval_days = 14 WHERE billing_interval_days = 30;

-- Update the scheduled function comment to reflect fortnightly billing (rename for clarity)
-- The function can still handle any interval, but the name should reflect the new default
COMMENT ON FUNCTION publish_monthly_billing() IS 'Processes billing for customers based on their billing_interval_days (default: fortnightly/14 days)';
