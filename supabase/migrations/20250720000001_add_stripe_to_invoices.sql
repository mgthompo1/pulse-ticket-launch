-- Add stripe_session_id to invoices table for proper payment tracking
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_session ON public.invoices(stripe_session_id);

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.stripe_session_id IS 'Stripe checkout session ID for payment tracking'; 