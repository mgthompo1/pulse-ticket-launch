-- Add billing schedule fields for automatic monthly billing

ALTER TABLE public.billing_customers
ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_interval_days INTEGER NOT NULL DEFAULT 30;

-- Helpful index for scheduler
CREATE INDEX IF NOT EXISTS idx_billing_customers_next_billing
  ON public.billing_customers(next_billing_at)
  WHERE next_billing_at IS NOT NULL;


