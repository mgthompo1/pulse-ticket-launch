-- Add credit card processing fee percentage to organizations table
ALTER TABLE public.organizations 
ADD COLUMN credit_card_processing_fee_percentage NUMERIC(5,2) DEFAULT 0.00;

-- Add a comment to explain the column
COMMENT ON COLUMN public.organizations.credit_card_processing_fee_percentage IS 'Optional percentage fee added to ticket cost for credit card processing (e.g., 2.50 for 2.5%)';