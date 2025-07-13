-- Add Stripe Connect columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;