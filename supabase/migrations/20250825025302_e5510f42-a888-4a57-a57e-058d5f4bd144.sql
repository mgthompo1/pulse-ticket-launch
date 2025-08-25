-- Fix the function search path security warnings by setting explicit search_path
-- Update the user_is_org_member function
CREATE OR REPLACE FUNCTION public.user_is_org_member(p_user_id uuid, p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Check if user is organization owner
  SELECT EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = p_organization_id AND user_id = p_user_id
  )
  OR
  -- Check if user is a member (avoiding recursion by using direct table access)
  EXISTS (
    SELECT 1 FROM public.organization_users 
    WHERE organization_id = p_organization_id AND user_id = p_user_id
  );
$$;

-- Update other functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.organizations WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_owns_organization(org_id uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = org_id AND user_id = user_uuid);
$$;