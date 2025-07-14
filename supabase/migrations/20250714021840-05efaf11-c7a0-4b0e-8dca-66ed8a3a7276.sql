-- Add Apple Pay merchant ID field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN apple_pay_merchant_id text;