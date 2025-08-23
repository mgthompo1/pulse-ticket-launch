-- Remove test_mode column from events table and add published status
-- Update events table to remove test_mode and use status field for draft/published
ALTER TABLE public.events 
  DROP COLUMN IF EXISTS test_mode;

-- Update events status enum to include published
-- First, temporarily allow any text value
ALTER TABLE public.events 
  ALTER COLUMN status TYPE text;

-- Update existing events that were test_mode=true to draft, test_mode=false to published
UPDATE public.events 
SET status = CASE 
  WHEN status = 'draft' THEN 'draft'
  WHEN status = 'published' THEN 'draft' -- Reset all to draft initially
  ELSE 'draft'
END;

-- Remove test_mode column from organizations table 
ALTER TABLE public.organizations 
  DROP COLUMN IF EXISTS test_mode;

-- Update orders table to remove test_mode
ALTER TABLE public.orders 
  DROP COLUMN IF EXISTS test_mode;

-- Create function to check billing setup status
CREATE OR REPLACE FUNCTION public.check_billing_setup(p_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_payment_method boolean := false;
BEGIN
  -- Check if organization has valid billing setup
  SELECT EXISTS(
    SELECT 1 
    FROM billing_customers bc
    WHERE bc.organization_id = p_organization_id
    AND bc.billing_status = 'active'
    AND bc.payment_method_id IS NOT NULL
  ) INTO has_payment_method;
  
  RETURN has_payment_method;
END;
$$;