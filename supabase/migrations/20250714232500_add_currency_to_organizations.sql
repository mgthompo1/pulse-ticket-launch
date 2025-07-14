
-- Add currency field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN currency text DEFAULT 'NZD';

-- Add a check constraint to ensure valid currency codes
ALTER TABLE public.organizations 
ADD CONSTRAINT valid_currency CHECK (currency IN ('NZD', 'AUD', 'USD', 'GBP', 'EUR', 'CAD'));
