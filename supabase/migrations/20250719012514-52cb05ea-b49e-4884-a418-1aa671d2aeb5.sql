-- Add Stripe publishable key to organizations table
ALTER TABLE public.organizations 
ADD COLUMN stripe_publishable_key text;