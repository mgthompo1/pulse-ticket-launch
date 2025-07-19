-- Add stripe_secret_key column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN stripe_secret_key TEXT;