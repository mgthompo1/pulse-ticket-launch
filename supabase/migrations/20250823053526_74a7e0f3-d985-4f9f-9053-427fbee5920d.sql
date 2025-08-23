-- Create function to check if current request is from an authenticated admin
CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if this request comes from an admin session
  -- We'll use a custom header or session context that the admin functions set
  RETURN current_setting('app.admin_authenticated', true)::boolean = true;
END;
$$;

-- Add admin access policies to organizations table
CREATE POLICY "Admins can view all organizations" 
ON public.organizations 
FOR SELECT 
USING (is_authenticated_admin());

CREATE POLICY "Admins can manage all organizations" 
ON public.organizations 
FOR ALL 
USING (is_authenticated_admin());

-- Add admin access policies to other tables that admins need to see
CREATE POLICY "Admins can view all events" 
ON public.events 
FOR SELECT 
USING (is_authenticated_admin());

CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (is_authenticated_admin());

CREATE POLICY "Admins can view all ticket_types" 
ON public.ticket_types 
FOR SELECT 
USING (is_authenticated_admin());

CREATE POLICY "Admins can view all usage_records" 
ON public.usage_records 
FOR SELECT 
USING (is_authenticated_admin());