-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS update_billing_customers_updated_at ON billing_customers;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS public.update_billing_updated_at() CASCADE;

-- Create a security definer function to safely get organization data
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM organizations WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create a security definer function to check if user owns organization
CREATE OR REPLACE FUNCTION public.user_owns_organization(org_id uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = org_id AND user_id = user_uuid);
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can manage their organization's billing" ON billing_customers;

-- Create new safe policy for billing_customers
CREATE POLICY "Users can manage their organization billing" ON billing_customers
FOR ALL
USING (public.user_owns_organization(organization_id, auth.uid()))
WITH CHECK (public.user_owns_organization(organization_id, auth.uid()));

-- Recreate the update function safely
CREATE OR REPLACE FUNCTION public.update_billing_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_billing_customers_updated_at
BEFORE UPDATE ON public.billing_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_billing_updated_at();