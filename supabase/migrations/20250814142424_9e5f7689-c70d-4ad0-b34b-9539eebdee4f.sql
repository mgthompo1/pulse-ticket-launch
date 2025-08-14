-- CRITICAL SECURITY FIX: Secure payment credentials in organizations table
-- This fixes the vulnerability where payment credentials are exposed

-- First, create a separate secure table for payment credentials
CREATE TABLE public.payment_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Stripe credentials
  stripe_account_id TEXT,
  stripe_secret_key TEXT,
  stripe_publishable_key TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  
  -- Windcave credentials  
  windcave_username TEXT,
  windcave_api_key TEXT,
  windcave_endpoint TEXT DEFAULT 'UAT',
  windcave_enabled BOOLEAN DEFAULT false,
  windcave_hit_username TEXT,
  windcave_hit_key TEXT,
  windcave_station_id TEXT,
  
  -- Other payment credentials
  apple_pay_merchant_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one record per organization
  UNIQUE(organization_id)
);

-- Enable RLS on payment credentials table
ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;

-- Create highly restrictive RLS policies for payment credentials
-- Only organization owners can access their payment credentials
CREATE POLICY "Organization owners can manage payment credentials"
ON public.payment_credentials
FOR ALL
USING (
  organization_id IN (
    SELECT id FROM public.organizations 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT id FROM public.organizations 
    WHERE user_id = auth.uid()
  )
);

-- Create secure functions to safely access payment credentials for system operations
CREATE OR REPLACE FUNCTION public.get_organization_payment_config(p_organization_id UUID)
RETURNS TABLE(
  payment_provider TEXT,
  stripe_publishable_key TEXT,
  windcave_enabled BOOLEAN,
  windcave_endpoint TEXT,
  apple_pay_merchant_id TEXT,
  currency TEXT,
  credit_card_processing_fee_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Return only non-sensitive payment configuration data
  RETURN QUERY
  SELECT 
    o.payment_provider,
    pc.stripe_publishable_key,
    pc.windcave_enabled,
    pc.windcave_endpoint,
    pc.apple_pay_merchant_id,
    o.currency,
    o.credit_card_processing_fee_percentage
  FROM public.organizations o
  LEFT JOIN public.payment_credentials pc ON o.id = pc.organization_id
  WHERE o.id = p_organization_id
    AND o.user_id = auth.uid(); -- Security check
END;
$$;

-- Function to securely get payment credentials for backend operations
CREATE OR REPLACE FUNCTION public.get_payment_credentials_for_processing(
  p_organization_id UUID,
  p_event_id UUID DEFAULT NULL
)
RETURNS TABLE(
  stripe_account_id TEXT,
  stripe_secret_key TEXT,
  windcave_username TEXT,
  windcave_api_key TEXT,
  windcave_endpoint TEXT,
  windcave_hit_username TEXT,
  windcave_hit_key TEXT,
  windcave_station_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- If event_id is provided, get organization_id from event
  IF p_event_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id
    FROM public.events
    WHERE id = p_event_id;
    
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Event not found';
    END IF;
  ELSE
    v_org_id := p_organization_id;
  END IF;
  
  -- Return sensitive credentials (only for backend use)
  RETURN QUERY
  SELECT 
    pc.stripe_account_id,
    pc.stripe_secret_key,
    pc.windcave_username,
    pc.windcave_api_key,
    pc.windcave_endpoint,
    pc.windcave_hit_username,
    pc.windcave_hit_key,
    pc.windcave_station_id
  FROM public.payment_credentials pc
  JOIN public.organizations o ON pc.organization_id = o.id
  WHERE o.id = v_org_id;
END;
$$;

-- Migrate existing payment data to secure table
INSERT INTO public.payment_credentials (
  organization_id,
  stripe_account_id,
  stripe_secret_key,
  stripe_publishable_key,
  stripe_onboarding_complete,
  windcave_username,
  windcave_api_key,
  windcave_endpoint,
  windcave_enabled,
  windcave_hit_username,
  windcave_hit_key,
  windcave_station_id,
  apple_pay_merchant_id
)
SELECT 
  id,
  stripe_account_id,
  stripe_secret_key,
  stripe_publishable_key,
  stripe_onboarding_complete,
  windcave_username,
  windcave_api_key,
  windcave_endpoint,
  windcave_enabled,
  windcave_hit_username,
  windcave_hit_key,
  windcave_station_id,
  apple_pay_merchant_id
FROM public.organizations
WHERE stripe_account_id IS NOT NULL 
   OR stripe_secret_key IS NOT NULL
   OR windcave_username IS NOT NULL
   OR windcave_api_key IS NOT NULL;

-- Remove sensitive payment columns from organizations table
ALTER TABLE public.organizations 
DROP COLUMN IF EXISTS stripe_account_id,
DROP COLUMN IF EXISTS stripe_secret_key,
DROP COLUMN IF EXISTS stripe_publishable_key,
DROP COLUMN IF EXISTS stripe_onboarding_complete,
DROP COLUMN IF EXISTS windcave_username,
DROP COLUMN IF EXISTS windcave_api_key,
DROP COLUMN IF EXISTS windcave_endpoint,
DROP COLUMN IF EXISTS windcave_enabled,
DROP COLUMN IF EXISTS windcave_hit_username,
DROP COLUMN IF EXISTS windcave_hit_key,
DROP COLUMN IF EXISTS windcave_station_id,
DROP COLUMN IF EXISTS apple_pay_merchant_id;

-- Add trigger to update payment credentials timestamp
CREATE OR REPLACE FUNCTION public.update_payment_credentials_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_payment_credentials_updated_at
  BEFORE UPDATE ON public.payment_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_credentials_updated_at();